import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, ClipboardList, Pencil, Plus, Save } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  EXAM_TYPE_LABELS,
  type Exam,
  type ExamType,
  apiErrorMessage,
  useCreateExamMutation,
  useGetClassesQuery,
  useGetExamMarksQuery,
  useGetExamsQuery,
  useGetRosterQuery,
  useSaveExamMarksMutation,
  useUpdateExamMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

export default function ExamsPage() {
  const canAdd = useHasPermission("add_internal_exam")
  const canEdit = useHasPermission("edit_internal_exam")
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
  const [openExam, setOpenExam] = useState<Exam | null>(null)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [completion, setCompletion] = useState("all")

  // Falls back to the remembered class until the user picks one.
  const allocation = chosenId ?? initial

  const exams = useGetExamsQuery(
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
  const visibleExams = useMemo(() => {
    return (exams.data?.results ?? []).filter((exam) => {
      const complete = exam.markedCount >= (chosen?.studentCount ?? 0)
      return (
        completion === "all" ||
        (completion === "complete" ? complete : !complete)
      )
    })
  }, [chosen?.studentCount, completion, exams.data])

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Assessments"
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

      {chosen && <ClassWorkspaceNav value={chosen} active="Assessments" />}

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
            aria-label="Filter assessment completion"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assessments</SelectItem>
            <SelectItem value="incomplete">Marks incomplete</SelectItem>
            <SelectItem value="complete">Marks complete</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="lg:ml-auto"
          disabled={!canCreate}
          onClick={() => setIsCreating(true)}
        >
          <Plus className="size-4" aria-hidden />
          {isReadOnly ? "Read only" : "Add assessment"}
        </Button>
      </div>

      <QueryState
        isLoading={classes.isLoading || exams.isLoading}
        error={exams.error}
        isEmpty={visibleExams.length === 0}
        onRetry={exams.refetch}
        skeleton="cards"
        emptyTitle={
          completion !== "all"
            ? "No assessments match these filters"
            : "No assessments yet"
        }
        emptyMessage={
          completion !== "all"
            ? "Clear or change the filters to see other assessments."
            : isReadOnly
              ? "No assessments were recorded for this semester."
              : "Create an assessment, then enter marks for the whole class in one go."
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
              New assessment
            </Button>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleExams.map((exam) => (
            <Card key={exam.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{exam.title}</CardTitle>
                  <Badge variant="secondary">
                    {EXAM_TYPE_LABELS[exam.examType]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Full marks {exam.fullMarks}
                  {exam.passMarks !== null && ` · pass ${exam.passMarks}`}
                  {exam.examDate && ` · ${exam.examDate}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid divide-y border text-center text-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <ExamMetric label="Marked" value={exam.markedCount} />
                  <ExamMetric label="Passed" value={exam.passedCount} />
                  <ExamMetric
                    label="Average"
                    value={
                      exam.averageMarks === null
                        ? "—"
                        : Number(exam.averageMarks).toFixed(1)
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setOpenExam(exam)}
                  >
                    <ClipboardList className="size-4" aria-hidden />
                    {canChange ? "Enter marks" : "View marks"}
                  </Button>
                  {canChange && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingExam(exam)}
                    >
                      <Pencil className="size-4" aria-hidden />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryState>

      {allocation && canCreate && (
        <CreateExamDialog
          allocation={allocation}
          open={isCreating}
          onOpenChange={setIsCreating}
        />
      )}

      {editingExam && canChange && (
        <EditExamDialog
          exam={editingExam}
          onClose={() => setEditingExam(null)}
        />
      )}

      {openExam && allocation && (
        <MarksDialog
          exam={openExam}
          allocation={allocation}
          readOnly={!canChange}
          onClose={() => setOpenExam(null)}
        />
      )}
    </div>
  )
}

function ExamMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="px-2 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-bold tabular-nums">{value}</p>
    </div>
  )
}

function EditExamDialog({
  exam,
  onClose,
}: {
  exam: Exam
  onClose: () => void
}) {
  const [update, { isLoading }] = useUpdateExamMutation()
  const [form, setForm] = useState({
    title: exam.title,
    examType: exam.examType,
    fullMarks: String(exam.fullMarks),
    passMarks: exam.passMarks === null ? "" : String(exam.passMarks),
    examDate: exam.examDate ?? "",
  })

  async function submit() {
    try {
      await update({
        id: exam.id,
        body: {
          title: form.title.trim(),
          examType: form.examType,
          fullMarks: Number(form.fullMarks),
          passMarks: Number(form.passMarks),
          examDate: form.examDate || null,
        },
      }).unwrap()
      notifier.success("Assessment updated.")
      onClose()
    } catch (error) {
      notifier.error(apiErrorMessage(error, "Could not update the assessment."))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Assessment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-[5px]">
            <Label htmlFor="edit-exam-title">Title</Label>
            <Input
              id="edit-exam-title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </div>
          <div className="space-y-[5px]">
            <Label>Type</Label>
            <Select
              value={form.examType}
              onValueChange={(value) =>
                setForm({ ...form, examType: value as ExamType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXAM_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-[5px]">
              <Label htmlFor="edit-exam-full">Full marks</Label>
              <Input
                id="edit-exam-full"
                type="number"
                min={1}
                value={form.fullMarks}
                onChange={(event) =>
                  setForm({ ...form, fullMarks: event.target.value })
                }
              />
            </div>
            <div className="space-y-[5px]">
              <Label htmlFor="edit-exam-pass">Pass marks</Label>
              <Input
                id="edit-exam-pass"
                type="number"
                min={1}
                value={form.passMarks}
                onChange={(event) =>
                  setForm({ ...form, passMarks: event.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-[5px]">
            <Label htmlFor="edit-exam-date">Exam date</Label>
            <Input
              id="edit-exam-date"
              type="date"
              value={form.examDate}
              onChange={(event) =>
                setForm({ ...form, examDate: event.target.value })
              }
            />
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
              !form.passMarks ||
              Number(form.passMarks) < 1 ||
              Number(form.passMarks) > Number(form.fullMarks) ||
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

function CreateExamDialog({
  allocation,
  open,
  onOpenChange,
}: {
  allocation: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [createExam, { isLoading }] = useCreateExamMutation()
  const [form, setForm] = useState({
    title: "",
    examType: "FIRST_TERM" as ExamType,
    fullMarks: "20",
    passMarks: "",
    examDate: "",
  })

  const submit = async () => {
    try {
      await createExam({
        allocation,
        title: form.title.trim(),
        examType: form.examType,
        fullMarks: Number(form.fullMarks),
        passMarks: Number(form.passMarks),
        examDate: form.examDate || null,
      }).unwrap()

      notifier.success("Exam created.")
      onOpenChange(false)
      setForm({ ...form, title: "", passMarks: "", examDate: "" })
    } catch (error) {
      notifier.error(apiErrorMessage(error, "Could not create the exam."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Internal Exam</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-[5px]">
            <Label htmlFor="exam-title">Title</Label>
            <Input
              id="exam-title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="First Term"
            />
          </div>

          <div className="space-y-[5px]">
            <Label>Type</Label>
            <Select
              value={form.examType}
              onValueChange={(value) =>
                setForm({ ...form, examType: value as ExamType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXAM_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-[5px]">
              <Label htmlFor="exam-full">Full marks</Label>
              <Input
                id="exam-full"
                type="number"
                min={1}
                value={form.fullMarks}
                onChange={(event) =>
                  setForm({ ...form, fullMarks: event.target.value })
                }
              />
            </div>
            <div className="space-y-[5px]">
              <Label htmlFor="exam-pass">Pass marks</Label>
              <Input
                id="exam-pass"
                type="number"
                min={1}
                value={form.passMarks}
                onChange={(event) =>
                  setForm({ ...form, passMarks: event.target.value })
                }
                placeholder="Required"
              />
            </div>
          </div>

          <div className="space-y-[5px]">
            <Label htmlFor="exam-date">Exam date</Label>
            <Input
              id="exam-date"
              type="date"
              value={form.examDate}
              onChange={(event) =>
                setForm({ ...form, examDate: event.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              !form.title.trim() ||
              !form.passMarks ||
              Number(form.passMarks) < 1 ||
              Number(form.passMarks) > Number(form.fullMarks) ||
              isLoading
            }
          >
            {isLoading && <InlineSpinner />}
            Create exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MarksDialog({
  exam,
  allocation,
  readOnly,
  onClose,
}: {
  exam: Exam
  allocation: number
  readOnly: boolean
  onClose: () => void
}) {
  const roster = useGetRosterQuery(allocation)
  const existing = useGetExamMarksQuery(exam.id)
  const [saveMarks, { isLoading: isSaving }] = useSaveExamMarksMutation()

  // What is already saved is derived during render; only the teacher's edits
  // are state, so a background refetch cannot wipe half-entered marks.
  const [edits, setEdits] = useState<
    Record<number, { marks: string; absent: boolean }>
  >({})

  const saved = useMemo(() => {
    const map: Record<number, { marks: string; absent: boolean }> = {}
    roster.data?.forEach((entry) => {
      map[entry.enrollment] = { marks: "", absent: false }
    })
    existing.data?.forEach((mark) => {
      map[mark.enrollment] = {
        marks: mark.marksObtained ?? "",
        absent: mark.isAbsent,
      }
    })
    return map
  }, [roster.data, existing.data])

  const entries = useMemo(() => ({ ...saved, ...edits }), [saved, edits])

  const invalid = useMemo(
    () =>
      Object.values(entries).some(
        (entry) =>
          entry.marks !== "" &&
          (Number(entry.marks) < 0 || Number(entry.marks) > exam.fullMarks)
      ),
    [entries, exam.fullMarks]
  )

  const submit = async () => {
    if (!roster.data) return

    try {
      const result = await saveMarks({
        examId: exam.id,
        allocation,
        entries: roster.data
          .map((student) => {
            const entry = entries[student.enrollment]
            if (!entry) return null
            if (!entry.absent && entry.marks === "") return null

            return {
              enrollment: student.enrollment,
              marksObtained: entry.absent ? null : entry.marks,
              isAbsent: entry.absent,
            }
          })
          .filter((row): row is NonNullable<typeof row> => row !== null),
      }).unwrap()

      notifier.success(`${result.saved} marks saved.`)
      onClose()
    } catch (error) {
      notifier.error(apiErrorMessage(error, "Could not save marks."))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] w-[min(96vw,64rem)] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {exam.title}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              out of {exam.fullMarks}
            </span>
          </DialogTitle>
        </DialogHeader>

        <QueryState
          isLoading={roster.isLoading}
          error={roster.error}
          isEmpty={(roster.data?.length ?? 0) === 0}
          skeleton="table"
          emptyTitle="No students registered"
          emptyMessage="Register students onto this class first."
        >
          <ul className="max-h-[72vh] divide-y overflow-y-auto rounded-lg border">
            {roster.data?.map((student) => {
              const entry = entries[student.enrollment] ?? {
                marks: "",
                absent: false,
              }
              const tooHigh =
                entry.marks !== "" && Number(entry.marks) > exam.fullMarks

              return (
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

                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={exam.fullMarks}
                      step="0.5"
                      value={entry.marks}
                      disabled={readOnly || entry.absent}
                      aria-label={`Marks for ${student.fullName}`}
                      aria-invalid={tooHigh}
                      className={`h-8 w-20 text-right tabular-nums ${
                        tooHigh ? "border-destructive" : ""
                      }`}
                      onChange={(event) =>
                        setEdits({
                          ...entries,
                          [student.enrollment]: {
                            ...entry,
                            marks: event.target.value,
                          },
                        })
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={entry.absent ? "destructive" : "outline"}
                      className="h-8 px-2 text-xs"
                      aria-pressed={entry.absent}
                      disabled={readOnly}
                      onClick={() =>
                        setEdits({
                          ...entries,
                          [student.enrollment]: {
                            marks: entry.absent ? entry.marks : "",
                            absent: !entry.absent,
                          },
                        })
                      }
                    >
                      Absent
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </QueryState>

        <DialogFooter>
          {invalid && (
            <p className="mr-auto text-xs text-destructive">
              Marks must be between 0 and {exam.fullMarks}.
            </p>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {!readOnly && (
            <Button onClick={submit} disabled={isSaving || invalid}>
              {isSaving ? (
                <InlineSpinner />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Save marks
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
