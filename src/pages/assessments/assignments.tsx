import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  ClipboardCheck,
  Pencil,
  Plus,
  Save,
  Search,
} from "lucide-react"

import { ClassPicker } from "@/components/class-picker"
import { ClassWorkspaceNav } from "@/components/class-workspace-nav"
import { useHasPermission } from "@/hooks/use-has-permissions"
import { useRememberedClass } from "@/hooks/use-remembered-class"
import { PageHeader } from "@/components/page-header"
import { InlineSpinner, QueryState } from "@/components/query-state"
import { ClassWorkspaceSkeleton, ListSkeleton } from "@/components/skeletons"
import { StudentNameSortButton } from "@/components/student-name-sort"
import {
  sortStudentsByName,
  type StudentNameSortDirection,
} from "@/lib/utils/student-sort"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePickerInput } from "@/components/ui/date-time-picker"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  ASSIGNMENT_LABELS,
  type Assignment,
  type AssignmentStatus,
  apiErrorMessage,
  useCreateAssignmentMutation,
  useGetAssignmentSubmissionsQuery,
  useGetAssignmentsQuery,
  useGetClassesQuery,
  useGetRosterQuery,
  useSaveAssignmentSubmissionsMutation,
  useUpdateAssignmentMutation,
} from "@/lib/api"
import { localDateKey } from "@/lib/utils/date"
import { notifier } from "@/lib/utils/notifier"
import { cn } from "@/lib/utils"

const STATUS_ORDER: AssignmentStatus[] = ["DONE", "PARTIAL", "NOT_DONE"]

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  DONE: "data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
  PARTIAL: "data-[active=true]:bg-amber-500 data-[active=true]:text-white",
  NOT_DONE:
    "data-[active=true]:bg-muted-foreground data-[active=true]:text-background",
}

export default function AssignmentsPage() {
  const canAdd = useHasPermission("add_assignment")
  const canEdit = useHasPermission("edit_assignment")
  const [params, setParams] = useSearchParams()
  const classes = useGetClassesQuery()
  const runningClasses = useMemo(
    () =>
      classes.data?.filter((item) => item.semesterStatus === "RUNNING") ?? [],
    [classes.data]
  )
  const { initial, remember } = useRememberedClass(runningClasses)
  const [chosenId, setChosenId] = useState<number | null>(
    Number(params.get("class")) || null
  )
  const [open, setOpen] = useState<Assignment | null>(null)
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [completion, setCompletion] = useState("all")

  // Falls back to the remembered class until the user picks one.
  const allocation = chosenId ?? initial

  const assignments = useGetAssignmentsQuery(
    { allocation: allocation as number, limit: 0 },
    { skip: !allocation }
  )
  const chosen = classes.data?.find((item) => item.allocation === allocation)
  const classChoices =
    chosen?.semesterStatus === "COMPLETED"
      ? [chosen, ...runningClasses]
      : runningClasses
  const isReadOnly = chosen?.semesterStatus !== "RUNNING"
  const canCreate = Boolean(allocation && !isReadOnly && canAdd)
  const canChange = !isReadOnly && canEdit
  const studentCount = chosen?.studentCount ?? 0
  const visibleAssignments = useMemo(() => {
    return (assignments.data?.results ?? []).filter((assignment) => {
      const complete = assignment.evaluatedCount >= studentCount
      return (
        completion === "all" ||
        (completion === "complete" ? complete : !complete)
      )
    })
  }, [assignments.data, completion, studentCount])
  const completionCounts = useMemo(() => {
    const results = assignments.data?.results ?? []
    const complete = results.filter(
      (assignment) => assignment.evaluatedCount >= studentCount
    ).length
    return {
      all: results.length,
      complete,
      incomplete: results.length - complete,
    }
  }, [assignments.data, studentCount])

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-3 md:p-4">
      <PageHeader
        title="Assignments"
        description={
          chosen
            ? `${chosen.code} — ${chosen.name} · ${chosen.programCode} ${chosen.batchYear}`
            : "Choose a class."
        }
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-card hover:bg-accent"
          >
            <Link to="/classes">
              <ArrowLeft className="size-4" aria-hidden />
              My Classes
            </Link>
          </Button>
        }
      />

      {classes.isLoading ? (
        <ClassWorkspaceSkeleton />
      ) : (
        chosen && (
          <ClassWorkspaceNav value={chosen} active="Assignments" compact />
        )
      )}

      <div className="border bg-card">
        <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
          {classes.data && (
            <ClassPicker
              classes={classChoices}
              value={allocation}
              label="My Classes"
              className="w-full lg:w-[32rem]"
              onChange={(next) => {
                setChosenId(next)
                remember(next)
                setParams({ class: String(next) })
              }}
            />
          )}
          <Button
            size="sm"
            className="sm:ml-auto"
            disabled={!canCreate}
            onClick={() => setIsCreating(true)}
          >
            <Plus className="size-4" aria-hidden />
            {isReadOnly ? "Read only" : "Add assignment"}
          </Button>
        </div>
        <div
          className="flex min-w-0 gap-1 overflow-x-auto border-t px-2"
          aria-label="Filter assignment evaluation"
        >
          {(
            [
              ["all", "All"],
              ["incomplete", "Needs review"],
              ["complete", "Complete"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={completion === value}
              onClick={() => setCompletion(value)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                completion === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              <span className="text-xs tabular-nums">
                {completionCounts[value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <QueryState
        isLoading={classes.isLoading || assignments.isLoading}
        error={assignments.error}
        isEmpty={visibleAssignments.length === 0}
        onRetry={assignments.refetch}
        skeleton="cards"
        emptyTitle={
          completion !== "all"
            ? "No assignments match these filters"
            : "No assignments yet"
        }
        emptyMessage={
          completion !== "all"
            ? "Clear or change the filters to see other assignments."
            : isReadOnly
              ? "No assignments were recorded for this semester."
              : "Create one, then mark the class done, partial or not done."
        }
        emptyAction={
          completion === "all" &&
          canCreate && (
            <Button
              size="sm"
              disabled={!allocation}
              onClick={() => setIsCreating(true)}
            >
              <Plus className="size-4" aria-hidden />
              New assignment
            </Button>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAssignments.map((assignment) => {
            return (
              <Card key={assignment.id} className="h-full border">
                <CardHeader className="border-b bg-muted/20 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {assignment.title}
                    </CardTitle>
                    {assignment.dueDate && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        Due {assignment.dueDate}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Given {assignment.assignedDate}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Evaluated · {assignment.doneCount} completed</span>
                      <span className="tabular-nums">
                        {assignment.evaluatedCount}/{studentCount}
                      </span>
                    </div>
                    <Progress
                      value={
                        studentCount
                          ? (assignment.evaluatedCount / studentCount) * 100
                          : 0
                      }
                    />
                  </div>

                  <div className="mt-auto flex flex-row gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setOpen(assignment)}
                    >
                      <ClipboardCheck className="size-4" aria-hidden />
                      {canChange ? "Update statuses" : "View statuses"}
                    </Button>
                    {canChange && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-w-0 flex-1"
                        onClick={() => setEditing(assignment)}
                      >
                        <Pencil className="size-4" aria-hidden /> Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </QueryState>

      {allocation && canCreate && (
        <CreateAssignmentDialog
          allocation={allocation}
          open={isCreating}
          onOpenChange={setIsCreating}
        />
      )}
      {editing && canChange && (
        <EditAssignmentDialog
          assignment={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {open && allocation && (
        <StatusDialog
          assignment={open}
          allocation={allocation}
          readOnly={!canChange}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

function EditAssignmentDialog({
  assignment,
  onClose,
}: {
  assignment: Assignment
  onClose: () => void
}) {
  const [update, { isLoading }] = useUpdateAssignmentMutation()
  const [form, setForm] = useState({
    title: assignment.title,
    assignedDate: assignment.assignedDate,
    dueDate: assignment.dueDate ?? "",
  })

  async function submit() {
    try {
      await update({
        id: assignment.id,
        body: {
          title: form.title.trim(),
          assignedDate: form.assignedDate,
          dueDate: form.dueDate || null,
        },
      }).unwrap()
      notifier.success("Assignment updated.")
      onClose()
    } catch (error) {
      notifier.error(apiErrorMessage(error, "Could not update the assignment."))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="border-b pr-8 pb-3">
          <DialogTitle>Edit Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-[5px]">
            <Label htmlFor="edit-assignment-title">Title</Label>
            <Input
              id="edit-assignment-title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-[5px]">
              <Label htmlFor="edit-assignment-given">Given</Label>
              <DatePickerInput
                id="edit-assignment-given"
                value={form.assignedDate}
                onValueChange={(assignedDate) =>
                  setForm({ ...form, assignedDate })
                }
                aria-label="Given date"
              />
            </div>
            <div className="space-y-[5px]">
              <Label htmlFor="edit-assignment-due">Due</Label>
              <DatePickerInput
                id="edit-assignment-due"
                min={form.assignedDate}
                value={form.dueDate}
                onValueChange={(dueDate) => setForm({ ...form, dueDate })}
                aria-label="Due date"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row items-center border-t pt-3">
          <Button
            variant="ghost"
            className="h-9 min-w-0 flex-1 px-2 text-xs sm:h-8 sm:w-auto sm:flex-none sm:px-3 sm:text-sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="h-9 min-w-0 flex-1 px-2 text-xs sm:h-8 sm:w-auto sm:flex-none sm:px-3 sm:text-sm"
            onClick={submit}
            disabled={
              !form.title.trim() ||
              !form.assignedDate ||
              Boolean(form.dueDate && form.dueDate < form.assignedDate) ||
              isLoading
            }
          >
            {isLoading && <InlineSpinner />}Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateAssignmentDialog({
  allocation,
  open,
  onOpenChange,
}: {
  allocation: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [createAssignment, { isLoading }] = useCreateAssignmentMutation()
  const today = localDateKey()
  const [form, setForm] = useState({
    title: "",
    assignedDate: today,
    dueDate: "",
  })

  const submit = async () => {
    try {
      await createAssignment({
        allocation,
        title: form.title.trim(),
        assignedDate: form.assignedDate,
        dueDate: form.dueDate || null,
      }).unwrap()

      notifier.success("Assignment created.")
      onOpenChange(false)
      setForm({ title: "", assignedDate: today, dueDate: "" })
    } catch (error) {
      notifier.error(apiErrorMessage(error, "Could not create the assignment."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="border-b pr-8 pb-3">
          <DialogTitle>New Assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-[5px]">
            <Label htmlFor="assignment-title">Title</Label>
            <Input
              id="assignment-title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Linked lists exercise"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-[5px]">
              <Label htmlFor="assignment-given">Given</Label>
              <DatePickerInput
                id="assignment-given"
                value={form.assignedDate}
                onValueChange={(assignedDate) =>
                  setForm({ ...form, assignedDate })
                }
                aria-label="Given date"
              />
            </div>
            <div className="space-y-[5px]">
              <Label htmlFor="assignment-due">Due</Label>
              <DatePickerInput
                id="assignment-due"
                min={form.assignedDate}
                value={form.dueDate}
                onValueChange={(dueDate) => setForm({ ...form, dueDate })}
                aria-label="Due date"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!form.title.trim() || isLoading}>
            {isLoading && <InlineSpinner />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusDialog({
  assignment,
  allocation,
  readOnly,
  onClose,
}: {
  assignment: Assignment
  allocation: number
  readOnly: boolean
  onClose: () => void
}) {
  const roster = useGetRosterQuery(allocation)
  const existing = useGetAssignmentSubmissionsQuery(assignment.id)
  const [save, { isLoading: isSaving }] = useSaveAssignmentSubmissionsMutation()
  // Saved statuses are derived; only edits are state.
  const [edits, setEdits] = useState<Record<number, AssignmentStatus>>({})
  const [nameSort, setNameSort] = useState<StudentNameSortDirection>("default")
  const [studentSearch, setStudentSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | AssignmentStatus>(
    "all"
  )
  const [currentCell, setCurrentCell] = useState<{
    enrollment: number
    status: AssignmentStatus
  } | null>(null)
  const sortedRoster = useMemo(
    () => sortStudentsByName(roster.data ?? [], nameSort),
    [nameSort, roster.data]
  )

  const saved = useMemo(() => {
    const map: Record<number, AssignmentStatus> = {}
    roster.data?.forEach((entry) => {
      map[entry.enrollment] = "NOT_DONE"
    })
    existing.data?.forEach((row) => {
      map[row.enrollment] = row.status
    })
    return map
  }, [roster.data, existing.data])

  const statuses = useMemo(() => ({ ...saved, ...edits }), [saved, edits])
  const statusCounts = useMemo(() => {
    const values = sortedRoster.map((student) => statuses[student.enrollment])
    return {
      all: values.length,
      DONE: values.filter((status) => status === "DONE").length,
      PARTIAL: values.filter((status) => status === "PARTIAL").length,
      NOT_DONE: values.filter((status) => status === "NOT_DONE").length,
    }
  }, [sortedRoster, statuses])
  const visibleRoster = useMemo(() => {
    const term = studentSearch.trim().toLowerCase()
    return sortedRoster.filter(
      (student) =>
        (!term ||
          student.fullName.toLowerCase().includes(term) ||
          student.rollNumber.toLowerCase().includes(term)) &&
        (statusFilter === "all" ||
          statuses[student.enrollment] === statusFilter)
    )
  }, [sortedRoster, statuses, statusFilter, studentSearch])

  const moveStatusFocus = (
    rowIndex: number,
    statusIndex: number,
    key: string
  ) => {
    let nextRow = rowIndex
    let nextStatus = statusIndex

    if (key === "ArrowUp") {
      nextRow = Math.max(0, rowIndex - 1)
      nextStatus = 0
    }
    if (key === "ArrowDown") {
      nextRow = Math.min(visibleRoster.length - 1, rowIndex + 1)
      nextStatus = 0
    }
    if (key === "ArrowLeft") nextStatus = Math.max(0, statusIndex - 1)
    if (key === "ArrowRight")
      nextStatus = Math.min(STATUS_ORDER.length - 1, statusIndex + 1)

    const student = visibleRoster[nextRow]
    const status = STATUS_ORDER[nextStatus]
    if (!student || !status) return

    setCurrentCell({ enrollment: student.enrollment, status })
    if (statuses[student.enrollment] !== status) {
      setEdits((current) => ({ ...current, [student.enrollment]: status }))
    }
    document
      .getElementById(
        `assignment-${student.enrollment}-${status.toLowerCase()}`
      )
      ?.focus()
  }

  const submit = async () => {
    if (!roster.data) return

    try {
      const result = await save({
        assignmentId: assignment.id,
        allocation,
        entries: roster.data.map((student) => ({
          enrollment: student.enrollment,
          status: statuses[student.enrollment] ?? "NOT_DONE",
        })),
      }).unwrap()

      notifier.success(`${result.saved} statuses saved.`)
      onClose()
    } catch (error) {
      notifier.error(apiErrorMessage(error, "Could not save statuses."))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94dvh] w-[calc(100vw-1rem)] max-w-none overflow-hidden p-3 sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:p-6">
        <DialogHeader className="border-b pr-8 pb-3">
          <DialogTitle>{assignment.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 border-b pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex min-w-0 gap-1 overflow-x-auto"
              aria-label="Filter students by assignment status"
            >
              {(["all", ...STATUS_ORDER] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? "secondary" : "ghost"}
                  className="h-8 shrink-0 px-2 text-xs"
                  aria-pressed={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" ? "All" : ASSIGNMENT_LABELS[status]}{" "}
                  <span className="tabular-nums">{statusCounts[status]}</span>
                </Button>
              ))}
            </div>
            <div className="relative w-full sm:w-52">
              <Search
                className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search student"
                aria-label="Search students"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap justify-end gap-2">
              {STATUS_ORDER.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  disabled={existing.isLoading || !!existing.error}
                  onClick={() => {
                    if (!roster.data) return
                    const next: Record<number, AssignmentStatus> = {}
                    roster.data.forEach((entry) => {
                      next[entry.enrollment] = status
                    })
                    setEdits(next)
                  }}
                >
                  All {ASSIGNMENT_LABELS[status].toLowerCase()}
                </Button>
              ))}
            </div>
          )}
        </div>

        <QueryState
          isLoading={roster.isLoading || existing.isLoading}
          error={roster.error ?? existing.error}
          onRetry={() => {
            roster.refetch()
            existing.refetch()
          }}
          isEmpty={(roster.data?.length ?? 0) === 0}
          skeleton={<ListSkeleton rows={8} />}
          emptyTitle="No students registered"
          emptyMessage="Register students onto this class first."
        >
          <ul className="max-h-[72dvh] divide-y overflow-y-auto rounded-lg border bg-table-surface text-xs sm:text-sm">
            <li className="sticky top-0 z-10 flex items-center border-b bg-table-header p-3 text-table-header-foreground">
              <StudentNameSortButton
                direction={nameSort}
                onChange={setNameSort}
                label="Student"
              />
            </li>
            {visibleRoster.length === 0 && (
              <li className="p-8 text-center text-muted-foreground">
                No students match this filter.
              </li>
            )}
            {visibleRoster.map((student, rowIndex) => (
              <li
                key={student.enrollment}
                className="flex items-center justify-between gap-2 p-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">
                    {student.fullName}
                  </span>
                  <span className="truncate font-mono text-[10px] text-muted-foreground tabular-nums sm:text-xs">
                    Roll {student.rollNumber}
                  </span>
                </div>

                <div
                  className="flex shrink-0 gap-1"
                  role="group"
                  aria-label={`Status for ${student.fullName}`}
                >
                  {STATUS_ORDER.map((status, statusIndex) => {
                    const active = statuses[student.enrollment] === status
                    const isCurrent =
                      currentCell?.enrollment === student.enrollment &&
                      currentCell.status === status
                    return (
                      <Button
                        key={status}
                        id={`assignment-${student.enrollment}-${status.toLowerCase()}`}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        data-active={active}
                        data-current={isCurrent}
                        aria-pressed={active}
                        disabled={readOnly}
                        className={cn(
                          "h-7 px-1.5 text-[10px] data-[current=true]:ring-2 data-[current=true]:ring-primary data-[current=true]:ring-offset-1 data-[current=true]:ring-offset-background sm:h-8 sm:px-2.5 sm:text-xs",
                          STATUS_STYLES[status]
                        )}
                        onFocus={() =>
                          setCurrentCell({
                            enrollment: student.enrollment,
                            status,
                          })
                        }
                        onKeyDown={(event) => {
                          if (
                            ![
                              "ArrowUp",
                              "ArrowDown",
                              "ArrowLeft",
                              "ArrowRight",
                            ].includes(event.key)
                          )
                            return
                          event.preventDefault()
                          moveStatusFocus(rowIndex, statusIndex, event.key)
                        }}
                        onClick={() =>
                          setEdits({
                            ...edits,
                            [student.enrollment]: status,
                          })
                        }
                      >
                        {ASSIGNMENT_LABELS[status]}
                      </Button>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        </QueryState>

        <DialogFooter className="flex-row items-center border-t pt-3">
          <Button
            variant="ghost"
            className="min-w-0 flex-1 sm:w-auto sm:flex-none"
            onClick={onClose}
          >
            Cancel
          </Button>
          {!readOnly && (
            <Button
              className="min-w-0 flex-1 sm:w-auto sm:flex-none"
              onClick={submit}
              disabled={isSaving || existing.isLoading || !!existing.error}
            >
              {isSaving ? (
                <InlineSpinner />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
