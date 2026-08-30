import { useMemo, useState } from "react"
import { Eye, Pencil, Plus, Trash2, UserPlus } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { FilterBar } from "@/components/filter-bar"
import { Field, FormDialog } from "@/components/form-dialog"
import { QueryState } from "@/components/query-state"
import { ResourceList, RowActions } from "@/components/resource-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TimePickerInput } from "@/components/ui/date-time-picker"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  type Allocation,
  type Student,
  fieldErrorsFrom,
  formErrorFrom,
  semesterLabel,
  useCreateAllocationMutation,
  useDeleteAllocationMutation,
  useEnrolStudentsOnClassMutation,
  useGetAllocationsQuery,
  useGetAuthorityCandidatesQuery,
  useGetBatchesQuery,
  useGetBatchSemestersQuery,
  useGetProgramsQuery,
  useGetStudentsQuery,
  useGetSubjectEnrollmentsQuery,
  useGetSubjectsQuery,
  useUpdateAllocationMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

import { AllocationReportDialog } from "./allocation-report-dialog"

/**
 * Allocations — who teaches what, to which batch.
 *
 * This is the row everything else hangs from: creating one makes a class that
 * students can be registered onto and attendance recorded against. It is also
 * the only place a class is visible to someone who does not teach it.
 */
export function AllocationsSection() {
  const teachers = useGetAuthorityCandidatesQuery({ role: "TEACHER" })
  const programs = useGetProgramsQuery(ALL)
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    subject__program: "all",
    batch_semester__batch: "all",
    batch_semester__semester: "all",
    subject: "all",
    teacher: "all",
  })
  const selectedProgram =
    filters["subject__program"] === "all"
      ? undefined
      : filters["subject__program"]
  // Program narrows the batch and subject lists, so dropping it drops what it
  // scoped with it rather than leaving a batch that no longer belongs.
  const clearProgram = () =>
    setFilters({
      subject__program: "all",
      batch_semester__batch: "all",
      batch_semester__semester: "all",
      subject: "all",
    })
  const batches = useGetBatchesQuery({
    ...ALL,
    ...(selectedProgram ? { program: selectedProgram } : {}),
  })
  const subjects = useGetSubjectsQuery({
    ...ALL,
    ...(selectedProgram ? { program: selectedProgram } : {}),
  })
  const semesterOptions = useMemo(
    () =>
      [
        ...new Set(
          subjects.data?.results.map((subject) => subject.semester) ?? []
        ),
      ].sort((left, right) => left - right),
    [subjects.data]
  )
  const { data, isLoading, isFetching, error, refetch } =
    useGetAllocationsQuery(params)

  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<Allocation | null>(null)
  const [enrolling, setEnrolling] = useState<Allocation | null>(null)
  const [archiving, setArchiving] = useState<Allocation | null>(null)
  const [reporting, setReporting] = useState<Allocation | null>(null)
  const [archive, { isLoading: isArchiving }] = useDeleteAllocationMutation()

  const canAdd = useHasPermission("add_subject_allocation")
  const canEdit = useHasPermission("edit_subject_allocation")
  const canDelete = useHasPermission("delete_subject_allocation")
  const canEnrol = useHasPermission("add_subject_enrollment")
  const canViewReport = useHasPermission("view_attendance")

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
          placeholder: "Search by subject",
        }}
        filters={
          <FilterBar
            pageKey="academics.allocations"
            filters={[
              {
                id: "program",
                label: "Program",
                isActive: filters["subject__program"] !== "all",
                onReset: () => clearProgram(),
                control: (
                  <Select
                    value={filters["subject__program"]}
                    onValueChange={(value) =>
                      setFilters({
                        subject__program: value,
                        batch_semester__batch: "all",
                        batch_semester__semester: "all",
                        subject: "all",
                      })
                    }
                  >
                    <SelectTrigger
                      className="w-56"
                      aria-label="Filter by program"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All programs</SelectItem>
                      {programs.data?.results.map((row) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.code} — {row.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
              {
                id: "batch",
                label: "Batch",
                isActive: filters["batch_semester__batch"] !== "all",
                onReset: () => setFilters({ batch_semester__batch: "all" }),
                control: (
                  <Select
                    value={filters["batch_semester__batch"]}
                    onValueChange={(value) =>
                      setFilters({ batch_semester__batch: value })
                    }
                  >
                    <SelectTrigger
                      className="w-48"
                      aria-label="Filter by batch"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All batches</SelectItem>
                      {batches.data?.results.map((row) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.program.code} — {row.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
              {
                id: "semester",
                label: "Semester",
                isActive: filters["batch_semester__semester"] !== "all",
                onReset: () => setFilters({ batch_semester__semester: "all" }),
                control: (
                  <Select
                    value={filters["batch_semester__semester"]}
                    onValueChange={(value) =>
                      setFilters({ batch_semester__semester: value })
                    }
                  >
                    <SelectTrigger
                      className="w-40"
                      aria-label="Filter by semester"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All semesters</SelectItem>
                      {semesterOptions.map((semester) => (
                        <SelectItem key={semester} value={String(semester)}>
                          {semesterLabel(semester)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
              {
                id: "subject",
                label: "Subject",
                defaultVisible: false,
                isActive: filters.subject !== "all",
                onReset: () => setFilters({ subject: "all" }),
                control: (
                  <Select
                    value={filters.subject}
                    onValueChange={(value) => setFilters({ subject: value })}
                  >
                    <SelectTrigger
                      className="w-52"
                      aria-label="Filter by subject"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All subjects</SelectItem>
                      {subjects.data?.results.map((row) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.code} — {row.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
              {
                id: "teacher",
                label: "Teacher",
                defaultVisible: false,
                isActive: filters.teacher !== "all",
                onReset: () => setFilters({ teacher: "all" }),
                control: (
                  <Select
                    value={filters.teacher}
                    onValueChange={(value) => setFilters({ teacher: value })}
                  >
                    <SelectTrigger
                      className="w-52"
                      aria-label="Filter by teacher"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teachers</SelectItem>
                      {teachers.data?.results.map((row) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.fullName || row.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
            ]}
          />
        }
        clearFilters={{
          visible:
            filters["subject__program"] !== "all" ||
            filters["batch_semester__batch"] !== "all" ||
            filters["batch_semester__semester"] !== "all" ||
            filters.subject !== "all" ||
            filters.teacher !== "all",
          onClear: () =>
            setFilters({
              subject__program: "all",
              batch_semester__batch: "all",
              batch_semester__semester: "all",
              subject: "all",
              teacher: "all",
            }),
        }}
        action={
          canAdd ? (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Allocate a subject
            </Button>
          ) : null
        }
        emptyTitle="Nothing allocated yet"
        emptyMessage="Allocate a subject to a batch and a teacher to create a class."
        emptyAction={
          canAdd ? (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Allocate a subject
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
            header: "Subject",
            className: "w-28 font-mono text-xs",
            cell: (row) => row.subject.code,
          },
          {
            header: "Name",
            cell: (row) => (
              <span className="font-medium">{row.subject.name}</span>
            ),
          },
          {
            header: "Batch",
            className: "text-muted-foreground",
            cell: (row) => (
              <>
                {row.batchSemester.batch.program.code}{" "}
                {row.batchSemester.batch.year}
                <Badge variant="outline" className="ml-2 text-xs">
                  {semesterLabel(row.batchSemester.semester)}
                </Badge>
              </>
            ),
          },
          { header: "Teacher", cell: (row) => row.teacher.fullName },
          {
            header: "Class time",
            className: "whitespace-nowrap tabular-nums text-muted-foreground",
            cell: (row) =>
              row.startTime && row.endTime
                ? `${formatTime(row.startTime)}–${formatTime(row.endTime)}`
                : "—",
          },
          {
            header: "Roster",
            className: "w-24 text-right tabular-nums",
            cell: (row) => row.enrolledCount,
          },
          {
            header: "",
            className: "w-28 text-right",
            cell: (row) => (
              <RowActions>
                {canViewReport && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`View performance report for ${row.subject.code}`}
                          onClick={() => setReporting(row)}
                        >
                          <Eye className="size-4" aria-hidden />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View report</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${row.subject.code}`}
                    onClick={() => setEditing(row)}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                )}
                {canEnrol && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Add students to ${row.subject.code}`}
                    onClick={() => setEnrolling(row)}
                  >
                    <UserPlus className="size-4" aria-hidden />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Archive ${row.subject.code}`}
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

      {isCreating && <AllocationForm onClose={() => setIsCreating(false)} />}
      {editing && (
        <AllocationEditForm
          allocation={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {enrolling && (
        <EnrolStudentsDialog
          allocation={enrolling}
          onClose={() => setEnrolling(null)}
        />
      )}
      {reporting && (
        <AllocationReportDialog
          allocation={reporting}
          onClose={() => setReporting(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.subject.code}?`}
        description="The class leaves every listing along with its roster, attendance, marks and assignments. Nothing is destroyed."
        isPending={isArchiving}
        onConfirm={async () => {
          if (!archiving) return
          try {
            await archive(archiving.id).unwrap()
            notifier.success("Allocation archived.")
            setArchiving(null)
          } catch {
            notifier.error("Could not archive that allocation.")
          }
        }}
      />
    </>
  )
}

function AllocationForm({ onClose }: { onClose: () => void }) {
  const semesters = useGetBatchSemestersQuery(ALL)
  const teachers = useGetAuthorityCandidatesQuery({ role: "TEACHER" })
  const [create, state] = useCreateAllocationMutation()
  const [form, setForm] = useState({
    batchSemester: "",
    subject: "",
    teacher: "",
    startTime: "",
    endTime: "",
  })

  const chosenSemester = semesters.data?.results.find(
    (row) => String(row.id) === form.batchSemester
  )

  // Only subjects of the right program and semester can be allocated, so the
  // list is narrowed rather than letting the backend reject the choice.
  const subjects = useGetSubjectsQuery(
    chosenSemester
      ? {
          limit: 0,
          program: chosenSemester.batch.program.id,
          semester: chosenSemester.semester,
        }
      : { limit: 0 },
    { skip: !chosenSemester }
  )

  const errors = fieldErrorsFrom(state.error)

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title="Allocate A Subject"
      description="One subject, taught to one batch in one semester, by one teacher."
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean(form.batchSemester && form.subject && form.teacher)}
      submitLabel="Allocate"
      contentClassName="max-h-[90dvh] sm:max-w-2xl"
      onSubmit={async () => {
        try {
          await create({
            batchSemester: Number(form.batchSemester),
            subject: Number(form.subject),
            teacher: Number(form.teacher),
            startTime: form.startTime || null,
            endTime: form.endTime || null,
          }).unwrap()
          notifier.success("Subject allocated.")
          onClose()
        } catch {
          /* the form shows the error */
        }
      }}
    >
      <Field label="Batch semester" error={errors.batchSemester}>
        <Select
          value={form.batchSemester}
          onValueChange={(value) =>
            setForm({ ...form, batchSemester: value, subject: "" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a batch and semester" />
          </SelectTrigger>
          <SelectContent>
            {semesters.data?.results.map((row) => (
              <SelectItem key={row.id} value={String(row.id)}>
                {row.batch.program.code} {row.batch.year} ·{" "}
                {semesterLabel(row.semester)} ({row.status.toLowerCase()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field
          label="Subject"
          error={errors.subject}
          hint={
            chosenSemester
              ? `Subjects in ${semesterLabel(chosenSemester.semester)} of ${chosenSemester.batch.program.code}.`
              : "Choose a batch semester first."
          }
        >
          <Select
            value={form.subject}
            onValueChange={(value) => setForm({ ...form, subject: value })}
            disabled={!chosenSemester}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.data?.results.map((row) => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.code} — {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Teacher" error={errors.teacher}>
          <Select
            value={form.teacher}
            onValueChange={(value) => setForm({ ...form, teacher: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.data?.results.map((row) => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.fullName || row.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Start time"
          htmlFor="allocation-start-time"
          error={errors.startTime}
          hint="Optional"
        >
          <TimePickerInput
            id="allocation-start-time"
            value={form.startTime}
            max={form.endTime || undefined}
            onValueChange={(startTime) => setForm({ ...form, startTime })}
            aria-label="Start time"
          />
        </Field>
        <Field
          label="End time"
          htmlFor="allocation-end-time"
          error={errors.endTime}
          hint="Optional"
        >
          <TimePickerInput
            id="allocation-end-time"
            value={form.endTime}
            min={form.startTime || undefined}
            onValueChange={(endTime) => setForm({ ...form, endTime })}
            aria-label="End time"
          />
        </Field>
      </div>
    </FormDialog>
  )
}

function AllocationEditForm({
  allocation,
  onClose,
}: {
  allocation: Allocation
  onClose: () => void
}) {
  const teachers = useGetAuthorityCandidatesQuery({ role: "TEACHER" })
  const semesters = useGetBatchSemestersQuery(ALL)
  const [update, state] = useUpdateAllocationMutation()
  const [form, setForm] = useState({
    batchSemester: String(allocation.batchSemester.id),
    subject: String(allocation.subject.id),
    teacher: String(allocation.teacher.id),
    startTime: allocation.startTime ?? "",
    endTime: allocation.endTime ?? "",
  })
  const chosenSemester = semesters.data?.results.find(
    (row) => String(row.id) === form.batchSemester
  )
  const subjects = useGetSubjectsQuery(
    chosenSemester
      ? {
          limit: 0,
          program: chosenSemester.batch.program.id,
          semester: chosenSemester.semester,
        }
      : { limit: 0 },
    { skip: !chosenSemester }
  )
  const errors = fieldErrorsFrom(state.error)

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title="Edit Subject Allocation"
      description={`${allocation.subject.code} · ${allocation.batchSemester.batch.program.code} ${allocation.batchSemester.batch.year} · ${semesterLabel(allocation.batchSemester.semester)}`}
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean(form.batchSemester && form.subject && form.teacher)}
      submitLabel="Save changes"
      contentClassName="max-h-[90dvh] sm:max-w-2xl"
      onSubmit={async () => {
        try {
          await update({
            id: allocation.id,
            body: {
              batchSemester: Number(form.batchSemester),
              subject: Number(form.subject),
              teacher: Number(form.teacher),
              startTime: form.startTime || null,
              endTime: form.endTime || null,
            },
          }).unwrap()
          notifier.success("Subject allocation updated.")
          onClose()
        } catch {
          /* the form shows the error */
        }
      }}
    >
      <Field label="Batch semester" error={errors.batchSemester}>
        <Select
          value={form.batchSemester}
          onValueChange={(value) =>
            setForm({ ...form, batchSemester: value, subject: "" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a batch and semester" />
          </SelectTrigger>
          <SelectContent>
            {semesters.data?.results.map((row) => (
              <SelectItem key={row.id} value={String(row.id)}>
                {row.batch.program.code} {row.batch.year} ·{" "}
                {semesterLabel(row.semester)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field
          label="Subject"
          error={errors.subject}
          hint="Batch semester and subject can change only before roster or performance records exist."
        >
          <Select
            value={form.subject}
            onValueChange={(value) => setForm({ ...form, subject: value })}
            disabled={!chosenSemester}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.data?.results.map((row) => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.code} — {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Teacher" error={errors.teacher}>
          <Select
            value={form.teacher}
            onValueChange={(value) => setForm({ ...form, teacher: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.data?.results.map((row) => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.fullName || row.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Start time"
          htmlFor="edit-allocation-start-time"
          error={errors.startTime}
          hint="Optional"
        >
          <TimePickerInput
            id="edit-allocation-start-time"
            value={form.startTime}
            max={form.endTime || undefined}
            onValueChange={(startTime) => setForm({ ...form, startTime })}
            aria-label="Start time"
          />
        </Field>
        <Field
          label="End time"
          htmlFor="edit-allocation-end-time"
          error={errors.endTime}
          hint="Optional"
        >
          <TimePickerInput
            id="edit-allocation-end-time"
            value={form.endTime}
            min={form.startTime || undefined}
            onValueChange={(endTime) => setForm({ ...form, endTime })}
            aria-label="End time"
          />
        </Field>
      </div>
    </FormDialog>
  )
}

function formatTime(value: string) {
  return new Date(`2000-01-01T${value}`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function EnrolStudentsDialog({
  allocation,
  onClose,
}: {
  allocation: Allocation
  onClose: () => void
}) {
  const batchId = allocation.batchSemester.batch.id
  const students = useGetStudentsQuery({ limit: 0, batch: batchId })
  const enrollments = useGetSubjectEnrollmentsQuery({
    allocation: allocation.id,
    limit: 0,
  })
  const [enrol, state] = useEnrolStudentsOnClassMutation()
  const [selected, setSelected] = useState<number[]>([])

  const all: Student[] = useMemo(
    () => students.data?.results ?? [],
    [students.data]
  )
  const enrolledIds = useMemo(
    () => new Set(enrollments.data?.results.map((row) => row.student.id) ?? []),
    [enrollments.data]
  )
  const available = useMemo(
    () => all.filter((student) => !enrolledIds.has(student.id)),
    [all, enrolledIds]
  )
  const allSelected =
    available.length > 0 && selected.length === available.length

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Add Students To ${allocation.subject.code}`}
      description={`From ${allocation.batchSemester.batch.program.code} ${allocation.batchSemester.batch.year}. Existing class members are checked and locked.`}
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={selected.length > 0}
      submitLabel={`Register ${selected.length || ""}`.trim()}
      onSubmit={async () => {
        try {
          const result = await enrol({
            allocation: allocation.id,
            students: selected,
          }).unwrap()
          notifier.success(
            `${result.created} registered${result.skipped ? `, ${result.skipped} already were` : ""}.`
          )
          onClose()
        } catch {
          /* the form shows the error */
        }
      }}
    >
      <QueryState
        isLoading={students.isLoading || enrollments.isLoading}
        error={students.error ?? enrollments.error}
        isEmpty={all.length === 0}
        skeleton="table"
        emptyTitle="No students in this batch"
        emptyMessage="Admit students to the batch first."
      >
        <div className="space-y-[5px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={available.length === 0}
            onClick={() =>
              setSelected(
                allSelected ? [] : available.map((student) => student.id)
              )
            }
          >
            {allSelected
              ? "Clear new selections"
              : available.length
                ? `Select ${available.length} not enrolled`
                : "Everyone is enrolled"}
          </Button>

          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
            {all.map((student) => {
              const isEnrolled = enrolledIds.has(student.id)
              return (
                <li key={student.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted has-disabled:cursor-default has-disabled:bg-muted/40">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={isEnrolled || selected.includes(student.id)}
                      disabled={isEnrolled}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, student.id]
                            : selected.filter((id) => id !== student.id)
                        )
                      }
                    />
                    <span className="w-10 font-mono text-xs text-muted-foreground tabular-nums">
                      {student.rollNumber}
                    </span>
                    <span className="min-w-0 flex-1">{student.fullName}</span>
                    {isEnrolled && <Badge variant="outline">Enrolled</Badge>}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </QueryState>
    </FormDialog>
  )
}
