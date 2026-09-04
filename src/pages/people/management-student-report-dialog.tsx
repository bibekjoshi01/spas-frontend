import { useMemo, useState } from "react"
import {
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Star,
} from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { QueryState } from "@/components/query-state"
import { StudentReportSkeleton } from "@/components/skeletons"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ASSIGNMENT_LABELS,
  EXAM_TYPE_LABELS,
  type ManagementStudentReport,
  type SemesterStatus,
  useGetManagementStudentReportQuery,
} from "@/lib/api"
import { exportManagementStudentReportPdf } from "@/lib/pdf-reports"
import { ExportMenu } from "@/components/export-menu"
import { exportSpreadsheet, type ExportFormat } from "@/lib/spreadsheet-export"
import { managementStudentExportTable } from "@/lib/spreadsheet-reports"
import { formatPercentage } from "@/lib/utils"
import { formatDisplayDate } from "@/lib/utils/date"
import { notifier } from "@/lib/utils/notifier"

type SubjectReport = ManagementStudentReport["subjects"][number]

interface SemesterGroup {
  semester: number
  status: SemesterStatus
  subjects: SubjectReport[]
}

export function ManagementStudentReportDialog({
  studentId,
  onClose,
}: {
  studentId: number
  onClose: () => void
}) {
  const report = useGetManagementStudentReportQuery(studentId)
  const data = report.data
  // The full record is a slow read and the PDF is drawn from it, so the button
  // reports its own progress rather than only greying out.
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [selection, setSelection] = useState<{
    studentId: number
    semester: number
  } | null>(null)
  const selectedSemester =
    selection?.studentId === studentId ? selection.semester : null
  const semesters = useMemo(() => groupBySemester(data?.subjects ?? []), [data])
  const defaultSemester =
    semesters.find((group) => group.status === "RUNNING") ??
    semesters.filter((group) => group.status === "COMPLETED").at(-1) ??
    semesters.at(-1)
  const activeSemester = semesters.some(
    (group) => group.semester === selectedSemester
  )
    ? selectedSemester
    : (defaultSemester?.semester ?? null)
  const semester = semesters.find((group) => group.semester === activeSemester)

  const exportReport = async (format: ExportFormat) => {
    if (!data) return
    setExporting(format)
    try {
      if (format === "pdf") await exportManagementStudentReportPdf(data)
      else await exportSpreadsheet(format, managementStudentExportTable(data))
    } catch {
      notifier.error("Could not export this student report.")
    } finally {
      setExporting(null)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        overlayClassName="z-[90]"
        className="z-[100] h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto sm:max-w-none"
      >
        <DialogHeader className="pr-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle>
                {data?.student.fullName ?? "Student report"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {data
                  ? `${data.student.programCode} · Batch ${data.student.batchYear} · Roll ${data.student.rollNumber}`
                  : "Loading the complete academic performance record…"}
              </DialogDescription>
            </div>
            <ExportMenu
              exporting={exporting}
              disabled={!data}
              label="Export full report"
              onExport={(format) => void exportReport(format)}
            />
          </div>
        </DialogHeader>

        <QueryState
          isLoading={report.isLoading}
          isFetching={report.isFetching && !report.isLoading}
          error={report.error}
          isEmpty={!data}
          onRetry={report.refetch}
          skeleton={<StudentReportSkeleton />}
          emptyTitle="Student report unavailable"
          emptyMessage="This student is outside your management scope or has no accessible record."
        >
          {data && (
            <div className="space-y-4">
              {semesters.length > 0 && (
                <SemesterTabs
                  groups={semesters}
                  activeSemester={activeSemester}
                  onSelect={(selected) =>
                    setSelection({ studentId, semester: selected })
                  }
                />
              )}

              <section className="border bg-card">
                <div className="border-b bg-band-info px-3 py-2.5">
                  <h3 className="font-semibold text-band-info-foreground">
                    Student profile
                  </h3>
                  <p className="text-xs text-band-info-foreground/70">
                    Identity, contact and academic placement.
                  </p>
                </div>
                <dl className="grid gap-x-8 gap-y-3 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Roll number" value={data.student.rollNumber} />
                  <Detail
                    label="Registration"
                    value={data.student.registrationNumber}
                  />
                  <Detail label="Program" value={data.student.programName} />
                  <Detail
                    label="Department"
                    value={data.student.departmentName}
                  />
                  <Detail
                    label="Admission batch"
                    value={String(data.student.batchYear)}
                  />
                  <Detail
                    label="Student status"
                    value={displayStatus(data.student.status)}
                  />
                  <Detail label="Email" value={data.student.email} />
                  <Detail label="Primary phone" value={data.student.phoneNo} />
                  <Detail
                    label="Alternate phone"
                    value={data.student.alternatePhoneNo}
                  />
                  <Detail
                    label="Academic record"
                    value={`${semesters.length} semesters · ${data.subjects.length} subjects`}
                  />
                </dl>
              </section>

              {semester ? (
                <SemesterReport group={semester} />
              ) : (
                <p className="border bg-card p-6 text-center text-sm text-muted-foreground">
                  No subject records have been created for this student.
                </p>
              )}
            </div>
          )}
        </QueryState>
      </DialogContent>
    </Dialog>
  )
}

function SemesterTabs({
  groups,
  activeSemester,
  onSelect,
}: {
  groups: SemesterGroup[]
  activeSemester: number | null
  onSelect: (semester: number) => void
}) {
  return (
    <section className="border bg-card" aria-label="Semester selection">
      <div className="border-b bg-band px-3 py-2.5">
        <h3 className="font-semibold">Semester history</h3>
        <p className="text-xs text-muted-foreground">
          Select a semester to view only its subjects and records.
        </p>
      </div>
      <div className="overflow-x-auto p-2">
        <div
          className="flex min-w-max gap-2"
          role="tablist"
          aria-label="Student semesters"
        >
          {groups.map((group) => {
            const selected = group.semester === activeSemester
            return (
              <button
                key={group.semester}
                id={`semester-tab-${group.semester}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`semester-panel-${group.semester}`}
                onClick={() => onSelect(group.semester)}
                className={
                  selected
                    ? "min-w-36 border border-primary bg-band-info px-3 py-2 text-left text-band-info-foreground"
                    : "min-w-36 border bg-card px-3 py-2 text-left hover:bg-accent"
                }
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    Semester {group.semester}
                  </span>
                  <StatusBadge status={group.status} compact />
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {group.subjects.length}{" "}
                  {group.subjects.length === 1 ? "subject" : "subjects"}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SemesterReport({ group }: { group: SemesterGroup }) {
  const summary = summarizeSemester(group.subjects)

  return (
    <div
      id={`semester-panel-${group.semester}`}
      role="tabpanel"
      aria-labelledby={`semester-tab-${group.semester}`}
      className="space-y-3"
    >
      <section className="border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-band-accent px-3 py-2.5">
          <div>
            <h3 className="font-semibold text-band-accent-foreground">
              Semester {group.semester} overview
            </h3>
            <p className="text-xs text-band-accent-foreground/70">
              Evidence across {group.subjects.length}{" "}
              {group.subjects.length === 1 ? "subject" : "subjects"}.
            </p>
          </div>
          <StatusBadge status={group.status} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5">
          <SummaryMetric
            icon={BookOpen}
            label="Subjects"
            value={group.subjects.length}
          />
          <SummaryMetric
            icon={CalendarCheck}
            label="Average attendance"
            value={
              summary.attendancePercentage === null
                ? "—"
                : formatPercentage(summary.attendancePercentage)
            }
          />
          <SummaryMetric
            icon={ClipboardList}
            label="Assessment results"
            value={`${summary.assessmentsRecorded}/${summary.assessments}`}
          />
          <SummaryMetric
            icon={ClipboardCheck}
            label="Assignment results"
            value={`${summary.assignmentsRecorded}/${summary.assignments}`}
          />
          <SummaryMetric
            icon={Star}
            label="Subjects rated"
            value={`${summary.subjectsRated}/${group.subjects.length}`}
          />
        </div>
      </section>

      <div className="space-y-3">
        {group.subjects.map((subject, index) => (
          <SubjectReportCard
            key={subject.enrollment}
            subject={subject}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </div>
  )
}

function SubjectReportCard({
  subject,
  defaultOpen,
}: {
  subject: SubjectReport
  defaultOpen: boolean
}) {
  const assessmentResults = subject.assessments.filter(
    (exam) => exam.isAbsent || exam.marksObtained !== null
  ).length
  const assignmentResults = subject.assignments.filter(
    (assignment) => assignment.status !== null
  ).length

  return (
    <details open={defaultOpen} className="border bg-card">
      <summary className="cursor-pointer list-none bg-band p-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold">
              {subject.class.code} — {subject.class.name}
            </div>
            <div className="text-xs text-muted-foreground">
              Taught by {subject.class.teacher.fullName}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {subject.attendance && (
              <span className="w-40">
                <AttendanceMeter percentage={subject.attendance.percentage} />
              </span>
            )}
            <Badge variant="outline" className="bg-card">
              Assessments {assessmentResults}/{subject.assessments.length}
            </Badge>
            <Badge variant="outline" className="bg-card">
              Assignments {assignmentResults}/{subject.assignments.length}
            </Badge>
            <Badge variant="outline" className="bg-card">
              Rating {subject.classPerformance?.score ?? "—"}/10
            </Badge>
          </div>
        </div>
      </summary>

      <div className="space-y-4 p-3">
        <section>
          <h4 className="mb-2 text-sm font-semibold">Attendance</h4>
          {subject.attendance ? (
            <div className="grid border bg-card sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Present" value={subject.attendance.present} />
              <Metric label="Absent" value={subject.attendance.absent} />
              <Metric label="Excused" value={subject.attendance.excused} />
              <Metric label="Late" value={subject.attendance.late} />
              <Metric label="Sessions" value={subject.attendance.held} />
              <Metric
                label="Attendance"
                value={formatPercentage(subject.attendance.percentage)}
              />
            </div>
          ) : (
            <p className="border bg-card p-3 text-sm text-muted-foreground">
              No attendance record for this subject.
            </p>
          )}
        </section>

        <ReportTable
          title="Assessments"
          headers={["Assessment", "Type", "Date", "Marks", "Result"]}
          rows={subject.assessments.map((exam) => {
            const obtained =
              exam.marksObtained === null ? null : Number(exam.marksObtained)
            return [
              exam.title,
              EXAM_TYPE_LABELS[exam.examType],
              exam.examDate ? formatDisplayDate(exam.examDate) : "—",
              exam.isAbsent
                ? "Absent"
                : obtained === null
                  ? "—"
                  : `${obtained}/${exam.fullMarks}`,
              assessmentResult(exam),
            ]
          })}
        />

        <ReportTable
          title="Assignments"
          headers={["Assignment", "Assigned", "Due", "Status", "Remarks"]}
          rows={subject.assignments.map((assignment) => [
            assignment.title,
            formatDisplayDate(assignment.assignedDate),
            assignment.dueDate ? formatDisplayDate(assignment.dueDate) : "—",
            assignment.status
              ? ASSIGNMENT_LABELS[assignment.status]
              : "Not marked",
            assignment.remarks || "—",
          ])}
        />

        <section>
          <h4 className="mb-2 text-sm font-semibold">Class performance</h4>
          <div className="grid border bg-card text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
            <div className="border-b p-3 sm:border-r sm:border-b-0">
              <div className="text-xs text-muted-foreground">Rating</div>
              <div className="mt-1 text-xl font-bold tabular-nums">
                {subject.classPerformance?.score ?? "—"}/10
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground">
                Teacher remarks
              </div>
              <p className="mt-1 leading-5">
                {subject.classPerformance?.remarks || "No remarks recorded."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </details>
  )
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen
  label: string
  value: string | number
}) {
  return (
    <div className="border-b p-3 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function StatusBadge({
  status,
  compact = false,
}: {
  status: SemesterStatus
  compact?: boolean
}) {
  return (
    <Badge
      variant={status === "RUNNING" ? "default" : "outline"}
      className={`${compact ? "px-1.5 py-0 text-[10px]" : ""} ${
        status === "RUNNING" ? "bg-emerald-600 hover:bg-emerald-600" : "bg-card"
      }`}
    >
      {status.toLowerCase()}
    </Badge>
  )
}

function groupBySemester(subjects: SubjectReport[]): SemesterGroup[] {
  const groups = new Map<number, SubjectReport[]>()
  subjects.forEach((subject) => {
    const current = groups.get(subject.semester) ?? []
    current.push(subject)
    groups.set(subject.semester, current)
  })

  return Array.from(groups, ([semester, semesterSubjects]) => ({
    semester,
    status: semesterStatus(semesterSubjects),
    subjects: [...semesterSubjects].sort((left, right) =>
      left.class.code.localeCompare(right.class.code)
    ),
  })).sort((left, right) => left.semester - right.semester)
}

function semesterStatus(subjects: SubjectReport[]): SemesterStatus {
  if (subjects.some((subject) => subject.semesterStatus === "RUNNING")) {
    return "RUNNING"
  }
  if (subjects.some((subject) => subject.semesterStatus === "UPCOMING")) {
    return "UPCOMING"
  }
  return "COMPLETED"
}

function summarizeSemester(subjects: SubjectReport[]) {
  const attendance = subjects
    .map((subject) => subject.attendance)
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
  const held = attendance.reduce((sum, record) => sum + record.held, 0)
  const weightedAttendance = attendance.reduce(
    (sum, record) => sum + record.percentage * record.held,
    0
  )
  const assessments = subjects.flatMap((subject) => subject.assessments)
  const assignments = subjects.flatMap((subject) => subject.assignments)

  return {
    attendancePercentage:
      held > 0 ? Math.round((weightedAttendance / held) * 10) / 10 : null,
    assessments: assessments.length,
    assessmentsRecorded: assessments.filter(
      (exam) => exam.isAbsent || exam.marksObtained !== null
    ).length,
    assignments: assignments.length,
    assignmentsRecorded: assignments.filter(
      (assignment) => assignment.status !== null
    ).length,
    subjectsRated: subjects.filter(
      (subject) => subject.classPerformance !== null
    ).length,
  }
}

function assessmentResult(exam: SubjectReport["assessments"][number]): string {
  if (exam.isAbsent) return "Absent"
  if (exam.marksObtained === null) return "Not marked"
  if (exam.passMarks === null) return "Pass mark unavailable"
  return Number(exam.marksObtained) >= exam.passMarks ? "Passed" : "Failed"
}

function displayStatus(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-b p-3 last:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string
  headers: string[]
  rows: Array<Array<string | number>>
}) {
  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="overflow-x-auto border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={headers.length}
                  className="text-center text-muted-foreground"
                >
                  No records.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
