import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Field, FormDialog } from "@/components/form-dialog"
import { ResourceList, RowActions } from "@/components/resource-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useHasPermission } from "@/hooks/use-has-permissions"
import { usePagedQuery } from "@/hooks/use-paged-query"
import {
  ALL,
  type Subject,
  fieldErrorsFrom,
  formErrorFrom,
  semesterLabel,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useGetProgramsQuery,
  useGetSubjectsQuery,
  useUpdateSubjectMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

export function SubjectsTab() {
  const programs = useGetProgramsQuery(ALL)
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    program: "all",
    semester: "all",
  })
  const onlyProgram =
    programs.data?.results.length === 1
      ? String(programs.data.results[0].id)
      : null
  const effectiveProgram =
    filters.program === "all" && onlyProgram ? onlyProgram : filters.program
  const { data, isLoading, isFetching, error, refetch } = useGetSubjectsQuery({
    ...params,
    ...(effectiveProgram === "all" ? {} : { program: effectiveProgram }),
  })

  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [archiving, setArchiving] = useState<Subject | null>(null)
  const [archive, { isLoading: isArchiving }] = useDeleteSubjectMutation()

  const canAdd = useHasPermission("add_subject")
  const canEdit = useHasPermission("edit_subject")
  const canDelete = useHasPermission("delete_subject")

  return (
    <>
      <ResourceList
        rows={data?.results}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        refetch={refetch}
        count={data?.count}
        offset={offset}
        onOffsetChange={setOffset}
        search={{
          value: filters.search,
          onChange: (value) => setFilters({ search: value }),
          placeholder: "Search by code or name",
        }}
        filters={
          <>
            {programs.data && programs.data.results.length > 1 && (
              <Select
                value={filters.program}
                onValueChange={(value) => setFilters({ program: value })}
              >
                <SelectTrigger className="w-44" aria-label="Filter by program">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programs</SelectItem>
                  {programs.data?.results.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={filters.semester}
              onValueChange={(value) => setFilters({ semester: value })}
            >
              <SelectTrigger className="w-40" aria-label="Filter by semester">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All semesters</SelectItem>
                {Array.from({ length: 8 }, (_, index) => index + 1).map(
                  (number) => (
                    <SelectItem key={number} value={String(number)}>
                      {semesterLabel(number)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </>
        }
        clearFilters={{
          visible: filters.program !== "all" || filters.semester !== "all",
          onClear: () => setFilters({ program: "all", semester: "all" }),
        }}
        action={
          canAdd ? (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" aria-hidden />
              New subject
            </Button>
          ) : null
        }
        emptyTitle="No subjects here"
        emptyMessage="A subject sits in one semester of one program's curriculum."
        columns={[
          {
            header: "#",
            className: "w-12 text-right tabular-nums text-muted-foreground",
            cell: (_row, rowIndex) => offset + rowIndex + 1,
          },
          {
            header: "Code",
            className: "w-28 font-mono text-xs",
            cell: (row) => row.code,
          },
          {
            header: "Name",
            cell: (row) => (
              <span className="font-medium">
                {row.name}
                {row.isElective && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Elective
                  </Badge>
                )}
              </span>
            ),
          },
          {
            header: "Program",
            className: "w-28 text-muted-foreground",
            cell: (row) => row.program.code,
          },
          {
            header: "Semester",
            className: "w-28 text-muted-foreground",
            cell: (row) => semesterLabel(row.semester),
          },
          {
            header: "Credits",
            className: "w-20 text-right tabular-nums",
            cell: (row) => row.creditHours,
          },
          {
            header: "",
            className: "w-24 text-right",
            cell: (row) => (
              <RowActions>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${row.name}`}
                    onClick={() => setEditing(row)}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Archive ${row.name}`}
                    onClick={() => setArchiving(row)}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden />
                  </Button>
                )}
              </RowActions>
            ),
          },
        ]}
      />

      {isCreating && <SubjectForm onClose={() => setIsCreating(false)} />}
      {editing && (
        <SubjectForm subject={editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.code}?`}
        description="It leaves the curriculum and frees its code for reuse. Classes already teaching it keep their records."
        isPending={isArchiving}
        onConfirm={async () => {
          if (!archiving) return
          try {
            await archive(archiving.id).unwrap()
            notifier.success("Subject archived.")
            setArchiving(null)
          } catch {
            notifier.error("Could not archive that subject.")
          }
        }}
      />
    </>
  )
}

function SubjectForm({
  subject,
  onClose,
}: {
  subject?: Subject
  onClose: () => void
}) {
  const programs = useGetProgramsQuery(ALL)
  const [create, createState] = useCreateSubjectMutation()
  const [update, updateState] = useUpdateSubjectMutation()

  const [form, setForm] = useState({
    program: subject ? String(subject.program.id) : "",
    semester: String(subject?.semester ?? 1),
    code: subject?.code ?? "",
    name: subject?.name ?? "",
    creditHours: String(subject?.creditHours ?? 3),
    isElective: subject?.isElective ?? false,
  })
  const onlyProgram =
    programs.data?.results.length === 1
      ? String(programs.data.results[0].id)
      : null

  const effectiveProgram = form.program || onlyProgram || ""

  const state = subject ? updateState : createState
  const errors = fieldErrorsFrom(state.error)

  const submit = async () => {
    const body = {
      semester: Number(form.semester),
      code: form.code.trim(),
      name: form.name.trim(),
      creditHours: Number(form.creditHours),
      isElective: form.isElective,
    }

    try {
      if (subject) {
        await update({ id: subject.id, body }).unwrap()
        notifier.success("Subject updated.")
      } else {
        await create({ ...body, program: Number(effectiveProgram) }).unwrap()
        notifier.success("Subject created.")
      }
      onClose()
    } catch {
      /* the form shows the error */
    }
  }

  return (
    <FormDialog
      open
      contentClassName="sm:max-w-2xl"
      onOpenChange={(next) => !next && onClose()}
      title={subject ? "Edit Subject" : "New Subject"}
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean(
        (subject || effectiveProgram) && form.code.trim() && form.name.trim()
      )}
      submitLabel={subject ? "Save changes" : "Create"}
      onSubmit={submit}
    >
      {!subject && programs.data && programs.data.results.length > 1 && (
        <Field label="Program" error={errors.program}>
          <Select
            value={form.program}
            onValueChange={(value) => setForm({ ...form, program: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a program" />
            </SelectTrigger>
            <SelectContent>
              {programs.data?.results.map((row) => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.code} — {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Code" htmlFor="subject-code" error={errors.code}>
          <Input
            id="subject-code"
            value={form.code}
            onChange={(event) =>
              setForm({ ...form, code: event.target.value.toUpperCase() })
            }
            placeholder="CSC201"
          />
        </Field>

        <Field label="Semester" error={errors.semester}>
          <Select
            value={form.semester}
            onValueChange={(value) => setForm({ ...form, semester: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 8 }, (_, index) => index + 1).map(
                (number) => (
                  <SelectItem key={number} value={String(number)}>
                    {semesterLabel(number)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Name" htmlFor="subject-name" error={errors.name}>
        <Input
          id="subject-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Data Structures and Algorithms"
        />
      </Field>

      <div className="grid grid-cols-2 items-end gap-3">
        <Field
          label="Credit hours"
          htmlFor="subject-credits"
          error={errors.creditHours}
        >
          <Input
            id="subject-credits"
            type="number"
            min={0}
            value={form.creditHours}
            onChange={(event) =>
              setForm({ ...form, creditHours: event.target.value })
            }
          />
        </Field>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={form.isElective}
            onChange={(event) =>
              setForm({ ...form, isElective: event.target.checked })
            }
          />
          Elective
        </label>
      </div>
    </FormDialog>
  )
}
