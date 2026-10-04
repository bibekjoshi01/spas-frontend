import { useState } from "react"
import { Pencil, Plus, Archive } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Field, FormDialog } from "@/components/form-dialog"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fieldErrorsFrom, formErrorFrom } from "@/lib/api"
import {
  type Institution,
  useGetInstitutionsQuery,
  useCreateInstitutionMutation,
  useUpdateInstitutionMutation,
  useArchiveInstitutionMutation,
} from "@/lib/api/internal-evaluation.api"
import { notifier } from "@/lib/utils/notifier"

export default function InstitutionSettings() {
  const query = useGetInstitutionsQuery()
  const institution = query.data?.results[0]
  const [editing, setEditing] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [archive, archiveState] = useArchiveInstitutionMutation()
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-3 md:p-4">
      <PageHeader
        title="Institution Details"
        actions={
          <Button
            disabled={query.isLoading || Boolean(query.error)}
            onClick={() => setEditing(true)}
          >
            {institution ? (
              <Pencil className="size-4" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            {institution ? "Edit details" : "Add institution"}
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        Configure the college headings printed on internal evaluation sheets.
        These details belong to this college.
      </p>
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
      >
        {institution ? (
          <section className="space-y-4 border bg-card p-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ["University", institution.universityName],
                ["Institute", institution.instituteName],
                ["College / campus", institution.name],
                ["Address", institution.address],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold break-words">
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiving(true)}
            >
              <Archive className="size-4" aria-hidden />
              Archive details
            </Button>
          </section>
        ) : (
          <p className="border bg-card p-6 text-sm text-muted-foreground">
            Add institution details before downloading internal evaluation
            sheets.
          </p>
        )}
      </QueryState>
      {editing && (
        <InstitutionForm
          institution={institution}
          onClose={() => setEditing(false)}
        />
      )}
      <ConfirmDialog
        open={archiving}
        onOpenChange={setArchiving}
        title="Archive institution details?"
        description="Sheet downloads will require new institution details. The previous details remain in the audit history."
        error={archiveState.error}
        isPending={archiveState.isLoading}
        onConfirm={async () => {
          if (!institution) return
          try {
            await archive(institution.id).unwrap()
            setArchiving(false)
            notifier.success("Institution details archived.")
          } catch {
            /* shown in dialog */
          }
        }}
      />
    </div>
  )
}
function InstitutionForm({
  institution,
  onClose,
}: {
  institution?: Institution
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: institution?.name ?? "",
    universityName: institution?.universityName ?? "",
    instituteName: institution?.instituteName ?? "",
    address: institution?.address ?? "",
  })
  const [create, createState] = useCreateInstitutionMutation()
  const [update, updateState] = useUpdateInstitutionMutation()
  const state = institution ? updateState : createState
  const errors = fieldErrorsFrom(state.error)
  async function save() {
    try {
      if (institution) await update({ id: institution.id, body: form }).unwrap()
      else await create(form).unwrap()
      notifier.success("Institution details saved.")
      onClose()
    } catch {
      /* shown in form */
    }
  }
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={
        institution ? "Edit institution details" : "Add institution details"
      }
      formError={formErrorFrom(state.error)}
      canSubmit={Boolean(form.name.trim() && form.universityName.trim())}
      isSubmitting={state.isLoading}
      onSubmit={() => void save()}
    >
      {(
        [
          ["universityName", "University", "Tribhuvan University"],
          ["instituteName", "Institute (optional)", "Institute of Engineering"],
          ["name", "College / campus", "Thapathali Campus"],
          ["address", "Address (optional)", "Thapathali, Kathmandu"],
        ] as const
      ).map(([key, label, placeholder]) => (
        <Field
          key={key}
          label={label}
          htmlFor={`institution-${key}`}
          error={errors[key]}
        >
          <Input
            id={`institution-${key}`}
            maxLength={key === "address" ? 250 : 150}
            value={form[key]}
            placeholder={placeholder}
            onChange={(event) =>
              setForm({ ...form, [key]: event.target.value })
            }
          />
        </Field>
      ))}
    </FormDialog>
  )
}
