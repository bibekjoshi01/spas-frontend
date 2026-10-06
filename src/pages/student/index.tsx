import { useState } from "react"
import { BookOpen, CalendarDays, GraduationCap, RefreshCw } from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type StudentPortalOverview,
  useGetStudentPortalOverviewQuery,
} from "@/lib/api"
import { formatPercentage } from "@/lib/utils"

import { StudentSubjectDialog } from "./subject-detail"
import { StudentAssignments } from "./assignments"

const sections = [
  "Overview",
  "My subjects",
  "Assignments",
  "Academic record",
] as const
const lifecycle = {
  RUNNING: "Current",
  UPCOMING: "Upcoming",
  COMPLETED: "Completed",
}

import { displayDate } from "./format"

export default function StudentDashboard() {
  const query = useGetStudentPortalOverviewQuery()
  const data = query.data
  const [section, setSection] = useState<(typeof sections)[number]>("Overview")
  const [semester, setSemester] = useState("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<number | null>(null)
  const subjects =
    data?.subjects.filter(
      (row) =>
        (semester === "all" || String(row.batchSemester) === semester) &&
        `${row.class.code} ${row.class.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
    ) ?? []
  const semesterOptions = [
    ...new Map(data?.subjects.map((row) => [row.batchSemester, row])).values(),
  ]
  const current =
    data?.subjects.filter(
      (row) => row.semesterStatus === "RUNNING" && row.isActive
    ) ?? []
  const scores = current
    .map((row) => row.performancePercentage)
    .filter((value): value is number => value !== null)
  const below = current.filter((row) => row.attendance.eligible === false)
  const threshold = Number(data?.policy.attendanceEligibilityThreshold ?? 75)

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-5">
      <PageHeader
        title="My Student Portal"
        description={
          data
            ? `${data.student.fullName} · ${data.student.programName} · Roll ${data.student.rollNumber}`
            : "Your academic record and class progress"
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
      />
      <nav
        className="flex flex-wrap gap-2"
        aria-label="Student portal sections"
      >
        {sections.map((item) => (
          <Button
            key={item}
            variant={section === item ? "default" : "outline"}
            aria-current={section === item ? "page" : undefined}
            onClick={() => setSection(item)}
          >
            {item}
          </Button>
        ))}
      </nav>
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        skeleton="stats"
      >
        {data && (
          <div className="space-y-5">
            {section === "Assignments" && (
              <StudentAssignments overview={data} />
            )}
            {section === "Overview" && (
              <>
                <section className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    icon={BookOpen}
                    label="Current subjects"
                    value={String(current.length)}
                  />
                  <Metric
                    icon={GraduationCap}
                    label="Current performance"
                    value={formatPercentage(
                      scores.length
                        ? scores.reduce((sum, value) => sum + value, 0) /
                            scores.length
                        : null,
                      "Not recorded"
                    )}
                  />
                  <Metric
                    icon={CalendarDays}
                    label="Subjects below attendance requirement"
                    value={String(below.length)}
                  />
                </section>
                <Card>
                  <CardHeader>
                    <CardTitle>Current attendance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Each subject requires {formatPercentage(threshold)}{" "}
                      attendance. Present and late classes count as attended;
                      excused absences do not.
                    </p>
                    {!current.length && (
                      <p className="text-sm text-muted-foreground">
                        No current subjects. You can still view previous and
                        upcoming subjects.
                      </p>
                    )}
                    {current.map((row) => (
                      <div
                        key={row.enrollment}
                        className="space-y-2 rounded-lg border p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            className="text-left font-medium text-primary hover:underline"
                            onClick={() => setSelected(row.enrollment)}
                          >
                            {row.class.code} · {row.class.name}
                          </button>
                          <Badge
                            variant={
                              row.attendance.eligible === false
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {row.attendance.eligible === null
                              ? "Not recorded"
                              : row.attendance.eligible
                                ? "Eligible"
                                : "Below requirement"}
                          </Badge>
                        </div>
                        {row.attendance.percentage !== null && (
                          <AttendanceMeter
                            percentage={row.attendance.percentage}
                            threshold={threshold}
                          />
                        )}
                        <p className="text-xs text-muted-foreground">
                          {row.attendance.present + row.attendance.late}{" "}
                          attended / {row.attendance.held} held ·{" "}
                          {row.attendance.unmarked} unmarked
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming assessments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {current.flatMap((row) =>
                          row.assessments
                            .filter(
                              (exam) =>
                                exam.examDate && exam.examDate >= data.asOfDate
                            )
                            .map((exam) => (
                              <li key={`${row.enrollment}-${exam.examId}`}>
                                <button
                                  className="text-left text-sm font-medium text-primary hover:underline"
                                  onClick={() => setSelected(row.enrollment)}
                                >
                                  {exam.title} · {row.class.code}
                                </button>
                                <p className="text-xs text-muted-foreground">
                                  {displayDate(exam.examDate)} ·{" "}
                                  {exam.fullMarks} full marks
                                </p>
                              </li>
                            ))
                        )}
                        {!current.some((row) =>
                          row.assessments.some(
                            (exam) =>
                              exam.examDate && exam.examDate >= data.asOfDate
                          )
                        ) && (
                          <li className="text-sm text-muted-foreground">
                            No upcoming assessments scheduled.
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Assignments to follow up</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Status reflects your teacher’s latest record.
                      </p>
                      <ul className="space-y-3">
                        {current.flatMap((row) =>
                          row.assignments
                            .filter((item) => item.status !== "DONE")
                            .map((item) => (
                              <li
                                key={`${row.enrollment}-${item.assignmentId}`}
                              >
                                <button
                                  className="text-left text-sm font-medium text-primary hover:underline"
                                  onClick={() => setSelected(row.enrollment)}
                                >
                                  {item.title} · {row.class.code}
                                </button>
                                <p className="text-xs text-muted-foreground">
                                  {item.dueDate
                                    ? `Due ${displayDate(item.dueDate)}${item.dueDate < data.asOfDate ? " · Past due date" : ""}`
                                    : "No due date"}{" "}
                                  ·{" "}
                                  {item.status
                                    ?.replaceAll("_", " ")
                                    .toLowerCase() ?? "Not recorded"}
                                </p>
                              </li>
                            ))
                        )}
                        {!current.some((row) =>
                          row.assignments.some((item) => item.status !== "DONE")
                        ) && (
                          <li className="text-sm text-muted-foreground">
                            No assignments need follow up.
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-xs text-muted-foreground">
                  Performance uses the college’s weights: attendance{" "}
                  {data.policy.attendanceWeight}%, assessments{" "}
                  {data.policy.assessmentWeight}%, assignments{" "}
                  {data.policy.assignmentWeight}%, class performance{" "}
                  {data.policy.classPerformanceWeight}%. Only recorded evidence
                  contributes. This is a progress indicator, not a final
                  university grade.
                </p>
              </>
            )}
            {section === "My subjects" && (
              <>
                <div className="flex flex-wrap gap-3">
                  <Input
                    aria-label="Search my subjects"
                    placeholder="Search subject name or code"
                    className="sm:max-w-xs"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger aria-label="Filter by semester">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All semesters</SelectItem>
                      {semesterOptions.map((row) => (
                        <SelectItem
                          key={row.batchSemester}
                          value={String(row.batchSemester)}
                        >
                          Semester {row.semester} · Batch {row.class.batchYear}{" "}
                          · {lifecycle[row.semesterStatus]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!subjects.length && (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      {data.subjects.length
                        ? "No subjects match your filters."
                        : "Your subjects will appear once your college enrolls you in a class."}
                    </CardContent>
                  </Card>
                )}
                {(["RUNNING", "UPCOMING", "COMPLETED"] as const).map(
                  (status) => {
                    const rows = subjects.filter(
                      (row) => row.semesterStatus === status
                    )
                    if (!rows.length) return null
                    return (
                      <section key={status} className="space-y-3">
                        <h2 className="font-heading text-lg font-bold">
                          {lifecycle[status]} subjects
                        </h2>
                        <div className="grid gap-3 md:grid-cols-2">
                          {rows.map((row) => (
                            <Card key={row.enrollment}>
                              <CardHeader>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary">
                                    Semester {row.semester}
                                  </Badge>
                                  {row.isRetake && (
                                    <Badge variant="outline">Retake</Badge>
                                  )}
                                  {!row.isActive && (
                                    <Badge variant="outline">
                                      Inactive enrollment
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle>
                                  {row.class.code} · {row.class.name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {row.class.teacher.fullName ||
                                    "Teacher name unavailable"}{" "}
                                  · {row.class.creditHours} credits
                                </p>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="text-sm">
                                  Progress:{" "}
                                  {formatPercentage(
                                    row.performancePercentage,
                                    "Not recorded"
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {row.assessments.length} assessments ·{" "}
                                  {row.assignments.length} assignments
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => setSelected(row.enrollment)}
                                >
                                  View marks and details
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </section>
                    )
                  }
                )}
              </>
            )}
            {section === "Academic record" && <AcademicRecord data={data} />}
          </div>
        )}
      </QueryState>
      {selected !== null && data && !query.error && (
        <StudentSubjectDialog
          key={selected}
          enrollment={selected}
          threshold={threshold}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function AcademicRecord({ data }: { data: StudentPortalOverview }) {
  const student = data.student
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My student profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries({
              Name: student.fullName,
              "Roll number": student.rollNumber,
              "Registration number": student.registrationNumber,
              Department: student.departmentName,
              Program: student.programName,
              "Admission batch": String(student.batchYear),
              Status: student.status.toLowerCase(),
              Email: student.email,
              Phone: student.phoneNo,
              "Alternate phone": student.alternatePhoneNo,
              Gender: student.gender,
              "Date of birth": student.dateOfBirth
                ? displayDate(student.dateOfBirth)
                : "",
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium break-words">
                  {value || "Not provided"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs text-muted-foreground">
            Contact your college administrator to correct these details.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Semester progression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.semesters.length ? (
            data.semesters.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    Semester {row.semester} · Batch {row.batchYear}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {displayDate(row.startDate)} – {displayDate(row.endDate)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {lifecycle[row.semesterStatus]}
                  </Badge>
                  <Badge variant="outline">{row.status.toLowerCase()}</Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No semester progression recorded yet. Your subject enrollments are
              shown separately.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
