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
  type Department,
  ALL,
  fieldErrorsFrom,
  formErrorFrom,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetDepartmentsQuery,
  useGetUsersQuery,
  useUpdateDepartmentMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

export function DepartmentsSection() {
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
  })
  const { data, isLoading, isFetching, error, refetch } =
    useGetDepartmentsQuery(params)

  const [editing, setEditing] = useState<Department | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [archiving, setArchiving] = useState<Department | null>(null)
  const [archive, { isLoading: isArchiving }] = useDeleteDepartmentMutation()

  const canAdd = useHasPermission("add_department")
  const canEdit = useHasPermission("edit_department")
  const canDelete = useHasPermission("delete_department")

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
          placeholder: "Search departments",
        }}
        action={
          canAdd ? (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" aria-hidden />
              New department
            </Button>
          ) : null
        }
        emptyTitle={
          filters.search ? "No departments match that" : "No departments yet"
        }
        emptyMessage={
          filters.search
            ? "Try a different name or code."
            : "A department owns programs and teachers — start here."
        }
        emptyAction={
          canAdd && !filters.search ? (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" aria-hidden />
              New department
            </Button>
          ) : null
        }
        columns={[
          {
            header: "#",
            className: "w-12 text-right tabular-nums text-muted-foreground",
            cell: (_row, rowIndex) => offset + rowIndex + 1,
          },
          {
            header: "Code",
            className: "w-24 font-mono text-xs",
            cell: (row) => row.code,
          },
          {
            header: "Name",
            cell: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            header: "HOD",
            cell: (row) => row.head?.fullName || row.head?.username || "—",
          },
          {
            header: "Programs",
            className: "w-28 text-right tabular-nums",
            cell: (row) => row.programCount,
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

      {isCreating && (
        <DepartmentForm open onClose={() => setIsCreating(false)} />
      )}
      {editing && (
        <DepartmentForm
          open
          department={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.name}?`}
        description="It leaves every listing and frees its name for reuse. Programs already under it are unaffected."
        isPending={isArchiving}
        onConfirm={async () => {
          if (!archiving) return
          try {
            await archive(archiving.id).unwrap()
            notifier.success("Department archived.")
            setArchiving(null)
          } catch {
            notifier.error("Could not archive that department.")
          }
        }}
      />
    </>
  )
}

function DepartmentForm({
  open,
  department,
  onClose,
}: {
  open: boolean
  department?: Department
  onClose: () => void
}) {
  const [create, createState] = useCreateDepartmentMutation()
  const [update, updateState] = useUpdateDepartmentMutation()
  const staff = useGetUsersQuery(ALL)

  const [name, setName] = useState(department?.name ?? "")
  const [code, setCode] = useState(department?.code ?? "")
  const [head, setHead] = useState(
    department?.head ? String(department.head.id) : ""
  )

  const state = department ? updateState : createState
  const errors = fieldErrorsFrom(state.error)

  const submit = async () => {
    try {
      if (department) {
        await update({
          id: department.id,
          body: { name, code, head: head ? Number(head) : null },
        }).unwrap()
        notifier.success("Department updated.")
      } else {
        await create({ name, code, head: head ? Number(head) : null }).unwrap()
        notifier.success("Department created.")
      }
      onClose()
    } catch {
      /* the form shows the error */
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={department ? "Edit Department" : "New Department"}
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean(name.trim() && code.trim())}
      submitLabel={department ? "Save changes" : "Create"}
      onSubmit={submit}
    >
      <Field label="Name" htmlFor="dept-name" error={errors.name}>
        <Input
          id="dept-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Computer Science and IT"
        />
      </Field>

      <Field
        label="Code"
        htmlFor="dept-code"
        error={errors.code}
        hint="Short identifier used in listings."
      >
        <Input
          id="dept-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="CSIT"
        />
      </Field>

      <Field
        label="Head of department"
        error={errors.head}
        hint="Assigning an HOD grants access only to this department and its programs."
      >
        <Select value={head} onValueChange={setHead}>
          <SelectTrigger clearable={Boolean(head)} onClear={() => setHead("")}>
            <SelectValue placeholder="Nobody yet" />
          </SelectTrigger>
          <SelectContent>
            {staff.data?.results.map((row) => (
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
