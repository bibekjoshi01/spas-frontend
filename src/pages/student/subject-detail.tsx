import { useState } from "react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  useGetStudentPortalAttendanceQuery,
  useGetStudentPortalSubjectQuery,
} from "@/lib/api"
import { formatPercentage } from "@/lib/utils"

import { displayDate } from "./format"

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

export function StudentSubjectDialog({
  enrollment,
  threshold,
  onClose,
}: {
  enrollment: number
  threshold: number
  onClose: () => void
}) {
  const query = useGetStudentPortalSubjectQuery(enrollment)
  const data = query.data
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {data
              ? `${data.class.code} · ${data.class.name}`
              : "My subject record"}
          </DialogTitle>
          <DialogDescription>
            Your marks, assignments and attendance for this subject.
          </DialogDescription>
        </DialogHeader>
        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
        >
          {data && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Semester {data.semester} · {data.semesterStatus.toLowerCase()}
                </Badge>
                <Badge variant="outline">
                  {data.class.creditHours} credits
                </Badge>
                {data.isRetake && <Badge variant="outline">Retake</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Teacher: {data.class.teacher.fullName || "Name unavailable"} ·
                Progress:{" "}
                {formatPercentage(data.performancePercentage, "Not recorded")}
              </p>
              <Card>
                <CardHeader>
                  <CardTitle>Class schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    Semester dates: {displayDate(data.class.semesterStartDate)}{" "}
                    – {displayDate(data.class.semesterEndDate)}
                  </p>
                  {data.class.meetings.length ? (
                    data.class.meetings.map((meeting, index) => (
                      <p key={index}>
                        {weekdays[meeting.weekday - 1]} ·{" "}
                        {meeting.startTime?.slice(0, 5) ?? "Time not set"} –{" "}
                        {meeting.endTime?.slice(0, 5) ?? "Time not set"}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      {data.class.startTime
                        ? `${data.class.startTime.slice(0, 5)} – ${data.class.endTime?.slice(0, 5) ?? "End not set"} · Days not set`
                        : "Timetable not set yet."}
                    </p>
                  )}
                </CardContent>
              </Card>
              <section className="space-y-3">
                <h2 className="font-semibold">My assessment marks</h2>
                {data.assessments.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Full marks</TableHead>
                        <TableHead>Pass marks</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.assessments.map((exam) => (
                        <TableRow key={exam.examId}>
                          <TableCell className="min-w-40 whitespace-normal">
                            <p className="font-medium">{exam.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {EXAM_TYPE_LABELS[exam.examType]}
                            </p>
                          </TableCell>
                          <TableCell>{displayDate(exam.examDate)}</TableCell>
                          <TableCell>
                            {exam.isAbsent
                              ? "Absent"
                              : exam.marksObtained === null
                                ? "Not recorded"
                                : `${exam.marksObtained} / ${exam.fullMarks}`}
                          </TableCell>
                          <TableCell>{exam.fullMarks}</TableCell>
                          <TableCell>{exam.passMarks ?? "Not set"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                exam.result === "FAIL" ||
                                exam.result === "ABSENT"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {exam.result === "NOT_RECORDED"
                                ? "Not recorded"
                                : exam.result.toLowerCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No assessments published.
                  </p>
                )}
              </section>
              <section className="space-y-3">
                <h2 className="font-semibold">My assignments</h2>
                {data.assignments.length ? (
                  data.assignments.map((item) => (
                    <Card key={item.assignmentId}>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-medium">{item.title}</h3>
                          <Badge variant="secondary">
                            {item.status
                              ? ASSIGNMENT_LABELS[item.status]
                              : "Not recorded"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Assigned {displayDate(item.assignedDate)} · Due{" "}
                          {displayDate(item.dueDate)}
                        </p>
                        {item.remarks && (
                          <p className="text-sm whitespace-pre-wrap">
                            Teacher feedback: {item.remarks}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No assignments published.
                  </p>
                )}
              </section>
              <Card>
                <CardHeader>
                  <CardTitle>Class performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.classPerformance ? (
                    <>
                      <p className="font-medium">
                        {data.classPerformance.score} / 10
                      </p>
                      {data.classPerformance.remarks && (
                        <p className="text-sm whitespace-pre-wrap">
                          {data.classPerformance.remarks}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Last updated{" "}
                        {displayDate(
                          data.classPerformance.updatedAt.slice(0, 10)
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not rated yet.
                    </p>
                  )}
                </CardContent>
              </Card>
              <section className="space-y-3">
                <h2 className="font-semibold">My attendance</h2>
                {data.attendance.percentage === null ? (
                  <p className="text-sm text-muted-foreground">
                    No classes recorded yet.
                  </p>
                ) : (
                  <AttendanceMeter
                    percentage={data.attendance.percentage}
                    threshold={threshold}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {data.attendance.held} held · {data.attendance.present}{" "}
                  present · {data.attendance.late} late ·{" "}
                  {data.attendance.absent} absent · {data.attendance.excused}{" "}
                  excused · {data.attendance.unmarked} unmarked
                </p>
                <p className="text-xs text-muted-foreground">
                  Unmarked means your teacher has not recorded your attendance
                  for a held class.
                </p>
                <AttendanceHistory enrollment={enrollment} />
              </section>
            </div>
          )}
        </QueryState>
      </DialogContent>
    </Dialog>
  )
}

function AttendanceHistory({ enrollment }: { enrollment: number }) {
  const [offset, setOffset] = useState(0)
  const query = useGetStudentPortalAttendanceQuery({ enrollment, offset })
  // currentData prevents a previous page's records appearing under a new page number.
  const data = query.currentData
  return (
    <QueryState
      isLoading={query.isFetching && !data}
      error={query.error}
      onRetry={query.refetch}
      isEmpty={data?.count === 0}
      emptyTitle="No attendance history"
      emptyMessage="Held classes will appear here after your teacher records attendance."
      skeleton="table"
    >
      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>My status</TableHead>
                <TableHead>Excuse reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{displayDate(row.date)}</TableCell>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>
                    {row.status?.toLowerCase() ?? "Unmarked"}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {row.excuseReason || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {offset + 1}–{Math.min(offset + 10, data.count)} of {data.count}{" "}
              classes
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || query.isFetching}
                onClick={() => setOffset((value) => Math.max(0, value - 10))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.next || query.isFetching}
                onClick={() => setOffset((value) => value + 10)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </QueryState>
  )
}
