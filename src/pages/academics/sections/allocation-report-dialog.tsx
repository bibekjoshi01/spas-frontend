import { useMemo, useState } from "react"
import { FileDown, Search } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  type Allocation,
  eligibilityFor,
  semesterLabel,
  useGetClassStudentsQuery,
} from "@/lib/api"
import { exportAllocationPerformancePdf } from "@/lib/pdf-reports"
import { notifier } from "@/lib/utils/notifier"
import { StudentDetailDialog } from "@/pages/roster/student-detail-dialog"

export function AllocationReportDialog({
  allocation,
  onClose,
}: {
  allocation: Allocation
  onClose: () => void
}) {
  const students = useGetClassStudentsQuery(allocation.id)
  const [search, setSearch] = useState("")
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [detailEnrollment, setDetailEnrollment] = useState<number | null>(null)

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (students.data ?? []).filter((row) => {
      if (
        needle &&
        !`${row.fullName} ${row.rollNumber} ${row.registrationNumber} ${row.phoneNo}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false
      }
      return (
        !attentionOnly ||
        isAttention(
          row.performancePercentage,
          row.attendance.percentage,
          row.attendance.held
        )
      )
    })
  }, [attentionOnly, search, students.data])

  const evidenced = (students.data ?? []).filter(
    (row) => row.performancePercentage !== null
  )
  const average = evidenced.length
    ? evidenced.reduce(
        (total, row) => total + (row.performancePercentage ?? 0),
        0
      ) / evidenced.length
    : null
  const attentionCount = (students.data ?? []).filter((row) =>
    isAttention(
      row.performancePercentage,
      row.attendance.percentage,
      row.attendance.held
    )
  ).length

  const exportPdf = async () => {
    try {
      await exportAllocationPerformancePdf(allocation, rows)
    } catch {
      notifier.error("Could not export this subject report.")
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          overlayClassName="z-[80]"
          className="z-[90] h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto sm:max-w-none"
        >
          <DialogHeader className="pr-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle>
                  {allocation.subject.code} — {allocation.subject.name}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {allocation.batchSemester.batch.program.code} · Batch{" "}
                  {allocation.batchSemester.batch.year} ·{" "}
                  {semesterLabel(allocation.batchSemester.semester)} ·{" "}
                  {allocation.teacher.fullName}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!rows.length}
                onClick={() => void exportPdf()}
              >
                <FileDown className="size-4" aria-hidden />
                Export PDF
              </Button>
            </div>
          </DialogHeader>

          <QueryState
            isLoading={students.isLoading}
            error={students.error}
            onRetry={students.refetch}
            skeleton="table"
          >
            <div className="space-y-3">
              <div className="grid border sm:grid-cols-3">
                <Metric
                  label="Enrolled students"
                  value={students.data?.length ?? 0}
                />
                <Metric label="Need attention" value={attentionCount} danger />
                <Metric
                  label="Average performance"
                  value={average === null ? "—" : `${average.toFixed(1)}%`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border bg-muted/30 p-2">
                <div className="relative w-full sm:w-80">
                  <Search
                    className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search student, roll or phone"
                    className="pl-8"
                  />
                </div>
                <Button
                  variant={attentionOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAttentionOnly((value) => !value)}
                >
                  {attentionOnly
                    ? "Showing attention only"
                    : "Show attention only"}
                </Button>
              </div>

              <div className="overflow-x-auto border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-200 dark:bg-slate-800">
                      <TableHead>#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Assignments</TableHead>
                      <TableHead>Class performance</TableHead>
                      <TableHead>Overall</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={row.enrollment}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <button
                            className="text-left"
                            onClick={() => setDetailEnrollment(row.enrollment)}
                          >
                            <span className="block font-semibold hover:underline">
                              {row.fullName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Roll {row.rollNumber}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.phoneNo || "—"}
                          <br />
                          {row.email || "—"}
                        </TableCell>
                        <TableCell className="min-w-44">
                          <AttendanceMeter
                            percentage={row.attendance.percentage}
                          />
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {row.internalMarks.total
                            ? `${row.internalMarks.obtained}/${row.internalMarks.total}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {row.assignments.total
                            ? `${row.assignments.done}/${row.assignments.total}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {row.classPerformance.score === null
                            ? "—"
                            : `${row.classPerformance.score}/10`}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-bold tabular-nums">
                            {row.performancePercentage === null
                              ? "—"
                              : `${row.performancePercentage}%`}
                          </div>
                          {isAttention(
                            row.performancePercentage,
                            row.attendance.percentage,
                            row.attendance.held
                          ) && (
                            <Badge variant="destructive" className="mt-1">
                              Needs attention
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!rows.length && !students.isLoading && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No students match this view.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </QueryState>
        </DialogContent>
      </Dialog>

      {detailEnrollment !== null && (
        <StudentDetailDialog
          allocation={allocation.id}
          enrollment={detailEnrollment}
          onClose={() => setDetailEnrollment(null)}
        />
      )}
    </>
  )
}

function Metric({
  label,
  value,
  danger,
}: {
  label: string
  value: string | number
  danger?: boolean
}) {
  return (
    <div
      className={
        danger
          ? "border-b border-l-4 border-l-red-500 p-3 sm:border-r"
          : "border-b p-3 sm:border-r"
      }
    >
      <div className="text-xs font-bold text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function isAttention(
  performance: number | null,
  attendance: number,
  classesHeld: number
) {
  return (
    (classesHeld > 0 && attendance < 75) ||
    (performance !== null && eligibilityFor(performance) === "at-risk")
  )
}
