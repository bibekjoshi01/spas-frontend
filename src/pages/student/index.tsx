import { useState } from "react"
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
} from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type StudentPortalOverview,
  useGetStudentPortalOverviewQuery,
} from "@/lib/api"
import { formatPercentage } from "@/lib/utils"
import { cn } from "@/lib/utils"

function ratio(obtained: number, total: number) {
  return total > 0 ? (obtained / total) * 100 : null
}

function subjectPerformance(
  subject: StudentPortalOverview["subjects"][number],
  weights: {
    attendanceWeight: number
    classPerformanceWeight: number
    assignmentWeight: number
    assessmentWeight: number
  }
) {
  const recordedAssessments = subject.assessments.filter(
    (row) => row.isAbsent || row.marksObtained !== null
  )
  const assessment = ratio(
    recordedAssessments.reduce(
      (sum, row) => sum + (row.isAbsent ? 0 : Number(row.marksObtained ?? 0)),
      0
    ),
    recordedAssessments.reduce((sum, row) => sum + row.fullMarks, 0)
  )
  const submitted = subject.assignments.filter((row) => row.status)
  const assignment = submitted.length
    ? submitted.reduce(
        (sum, row) =>
          sum +
          (row.status === "DONE" ? 100 : row.status === "PARTIAL" ? 50 : 0),
        0
      ) / submitted.length
    : null
  const metrics: Array<[number | null, number]> = [
    [
      subject.attendance && subject.attendance.held > 0
        ? subject.attendance.percentage
        : null,
      weights.attendanceWeight,
    ],
    [
      subject.classPerformance ? subject.classPerformance.score * 10 : null,
      weights.classPerformanceWeight,
    ],
    [assignment, weights.assignmentWeight],
    [assessment, weights.assessmentWeight],
  ]
  const available = metrics.filter(([value]) => value !== null)
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0)
  return totalWeight
    ? available.reduce((sum, [value, weight]) => sum + value! * weight, 0) /
        totalWeight
    : null
}

export default function StudentDashboard() {
  const query = useGetStudentPortalOverviewQuery()
  const [subjectFilter, setSubjectFilter] = useState<
    "all" | "attendance-risk" | "no-attendance"
  >("all")
  const data = query.data
  const held =
    data?.subjects.reduce((sum, row) => sum + (row.attendance?.held ?? 0), 0) ??
    0
  const attended =
    data?.subjects.reduce(
      (sum, row) =>
        sum + (row.attendance?.present ?? 0) + (row.attendance?.late ?? 0),
      0
    ) ?? 0
  const attendance = held ? (attended / held) * 100 : null
  const performances = data
    ? data.subjects
        .map((subject) => subjectPerformance(subject, data.policy))
        .filter((value): value is number => value !== null)
    : []
  const overall = performances.length
    ? performances.reduce((sum, value) => sum + value, 0) / performances.length
    : null
  const threshold = Number(data?.policy.attendanceEligibilityThreshold ?? 75)
  const subjectCounts = {
    all: data?.subjects.length ?? 0,
    "attendance-risk":
      data?.subjects.filter(
        (subject) =>
          subject.attendance &&
          subject.attendance.held > 0 &&
          subject.attendance.percentage < threshold
      ).length ?? 0,
    "no-attendance":
      data?.subjects.filter(
        (subject) => !subject.attendance || subject.attendance.held === 0
      ).length ?? 0,
  }
  const visibleSubjects =
    data?.subjects.filter((subject) => {
      if (subjectFilter === "all") return true
      if (subjectFilter === "no-attendance")
        return !subject.attendance || subject.attendance.held === 0
      return Boolean(
        subject.attendance &&
        subject.attendance.held > 0 &&
        subject.attendance.percentage < threshold
      )
    }) ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-3 md:p-4">
      <PageHeader
        title="My Performance"
        description={
          data
            ? `${data.student.programName} · Batch ${data.student.batchYear} · Roll ${data.student.rollNumber}`
            : undefined
        }
      />
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={Boolean(data && !data.subjects.length)}
        onRetry={query.refetch}
        skeleton="stats"
        emptyTitle="No subjects yet"
        emptyMessage="Your enrolled subjects will appear here once the college completes allocation."
      >
        {data && (
          <div className="space-y-5">
            <section className="grid grid-cols-2 border bg-card lg:grid-cols-4">
              <Metric
                icon={GraduationCap}
                label="Student"
                value={data.student.fullName}
              />
              <Metric
                icon={BookOpen}
                label="Subjects"
                value={String(data.subjects.length)}
              />
              <Metric
                icon={ClipboardList}
                label="Overall performance"
                value={formatPercentage(overall)}
              />
              <Metric
                icon={CheckCircle2}
                label="Attendance standing"
                value={
                  attendance === null
                    ? "No attendance"
                    : attendance >= threshold
                      ? "Eligible"
                      : "Below requirement"
                }
                tone={
                  attendance !== null && attendance < threshold
                    ? "danger"
                    : "success"
                }
              />
            </section>

            <Card>
              <CardHeader>
                <CardTitle>My attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attendance === null ? (
                  <p className="text-sm text-muted-foreground">
                    No attendance has been recorded yet.
                  </p>
                ) : (
                  <>
                    <AttendanceMeter
                      percentage={attendance}
                      threshold={threshold}
                    />
                    <p className="text-sm text-muted-foreground">
                      {attended} attended out of {held} held classes · Required{" "}
                      {formatPercentage(threshold)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <section className="space-y-3" aria-labelledby="subjects-heading">
              <div className="border bg-card">
                <div className="px-3 py-2.5">
                  <h2
                    id="subjects-heading"
                    className="font-heading text-lg font-bold"
                  >
                    My subjects
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Review attendance, assessment marks, and assignment status
                    by subject.
                  </p>
                </div>
                <div
                  className="flex min-w-0 gap-1 overflow-x-auto border-t px-2"
                  aria-label="Filter subjects"
                >
                  {(
                    [
                      ["all", "All"],
                      ["attendance-risk", "Below attendance"],
                      ["no-attendance", "No attendance"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={subjectFilter === value}
                      onClick={() => setSubjectFilter(value)}
                      className={cn(
                        "flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        subjectFilter === value
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                      <span className="text-xs tabular-nums">
                        {subjectCounts[value]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {visibleSubjects.length === 0 && (
                <div className="border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                  No subjects match this filter.
                </div>
              )}
              {visibleSubjects.map((subject) => {
                const performance = subjectPerformance(subject, data.policy)
                const attendanceRisk = Boolean(
                  subject.attendance &&
                  subject.attendance.held > 0 &&
                  subject.attendance.percentage < threshold
                )
                return (
                  <Card key={subject.enrollment}>
                    <CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>
                          {subject.class.code} · {subject.class.name}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Semester {subject.semester} ·{" "}
                          {subject.class.teacher.fullName}
                        </p>
                      </div>
                      <Badge
                        variant={attendanceRisk ? "destructive" : "secondary"}
                      >
                        {formatPercentage(performance)}
                      </Badge>
                    </CardHeader>
                    <CardContent className="grid gap-5 lg:grid-cols-3">
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Attendance</h3>
                        {subject.attendance && subject.attendance.held > 0 ? (
                          <>
                            <AttendanceMeter
                              percentage={subject.attendance.percentage}
                              threshold={threshold}
                            />
                            <p className="text-xs text-muted-foreground">
                              {`${subject.attendance.present} present · ${subject.attendance.late} late · ${subject.attendance.absent} absent · ${subject.attendance.excused} excused`}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Not recorded
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Class performance:{" "}
                          {subject.classPerformance
                            ? `${subject.classPerformance.score} / 10`
                            : "Not rated"}
                        </p>
                      </div>
                      <RecordList
                        title="Assessments"
                        empty="No assessments published"
                        rows={subject.assessments.map((exam) => ({
                          key: String(exam.examId),
                          label: exam.title,
                          value: exam.isAbsent
                            ? "Absent"
                            : exam.marksObtained === null
                              ? "Not marked"
                              : `${exam.marksObtained} / ${exam.fullMarks}`,
                        }))}
                      />
                      <RecordList
                        title="Assignments"
                        empty="No assignments published"
                        rows={subject.assignments.map((assignment) => ({
                          key: String(assignment.assignmentId),
                          label: assignment.title,
                          value: assignment.status
                            ? assignment.status.replace("_", " ")
                            : "Not marked",
                        }))}
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </section>
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
  icon: React.ElementType
  label: string
  value: string
  tone?: "success" | "danger"
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-r border-b p-3 lg:border-b-0">
      <span className="bg-primary/10 p-2 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`truncate font-semibold ${tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function RecordList({
  title,
  rows,
  empty,
}: {
  title: string
  rows: Array<{ key: string; label: string; value: string }>
  empty: string
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {rows.length ? (
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 break-words">{row.label}</span>
              <span className="shrink-0 text-right font-medium capitalize tabular-nums">
                {row.value.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}
