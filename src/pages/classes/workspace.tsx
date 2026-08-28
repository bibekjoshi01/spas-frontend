import { Link, useParams } from "react-router-dom"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Star,
  Users,
} from "lucide-react"

import { ClassWorkspaceNav } from "@/components/class-workspace-nav"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useHasPermission } from "@/hooks/use-has-permissions"
import {
  eligibilityFor,
  useGetAssignmentsQuery,
  useGetAttendanceSessionsQuery,
  useGetClassesQuery,
  useGetClassStudentsQuery,
  useGetExamsQuery,
} from "@/lib/api"
import { localDateKey } from "@/lib/utils/date"

export default function ClassWorkspacePage() {
  const canViewAssessments = useHasPermission("view_internal_exam")
  const canViewAssignments = useHasPermission("view_assignment")
  const canViewPerformance = useHasPermission("view_class_performance")
  const allocation = Number(useParams().allocationId)
  const classes = useGetClassesQuery()
  const students = useGetClassStudentsQuery(allocation, { skip: !allocation })
  const exams = useGetExamsQuery(
    { allocation, limit: 0 },
    { skip: !allocation || !canViewAssessments }
  )
  const assignments = useGetAssignmentsQuery(
    { allocation, limit: 0 },
    { skip: !allocation || !canViewAssignments }
  )
  const sessions = useGetAttendanceSessionsQuery(
    { allocation, date: localDateKey(), limit: 20 },
    { skip: !allocation }
  )
  const selected = classes.data?.find((item) => item.allocation === allocation)
  const error =
    classes.error ??
    students.error ??
    exams.error ??
    assignments.error ??
    sessions.error
  const loading =
    classes.isLoading ||
    students.isLoading ||
    exams.isLoading ||
    assignments.isLoading ||
    sessions.isLoading

  const atRisk =
    students.data?.filter(
      (student) =>
        student.performancePercentage !== null &&
        eligibilityFor(student.performancePercentage) === "at-risk"
    ) ?? []
  const unrated =
    students.data?.filter((student) => student.classPerformance.score === null)
      .length ?? 0
  const incompleteExams =
    exams.data?.results.filter(
      (exam) => exam.markedCount < (selected?.studentCount ?? 0)
    ) ?? []
  const incompleteAssignments =
    assignments.data?.results.filter(
      (assignment) => assignment.evaluatedCount < (selected?.studentCount ?? 0)
    ) ?? []
  const running = selected?.semesterStatus === "RUNNING"

  return (
    <div className="mx-auto max-w-[1500px] space-y-3 p-3 md:p-4">
      <PageHeader
        title={
          selected ? `${selected.code} — ${selected.name}` : "Class Workspace"
        }
        description={
          selected
            ? `${selected.programCode} ${selected.batchYear} · Semester ${selected.semester}`
            : "Loading class context…"
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

      <QueryState
        isLoading={loading}
        error={error}
        isEmpty={!selected}
        onRetry={() => {
          classes.refetch()
          students.refetch()
          if (canViewAssessments) exams.refetch()
          if (canViewAssignments) assignments.refetch()
          sessions.refetch()
        }}
        skeleton="stats"
        emptyTitle="Class unavailable"
        emptyMessage="This class is not allocated to you or is no longer available."
      >
        {selected && (
          <div className="space-y-3">
            <ClassWorkspaceNav value={selected} active="Overview" />

            <div className="grid border bg-white sm:grid-cols-2 lg:grid-cols-5 dark:bg-slate-950">
              <Metric
                icon={Users}
                label="Students"
                value={selected.studentCount}
              />
              <Metric
                icon={CalendarCheck}
                label="Classes held"
                value={selected.classesHeld}
              />
              {canViewAssessments && (
                <Metric
                  icon={ClipboardList}
                  label="Assessments"
                  value={exams.data?.count ?? 0}
                />
              )}
              {canViewAssignments && (
                <Metric
                  icon={ClipboardCheck}
                  label="Assignments"
                  value={assignments.data?.count ?? 0}
                />
              )}
              {canViewPerformance && (
                <Metric
                  icon={Star}
                  label="Need attention"
                  value={atRisk.length}
                  tone={atRisk.length ? "risk" : undefined}
                />
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
              <section className="border bg-white dark:bg-slate-950">
                <div className="border-b bg-muted/60 px-3 py-2">
                  <h2 className="font-semibold">Next actions</h2>
                  <p className="text-xs text-muted-foreground">
                    Incomplete work in this class.
                  </p>
                </div>
                <div className="divide-y">
                  <ActionRow
                    icon={CalendarCheck}
                    label={
                      sessions.data?.count
                        ? "Today’s attendance recorded"
                        : "Open today’s attendance"
                    }
                    href={`/attendance?class=${allocation}`}
                    done={Boolean(sessions.data?.count)}
                    disabled={!running}
                  />
                  {canViewAssessments && (
                    <ActionRow
                      icon={ClipboardList}
                      label={`${incompleteExams.length} assessments have incomplete marks`}
                      href={`/assessments?class=${allocation}`}
                      done={!incompleteExams.length}
                      disabled={!running}
                    />
                  )}
                  {canViewAssignments && (
                    <ActionRow
                      icon={ClipboardCheck}
                      label={`${incompleteAssignments.length} assignments have incomplete evaluation`}
                      href={`/assignments?class=${allocation}`}
                      done={!incompleteAssignments.length}
                      disabled={!running}
                    />
                  )}
                  {canViewPerformance && (
                    <ActionRow
                      icon={Star}
                      label={`${unrated} students are not rated`}
                      href={`/class-performance?class=${allocation}`}
                      done={!unrated}
                      disabled={!running}
                    />
                  )}
                </div>
              </section>

              {canViewPerformance && (
                <section className="border bg-white dark:bg-slate-950">
                  <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-2">
                    <div>
                      <h2 className="font-semibold">
                        Students needing attention
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Based on weighted performance.
                      </p>
                    </div>
                    <Badge
                      variant={atRisk.length ? "destructive" : "secondary"}
                    >
                      {atRisk.length}
                    </Badge>
                  </div>
                  {atRisk.length ? (
                    <div className="max-h-64 divide-y overflow-y-auto">
                      {atRisk.map((student) => (
                        <Link
                          key={student.enrollment}
                          to={`/roster?class=${allocation}&student=${student.enrollment}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted"
                        >
                          <span>
                            <span className="font-medium">
                              {student.fullName}
                            </span>
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {student.rollNumber}
                            </span>
                          </span>
                          <span className="font-semibold text-red-600 tabular-nums">
                            {student.performancePercentage}%
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                      <CheckCircle2
                        className="size-4 text-emerald-600"
                        aria-hidden
                      />
                      No students currently classified as at risk.
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}
      </QueryState>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: number
  tone?: "risk"
}) {
  return (
    <div className="border-b p-3 last:border-b-0 sm:border-r sm:border-b-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        {label}
      </div>
      <p
        className={
          tone === "risk"
            ? "mt-1 text-2xl font-bold text-red-600"
            : "mt-1 text-2xl font-bold"
        }
      >
        {value}
      </p>
    </div>
  )
}

function ActionRow({
  icon: Icon,
  label,
  href,
  done,
  disabled,
}: {
  icon: typeof AlertTriangle
  label: string
  href: string
  done: boolean
  disabled: boolean
}) {
  const body = (
    <>
      <Icon
        className={done ? "size-4 text-emerald-600" : "size-4 text-amber-600"}
        aria-hidden
      />
      <span className="flex-1">{label}</span>
      {done && <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />}
    </>
  )
  return disabled ? (
    <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
      {body}
    </div>
  ) : (
    <Link
      to={href}
      className="flex items-center gap-2 px-3 py-3 text-sm hover:bg-muted"
    >
      {body}
    </Link>
  )
}
