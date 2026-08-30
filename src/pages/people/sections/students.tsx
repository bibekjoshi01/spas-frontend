import { useState } from "react"
import { Eye, Pencil, Plus, Trash2, Upload } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { ImportDialog } from "@/components/import-dialog"
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
  type Student,
  fieldErrorsFrom,
  formErrorFrom,
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useGetBatchesQuery,
  useImportStudentsMutation,
  useGetStudentsQuery,
  useUpdateStudentMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

import { ManagementStudentReportDialog } from "../management-student-report-dialog"

const STATUS_LABEL: Record<Student["status"], string> = {
  STUDYING: "Studying",
  GRADUATED: "Graduated",
  DROPPED_OUT: "Dropped out",
  TRANSFERRED: "Transferred",
}

/** The student directory — everyone admitted, regardless of class. */
export function StudentsSection() {
  const batches = useGetBatchesQuery(ALL)
  const [importStudents] = useImportStudentsMutation()
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    batch: "all",
    status: "all",
  })
  const { data, isLoading, isFetching, error, refetch } =
    useGetStudentsQuery(params)

  const [isCreating, setIsCreating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importBatch, setImportBatch] = useState("")
  const [editing, setEditing] = useState<Student | null>(null)
  const [archiving, setArchiving] = useState<Student | null>(null)
  const [reporting, setReporting] = useState<Student | null>(null)
  const [archive, { isLoading: isArchiving }] = useDeleteStudentMutation()

  const canAdd = useHasPermission("add_student")
  const canEdit = useHasPermission("edit_student")
  const canDelete = useHasPermission("delete_student")

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
          placeholder: "Name, roll or registration number",
        }}
        filters={
          <>
            <Select
              value={filters.batch}
              onValueChange={(value) => setFilters({ batch: value })}
            >
              <SelectTrigger className="w-48" aria-label="Filter by batch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batches.data?.results.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.program.code} {row.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ status: value })}
            >
              <SelectTrigger className="w-40" aria-label="Filter by standing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any standing</SelectItem>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        clearFilters={{
          visible: filters.batch !== "all" || filters.status !== "all",
          onClear: () => setFilters({ batch: "all", status: "all" }),
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
                Admit a student
              </Button>
            </div>
          ) : null
        }
        emptyTitle={filters.search ? "Nobody matches that" : "No students yet"}
        emptyMessage={
          filters.search
            ? "Try a different name or number."
            : "Admit students into a batch to get started."
        }
        emptyAction={
          canAdd && !filters.search ? (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Admit a student
            </Button>
          ) : null
        }
        columns={[
          {
            header: "Roll",
            className: "w-20 font-mono text-xs tabular-nums",
            cell: (row) => row.rollNumber,
          },
          {
            header: "Name",
            cell: (row) => <span className="font-medium">{row.fullName}</span>,
          },
          {
            header: "Batch",
            className: "text-muted-foreground",
            cell: (row) => `${row.batch.program.code} ${row.batch.year}`,
          },
          {
            header: "Registration",
            className: "font-mono text-xs text-muted-foreground",
            cell: (row) => row.registrationNumber || "—",
          },
          {
            header: "Contact",
            className: "text-muted-foreground",
            cell: (row) => (
              <div className="space-y-0.5">
                <div>{row.email || "—"}</div>
                <div className="text-xs">Primary: {row.phoneNo || "—"}</div>
                {row.alternatePhoneNo && (
                  <div className="text-xs">Alt: {row.alternatePhoneNo}</div>
                )}
              </div>
            ),
          },
          {
            header: "Standing",
            className: "w-28",
            cell: (row) => (
              <Badge
                variant={row.status === "STUDYING" ? "secondary" : "outline"}
              >
                {STATUS_LABEL[row.status]}
              </Badge>
            ),
          },
          {
            header: "",
            className: "w-24 text-right",
            cell: (row) => (
              <RowActions>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`View performance report for ${row.fullName}`}
                  onClick={() => setReporting(row)}
                >
                  <Eye className="size-4" aria-hidden />
                </Button>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${row.fullName}`}
                    onClick={() => setEditing(row)}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Archive ${row.fullName}`}
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

      {isCreating && <StudentForm onClose={() => setIsCreating(false)} />}

      <ImportDialog
        key={importBatch}
        open={isImporting}
        onOpenChange={setIsImporting}
        title="Import students"
        description="Bring a batch in from the spreadsheet you already keep. Nothing is written until you have seen what it would do."
        templatePath="students-mod/students/import"
        templateFilename="student-import-template.csv"
        noun={{ one: "student", many: "students" }}
        ready={Boolean(importBatch)}
        preface={
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Import into</p>
            <Select value={importBatch} onValueChange={setImportBatch}>
              <SelectTrigger
                className="w-full"
                aria-label="Batch to import into"
              >
                <SelectValue placeholder="Choose a batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.data?.results.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.program.code} {row.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A roll number already in this batch is updated, not duplicated.
            </p>
          </div>
        }
        onPreview={(file) =>
          importStudents({
            file,
            batch: Number(importBatch),
            commit: false,
          }).unwrap()
        }
        onCommit={(file) =>
          importStudents({
            file,
            batch: Number(importBatch),
            commit: true,
          }).unwrap()
        }
      />
      {editing && (
        <StudentForm student={editing} onClose={() => setEditing(null)} />
      )}
      {reporting && (
        <ManagementStudentReportDialog
          studentId={reporting.id}
          onClose={() => setReporting(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.fullName}?`}
        description="They leave every listing and their roll number frees up. Their attendance and marks are kept."
        isPending={isArchiving}
        onConfirm={async () => {
          if (!archiving) return
          try {
            await archive(archiving.id).unwrap()
            notifier.success("Student archived.")
            setArchiving(null)
          } catch {
            notifier.error("Could not archive that student.")
          }
        }}
      />
    </>
  )
}

function StudentForm({
  student,
  onClose,
}: {
  student?: Student
  onClose: () => void
}) {
  const batches = useGetBatchesQuery(ALL)
  const [create, createState] = useCreateStudentMutation()
  const [update, updateState] = useUpdateStudentMutation()

  const [form, setForm] = useState({
    batch: student ? String(student.batch.id) : "",
    rollNumber: student?.rollNumber ?? "",
    registrationNumber: student?.registrationNumber ?? "",
    firstName: student?.fullName.split(" ")[0] ?? "",
    lastName: student?.fullName.split(" ").slice(1).join(" ") ?? "",
    email: student?.email ?? "",
    phoneNo: student?.phoneNo ?? "",
    alternatePhoneNo: student?.alternatePhoneNo ?? "",
    status: student?.status ?? "STUDYING",
  })

  const state = student ? updateState : createState
  const errors = fieldErrorsFrom(state.error)

  const submit = async () => {
    const body = {
      rollNumber: form.rollNumber.trim(),
      registrationNumber: form.registrationNumber.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNo: form.phoneNo.trim(),
      alternatePhoneNo: form.alternatePhoneNo.trim(),
    }

    try {
      if (student) {
        await update({
          id: student.id,
          body: { ...body, status: form.status },
        }).unwrap()
        notifier.success("Student updated.")
      } else {
        await create({ ...body, batch: Number(form.batch) }).unwrap()
        notifier.success("Student admitted.")
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
      title={student ? "Edit Student" : "Admit A Student"}
      description={
        student
          ? "Update the student's admission record."
          : "Creates the student record and a linked student identity. Login remains disabled until it is activated later."
      }
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean(
        (student || form.batch) &&
        form.rollNumber.trim() &&
        form.firstName.trim() &&
        form.lastName.trim()
      )}
      submitLabel={student ? "Save changes" : "Admit"}
      onSubmit={submit}
    >
      {!student && (
        <Field
          label="Batch"
          error={errors.batch}
          hint="Program and department follow from the batch."
        >
          <Select
            value={form.batch}
            onValueChange={(value) => setForm({ ...form, batch: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.data?.results.map((row) => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.program.code} {row.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          htmlFor="student-first"
          error={errors.firstName}
        >
          <Input
            id="student-first"
            value={form.firstName}
            onChange={(event) =>
              setForm({ ...form, firstName: event.target.value })
            }
          />
        </Field>
        <Field label="Last name" htmlFor="student-last" error={errors.lastName}>
          <Input
            id="student-last"
            value={form.lastName}
            onChange={(event) =>
              setForm({ ...form, lastName: event.target.value })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Roll number"
          htmlFor="student-roll"
          error={errors.rollNumber}
        >
          <Input
            id="student-roll"
            value={form.rollNumber}
            onChange={(event) =>
              setForm({ ...form, rollNumber: event.target.value })
            }
            placeholder="001"
          />
        </Field>
        <Field
          label="Registration"
          htmlFor="student-reg"
          error={errors.registrationNumber}
          hint="Optional"
        >
          <Input
            id="student-reg"
            value={form.registrationNumber}
            onChange={(event) =>
              setForm({ ...form, registrationNumber: event.target.value })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="student-email" error={errors.email}>
          <Input
            id="student-email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </Field>
        <Field
          label="Primary phone"
          htmlFor="student-phone"
          error={errors.phoneNo}
        >
          <Input
            id="student-phone"
            value={form.phoneNo}
            onChange={(event) =>
              setForm({ ...form, phoneNo: event.target.value })
            }
          />
        </Field>
      </div>

      <Field
        label="Alternate phone"
        htmlFor="student-alt-phone"
        error={errors.alternatePhoneNo}
        hint="Optional"
      >
        <Input
          id="student-alt-phone"
          inputMode="tel"
          value={form.alternatePhoneNo}
          onChange={(event) =>
            setForm({ ...form, alternatePhoneNo: event.target.value })
          }
        />
      </Field>

      {student && (
        <Field label="Standing" error={errors.status}>
          <Select
            value={form.status}
            onValueChange={(value) =>
              setForm({ ...form, status: value as Student["status"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </FormDialog>
  )
}
