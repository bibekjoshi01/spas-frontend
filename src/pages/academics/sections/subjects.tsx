import { useState } from "react"
import { Pencil, Plus, Trash2, Upload } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { ImportDialog } from "@/components/import-dialog"
import { ActiveField, Field, FormDialog } from "@/components/form-dialog"
import { ResourceList, RowActions } from "@/components/resource-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  ACTIVE_ONLY,
  ALL,
  type Subject,
  fieldErrorsFrom,
  formErrorFrom,
  semesterLabel,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useGetProgramsQuery,
  useImportSubjectsMutation,
  useGetSubjectsQuery,
  useUpdateSubjectMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

export function SubjectsSection() {
  const programs = useGetProgramsQuery(ALL)
  const [importSubjects] = useImportSubjectsMutation()
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    program: "all",
    semester: "all",
    is_active: "all",
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
  const [isImporting, setIsImporting] = useState(false)
  const [importProgram, setImportProgram] = useState("")
  const [editing, setEditing] = useState<Subject | null>(null)
  const [archiving, setArchiving] = useState<Subject | null>(null)
  const [
    archive,
    { isLoading: isArchiving, error: archiveError, reset: resetArchive },
  ] = useDeleteSubjectMutation()

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

            <Select
              value={filters.is_active === "all" ? "" : filters.is_active}
              onValueChange={(value) => setFilters({ is_active: value })}
            >
              <SelectTrigger
                className="w-32"
                aria-label="Filter by status"
                clearable={filters.is_active !== "all"}
                onClear={() => setFilters({ is_active: "all" })}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        clearFilters={{
          visible:
            filters.program !== "all" ||
            filters.semester !== "all" ||
            filters.is_active !== "all",
          onClear: () =>
            setFilters({ program: "all", semester: "all", is_active: "all" }),
        }}
        action={
          canAdd ? (
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsImporting(true)}
                >
                  <Upload className="size-4" aria-hidden />
                  Import
                </Button>
              )}
              <Button size="sm" onClick={() => setIsCreating(true)}>
                <Plus className="size-4" aria-hidden />
                New subject
              </Button>
            </div>
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
            header: "Status",
            className: "w-24",
            cell: (row) => (
              <Badge variant={row.isActive ? "secondary" : "outline"}>
                {row.isActive ? "Active" : "Inactive"}
              </Badge>
            ),
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

      <ImportDialog
        key={importProgram}
        open={isImporting}
        onOpenChange={setIsImporting}
        title="Import subjects"
        description="Bring a program's whole curriculum in from one sheet. Nothing is written until you have seen what it would do."
        templatePath="academics-mod/subjects/import"
        templateFilename="subject-import-template.csv"
        noun={{ one: "subject", many: "subjects" }}
        ready={Boolean(importProgram)}
        preface={
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Import into</p>
            <Select value={importProgram} onValueChange={setImportProgram}>
              <SelectTrigger
                className="w-full"
                aria-label="Program to import into"
              >
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
            <p className="text-xs text-muted-foreground">
              A code already in the same semester is updated, not duplicated.
            </p>
          </div>
        }
        onPreview={(file) =>
          importSubjects({
            file,
            program: Number(importProgram),
            commit: false,
          }).unwrap()
        }
        onCommit={(file) =>
          importSubjects({
            file,
            program: Number(importProgram),
            commit: true,
          }).unwrap()
        }
      />
      {editing && (
        <SubjectForm subject={editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiving(null)
            resetArchive()
          }
        }}
        title={`Archive ${archiving?.code}?`}
        description="It leaves the curriculum and frees its code for reuse. Only a subject no class is teaching can be archived — deactivate it instead to keep it off new allocations."
        error={archiveError}
        isPending={isArchiving}
        onConfirm={async () => {
          if (!archiving) return
          try {
            await archive(archiving.id).unwrap()
            notifier.success("Subject archived.")
            setArchiving(null)
          } catch {
            /* the dialog shows the refusal */
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
  // The picker only shows when creating, so it never has to carry a retired
  // program forward the way the program form does for its department.
  const programs = useGetProgramsQuery(ACTIVE_ONLY)
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
  const [isActive, setIsActive] = useState(subject?.isActive ?? true)
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
        await update({ id: subject.id, body: { ...body, isActive } }).unwrap()
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
        <Field
          label="Program"
          error={errors.program}
          hint="Only active programs are listed."
        >
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

      <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
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
          <Checkbox
            checked={form.isElective}
            onCheckedChange={(checked) =>
              setForm({ ...form, isElective: checked === true })
            }
          />
          Elective
        </label>
      </div>

      {subject && (
        <ActiveField
          checked={isActive}
          onChange={setIsActive}
          noun="subject"
          error={errors.isActive}
        />
      )}
    </FormDialog>
  )
}
