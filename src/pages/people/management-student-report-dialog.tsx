import { FileDown } from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  useGetManagementStudentReportQuery,
} from "@/lib/api"
import { exportManagementStudentReportPdf } from "@/lib/pdf-reports"

export function ManagementStudentReportDialog({
  studentId,
  onClose,
}: {
  studentId: number
  onClose: () => void
}) {
  const report = useGetManagementStudentReportQuery(studentId)
  const data = report.data

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
            <Button
              variant="outline"
              size="sm"
              disabled={!data}
              onClick={() =>
                data && void exportManagementStudentReportPdf(data)
              }
            >
              <FileDown className="size-4" aria-hidden />
              Export PDF
            </Button>
          </div>
        </DialogHeader>

        <QueryState
          isLoading={report.isLoading}
          error={report.error}
          isEmpty={!data}
          onRetry={report.refetch}
          skeleton="table"
          emptyTitle="Student report unavailable"
          emptyMessage="This student is outside your management scope or has no accessible record."
        >
          {data && (
            <div className="space-y-4">
              <section className="border bg-muted/30 p-3">
                <h3 className="mb-2 font-semibold">Student and contact</h3>
                <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Program" value={data.student.programName} />
                  <Detail
                    label="Department"
                    value={data.student.departmentName}
                  />
                  <Detail
                    label="Registration"
                    value={data.student.registrationNumber}
                  />
                  <Detail label="Email" value={data.student.email} />
                  <Detail label="Primary phone" value={data.student.phoneNo} />
                  <Detail
                    label="Alternate phone"
                    value={data.student.alternatePhoneNo}
                  />
                  <Detail
                    label="Standing"
                    value={data.student.status.replaceAll("_", " ")}
                  />
                  <Detail
                    label="Subjects recorded"
                    value={String(data.subjects.length)}
                  />
                </dl>
              </section>

              <div className="space-y-3">
                {data.subjects.map((subject) => (
                  <details
                    key={subject.enrollment}
                    open={subject.semesterStatus === "RUNNING"}
                    className="border bg-background"
                  >
                    <summary className="cursor-pointer list-none bg-slate-100 p-3 dark:bg-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            {subject.class.code} — {subject.class.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Semester {subject.semester} ·{" "}
                            {subject.class.teacher.fullName}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {subject.attendance && (
                            <span className="w-40">
                              <AttendanceMeter
                                percentage={subject.attendance.percentage}
                              />
                            </span>
                          )}
                          <Badge variant="outline">
                            {subject.semesterStatus}
                          </Badge>
                        </div>
                      </div>
                    </summary>

                    <div className="space-y-4 p-3">
                      <section>
                        <h4 className="mb-2 text-sm font-semibold">
                          Attendance
                        </h4>
                        {subject.attendance ? (
                          <div className="grid border sm:grid-cols-3 lg:grid-cols-6">
                            <Metric
                              label="Present"
                              value={subject.attendance.present}
                            />
                            <Metric
                              label="Absent"
                              value={subject.attendance.absent}
                            />
                            <Metric
                              label="Excused"
                              value={subject.attendance.excused}
                            />
                            <Metric
                              label="Late"
                              value={subject.attendance.late}
                            />
                            <Metric
                              label="Sessions"
                              value={subject.attendance.held}
                            />
                            <Metric
                              label="Attendance"
                              value={`${subject.attendance.percentage}%`}
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No attendance record.
                          </p>
                        )}
                      </section>

                      <ReportTable
                        title="Assessments"
                        headers={[
                          "Assessment",
                          "Type",
                          "Date",
                          "Marks",
                          "Result",
                        ]}
                        rows={subject.assessments.map((exam) => {
                          const obtained =
                            exam.marksObtained === null
                              ? null
                              : Number(exam.marksObtained)
                          const result = exam.isAbsent
                            ? "Absent"
                            : obtained === null
                              ? "Not marked"
                              : exam.passMarks !== null &&
                                  obtained >= exam.passMarks
                                ? "Passed"
                                : "Failed"
                          return [
                            exam.title,
                            EXAM_TYPE_LABELS[exam.examType],
                            exam.examDate ?? "—",
                            exam.isAbsent
                              ? "Absent"
                              : obtained === null
                                ? "—"
                                : `${obtained}/${exam.fullMarks}`,
                            result,
                          ]
                        })}
                      />

                      <ReportTable
                        title="Assignments"
                        headers={[
                          "Assignment",
                          "Assigned",
                          "Due",
                          "Status",
                          "Remarks",
                        ]}
                        rows={subject.assignments.map((assignment) => [
                          assignment.title,
                          assignment.assignedDate,
                          assignment.dueDate ?? "—",
                          assignment.status
                            ? ASSIGNMENT_LABELS[assignment.status]
                            : "Not marked",
                          assignment.remarks || "—",
                        ])}
                      />

                      <section>
                        <h4 className="mb-2 text-sm font-semibold">
                          Class performance
                        </h4>
                        <p className="border p-3 text-sm">
                          {subject.classPerformance
                            ? `${subject.classPerformance.score}/10 — ${subject.classPerformance.remarks || "No remarks"}`
                            : "Not rated."}
                        </p>
                      </section>
                    </div>
                  </details>
                ))}
                {data.subjects.length === 0 && (
                  <p className="border p-6 text-center text-sm text-muted-foreground">
                    No subject records have been created for this student.
                  </p>
                )}
              </div>
            </div>
          )}
        </QueryState>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value || "—"}</dd>
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
            <TableRow className="bg-muted/70">
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
