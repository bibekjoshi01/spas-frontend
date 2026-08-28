import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, ClipboardCheck, Pencil, Plus, Save } from "lucide-react"

import { ClassPicker } from "@/components/class-picker"
import { ClassWorkspaceNav } from "@/components/class-workspace-nav"
import { useHasPermission } from "@/hooks/use-has-permissions"
import { useRememberedClass } from "@/hooks/use-remembered-class"
import { PageHeader } from "@/components/page-header"
import { InlineSpinner, QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Assignments"
        description={
          chosen
            ? `${chosen.code} — ${chosen.name} · ${chosen.programCode} ${chosen.batchYear}`
            : "Choose a class."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/classes">
              <ArrowLeft className="size-4" aria-hidden />
              My Classes
            </Link>
          </Button>
        }
      />

      {chosen && <ClassWorkspaceNav value={chosen} active="Assignments" />}

      <div className="flex flex-col gap-2 border bg-card p-2 lg:flex-row lg:items-center">
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
        <Select value={completion} onValueChange={setCompletion}>
          <SelectTrigger
            className="w-full lg:w-52"
            aria-label="Filter assignment evaluation"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignments</SelectItem>
            <SelectItem value="incomplete">Evaluation incomplete</SelectItem>
            <SelectItem value="complete">Evaluation complete</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="lg:ml-auto"
          disabled={!canCreate}
          onClick={() => setIsCreating(true)}
        >
          <Plus className="size-4" aria-hidden />
          {isReadOnly ? "Read only" : "Add assignment"}
        </Button>
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
              <Card key={assignment.id}>
                <CardHeader className="pb-3">
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
                <CardContent className="space-y-3">
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

                  <div className="flex gap-2">
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
      <DialogContent>
        <DialogHeader>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-[5px]">
              <Label htmlFor="edit-assignment-given">Given</Label>
              <Input
                id="edit-assignment-given"
                type="date"
                value={form.assignedDate}
                onChange={(event) =>
                  setForm({ ...form, assignedDate: event.target.value })
                }
              />
            </div>
            <div className="space-y-[5px]">
              <Label htmlFor="edit-assignment-due">Due</Label>
              <Input
                id="edit-assignment-due"
                type="date"
                min={form.assignedDate}
                value={form.dueDate}
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
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
  const today = new Date().toISOString().slice(0, 10)
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
      <DialogContent>
        <DialogHeader>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-[5px]">
              <Label htmlFor="assignment-given">Given</Label>
              <Input
                id="assignment-given"
                type="date"
                value={form.assignedDate}
                onChange={(event) =>
                  setForm({ ...form, assignedDate: event.target.value })
                }
              />
            </div>
            <div className="space-y-[5px]">
              <Label htmlFor="assignment-due">Due</Label>
              <Input
                id="assignment-due"
                type="date"
                min={form.assignedDate}
                value={form.dueDate}
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
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
      <DialogContent className="max-h-[94vh] w-[min(96vw,64rem)] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{assignment.title}</DialogTitle>
        </DialogHeader>

        {!readOnly && (
          <div className="flex justify-end gap-2 pb-1">
            {STATUS_ORDER.map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                className="text-xs"
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

        <QueryState
          isLoading={roster.isLoading}
          error={roster.error}
          isEmpty={(roster.data?.length ?? 0) === 0}
          skeleton="table"
          emptyTitle="No students registered"
          emptyMessage="Register students onto this class first."
        >
          <ul className="max-h-[72vh] divide-y overflow-y-auto rounded-lg border">
            {roster.data?.map((student) => (
              <li
                key={student.enrollment}
                className="flex items-center justify-between gap-3 p-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {student.rollNumber}
                  </span>
                  <span className="truncate text-sm">{student.fullName}</span>
                </div>

                <div
                  className="flex shrink-0 gap-1"
                  role="group"
                  aria-label={`Status for ${student.fullName}`}
                >
                  {STATUS_ORDER.map((status) => {
                    const active = statuses[student.enrollment] === status
                    return (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        data-active={active}
                        aria-pressed={active}
                        disabled={readOnly}
                        className={cn(
                          "h-8 px-2.5 text-xs",
                          STATUS_STYLES[status]
                        )}
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

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {!readOnly && (
            <Button onClick={submit} disabled={isSaving}>
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
