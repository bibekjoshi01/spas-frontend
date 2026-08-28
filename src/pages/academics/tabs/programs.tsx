import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Field, FormDialog } from "@/components/form-dialog"
import { ResourceList, RowActions } from "@/components/resource-list"
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
  type Program,
  fieldErrorsFrom,
  formErrorFrom,
  useCreateProgramMutation,
  useDeleteProgramMutation,
  useGetDepartmentsQuery,
  useGetProgramsQuery,
  useGetAuthorityCandidatesQuery,
  useUpdateProgramMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

export function ProgramsTab() {
  const departments = useGetDepartmentsQuery(ALL)
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    department: "all",
  })
  const onlyDepartment =
    departments.data?.results.length === 1
      ? String(departments.data.results[0].id)
      : null
  const effectiveDepartment =
    filters.department === "all" && onlyDepartment
      ? onlyDepartment
      : filters.department
  const { data, isLoading, isFetching, error, refetch } = useGetProgramsQuery({
    ...params,
    ...(effectiveDepartment === "all"
      ? {}
      : { department: effectiveDepartment }),
  })

  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [archiving, setArchiving] = useState<Program | null>(null)
  const [archive, { isLoading: isArchiving }] = useDeleteProgramMutation()

  const canAdd = useHasPermission("add_program")
  const canEdit = useHasPermission("edit_program")
  const canDelete = useHasPermission("delete_program")

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
          placeholder: "Search programs",
        }}
        filters={
          departments.data && departments.data.results.length > 1 ? (
            <Select
              value={filters.department}
              onValueChange={(value) => setFilters({ department: value })}
            >
              <SelectTrigger
                className="w-72 max-w-full"
                aria-label="Filter by department"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.data?.results.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
        clearFilters={{
          visible: filters.department !== "all",
          onClear: () => setFilters({ department: "all" }),
        }}
        action={
          canAdd ? (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" aria-hidden />
              New program
            </Button>
          ) : null
        }
        emptyTitle="No programs yet"
        emptyMessage="A program belongs to a department and runs for a number of semesters."
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
            cell: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            header: "Department",
            className: "text-muted-foreground",
            cell: (row) => row.department.code,
          },
          {
            header: "Semesters",
            className: "w-24 text-right tabular-nums",
            cell: (row) => row.totalSemesters,
          },
          {
            header: "Coordinator",
            className: "text-muted-foreground",
            cell: (row) => row.coordinator?.fullName ?? "—",
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

      {isCreating && <ProgramForm onClose={() => setIsCreating(false)} />}
      {editing && (
        <ProgramForm program={editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.name}?`}
        description="It leaves every listing. Batches and subjects already under it are unaffected."
        isPending={isArchiving}
        onConfirm={async () => {
          if (!archiving) return
          try {
            await archive(archiving.id).unwrap()
            notifier.success("Program archived.")
            setArchiving(null)
          } catch {
            notifier.error("Could not archive that program.")
          }
        }}
      />
    </>
  )
}

function ProgramForm({
  program,
  onClose,
}: {
  program?: Program
  onClose: () => void
}) {
  const departments = useGetDepartmentsQuery(ALL)
  const coordinators = useGetAuthorityCandidatesQuery()
  const [create, createState] = useCreateProgramMutation()
  const [update, updateState] = useUpdateProgramMutation()

  const [form, setForm] = useState({
    department: program ? String(program.department.id) : "",
    name: program?.name ?? "",
    code: program?.code ?? "",
    totalSemesters: String(program?.totalSemesters ?? 8),
    coordinator: program?.coordinator ? String(program.coordinator.id) : "",
  })
  const onlyDepartment =
    departments.data?.results.length === 1
      ? String(departments.data.results[0].id)
      : null

  const effectiveDepartment = form.department || onlyDepartment || ""

  const state = program ? updateState : createState
  const errors = fieldErrorsFrom(state.error)

  const submit = async () => {
    const body = {
      department: Number(effectiveDepartment),
      name: form.name.trim(),
      code: form.code.trim(),
      totalSemesters: Number(form.totalSemesters),
      coordinator: form.coordinator ? Number(form.coordinator) : null,
    }

    try {
      if (program) {
        await update({ id: program.id, body }).unwrap()
        notifier.success("Program updated.")
      } else {
        await create(body).unwrap()
        notifier.success("Program created.")
      }
      onClose()
    } catch {
      /* the form shows the error */
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={program ? "Edit Program" : "New Program"}
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean(
        effectiveDepartment && form.name.trim() && form.code.trim()
      )}
      submitLabel={program ? "Save changes" : "Create"}
      onSubmit={submit}
    >
      {departments.data && departments.data.results.length > 1 ? (
        <Field label="Department" error={errors.department}>
          <Select
            value={form.department}
            onValueChange={(value) => setForm({ ...form, department: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a department" />
            </SelectTrigger>
            <SelectContent>
              {departments.data?.results.map((row) => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      <Field label="Name" htmlFor="program-name" error={errors.name}>
        <Input
          id="program-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="B.Sc. Computer Science and Information Technology"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Code" htmlFor="program-code" error={errors.code}>
          <Input
            id="program-code"
            value={form.code}
            onChange={(event) =>
              setForm({ ...form, code: event.target.value.toUpperCase() })
            }
            placeholder="BSCCSIT"
          />
        </Field>

        <Field
          label="Semesters"
          htmlFor="program-sem"
          error={errors.totalSemesters}
          hint="1 to 8"
        >
          <Input
            id="program-sem"
            type="number"
            min={1}
            max={8}
            value={form.totalSemesters}
            onChange={(event) =>
              setForm({ ...form, totalSemesters: event.target.value })
            }
          />
        </Field>
      </div>

      <Field
        label="Coordinator"
        error={errors.coordinator}
        hint="Assigning a coordinator grants program-scoped authority automatically."
      >
        <Select
          value={form.coordinator}
          onValueChange={(value) => setForm({ ...form, coordinator: value })}
        >
          <SelectTrigger
            clearable={Boolean(form.coordinator)}
            onClear={() => setForm({ ...form, coordinator: "" })}
          >
            <SelectValue placeholder="Nobody yet" />
          </SelectTrigger>
          <SelectContent>
            {coordinators.data?.results.map((row) => (
              <SelectItem key={row.id} value={String(row.id)}>
                {row.fullName || row.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormDialog>
  )
}
