import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
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
import { InlineSpinner, QueryState } from "@/components/query-state"
import { SubjectRecordSkeleton } from "@/components/skeletons"
import {
  ASSIGNMENT_LABELS,
  EXAM_TYPE_LABELS,
  useGetClassStudentDetailQuery,
} from "@/lib/api"
import { exportStudentDetailPdf } from "@/lib/pdf-reports"
import { formatPercentage } from "@/lib/utils"
import { notifier } from "@/lib/utils/notifier"

export function StudentDetailDialog({
  allocation,
  enrollment,
  onClose,
}: {
  allocation: number
  enrollment: number
  onClose: () => void
}) {
  const detail = useGetClassStudentDetailQuery({ allocation, enrollment })
  const data = detail.data
  // Drawing the PDF outlasts the fetch it is drawn from, so the button reports
  // its own progress rather than only greying out.
  const [exporting, setExporting] = useState(false)

  const exportPdf = async () => {
    if (!data) return
    setExporting(true)
    try {
      await exportStudentDetailPdf(data)
    } catch {
      notifier.error("Could not export this student record.")
    } finally {
      setExporting(false)
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
                {data?.student.fullName ?? "Student details"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {data
                  ? `${data.class.code} — ${data.class.name} · Roll ${data.student.rollNumber}`
                  : "Loading this student's subject record…"}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || exporting}
              onClick={() => void exportPdf()}
            >
              {exporting ? (
                <InlineSpinner />
              ) : (
                <FileDown className="size-4" aria-hidden />
              )}
              {exporting ? "Preparing PDF…" : "Export PDF"}
            </Button>
          </div>
        </DialogHeader>

        <QueryState
          isLoading={detail.isLoading}
          isFetching={detail.isFetching && !detail.isLoading}
          error={detail.error}
          isEmpty={!data}
          onRetry={detail.refetch}
          skeleton={<SubjectRecordSkeleton />}
          emptyTitle="Student record unavailable"
          emptyMessage="This student may no longer be enrolled in the selected class."
        >
          {data && (
            <div className="space-y-5">
              <section className="border bg-white p-3 dark:bg-slate-950">
                <h3 className="mb-2 font-semibold">Student and contact</h3>
                <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
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
                </dl>
              </section>

              <section>
                <SectionTitle
                  title="Attendance"
                  count={data.attendance?.held ?? 0}
                />
                {data.attendance ? (
                  <div className="grid border bg-white sm:grid-cols-3 lg:grid-cols-6 dark:bg-slate-950">
                    <Metric label="Present" value={data.attendance.present} />
                    <Metric label="Absent" value={data.attendance.absent} />
                    <Metric label="Excused" value={data.attendance.excused} />
                    <Metric label="Late" value={data.attendance.late} />
                    <Metric label="Sessions" value={data.attendance.held} />
                    <Metric
                      label="Attendance"
                      value={formatPercentage(data.attendance.percentage)}
                    />
                  </div>
                ) : (
                  <p className="border bg-white p-3 text-sm text-muted-foreground dark:bg-slate-950">
                    Attendance summary is unavailable.
                  </p>
                )}
              </section>

              <section>
                <SectionTitle
                  title="Assessments"
                  count={data.assessments.length}
                />
                <DetailTable
                  headers={["Assessment", "Type", "Date", "Marks", "Result"]}
                  empty="No assessments created for this subject."
                  rows={data.assessments.map((row) => {
                    const marks = row.isAbsent
                      ? "Absent"
                      : row.marksObtained === null
                        ? "Not marked"
                        : `${row.marksObtained}/${row.fullMarks}`
                    const passed =
                      row.passMarks !== null && row.marksObtained !== null
                        ? Number(row.marksObtained) >= row.passMarks
                          ? "Passed"
                          : "Failed"
                        : "—"
                    return [
                      row.title,
                      EXAM_TYPE_LABELS[row.examType],
                      row.examDate ?? "—",
                      marks,
                      passed,
                    ]
                  })}
                />
              </section>

              <section>
                <SectionTitle
                  title="Assignments"
                  count={data.assignments.length}
                />
                <DetailTable
                  headers={[
                    "Assignment",
                    "Assigned",
                    "Due",
                    "Status",
                    "Remarks",
                  ]}
                  empty="No assignments created for this subject."
                  rows={data.assignments.map((row) => [
                    row.title,
                    row.assignedDate,
                    row.dueDate ?? "—",
                    row.status ? ASSIGNMENT_LABELS[row.status] : "Not marked",
                    row.remarks || "—",
                  ])}
                />
              </section>

              <section>
                <SectionTitle
                  title="Class performance"
                  count={data.classPerformance ? 1 : 0}
                />
                <div className="border bg-white p-3 text-sm dark:bg-slate-950">
                  {data.classPerformance ? (
                    <div className="flex flex-wrap items-start gap-3">
                      <Badge className="text-sm">
                        {data.classPerformance.score}/10
                      </Badge>
                      <p>{data.classPerformance.remarks || "No remarks."}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Not rated yet.</p>
                  )}
                </div>
              </section>
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
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  )
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h3 className="font-semibold">{title}</h3>
      <Badge variant="outline">{count}</Badge>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-b p-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function DetailTable({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: string[][]
  empty: string
}) {
  return (
    <div className="overflow-x-auto border">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800">
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row, index) => (
              <TableRow key={index}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="py-8 text-center text-muted-foreground"
              >
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
