import { lazy, Suspense, useMemo, useState } from "react"
import { FileDown, Search } from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { InlineSpinner, QueryState } from "@/components/query-state"
import { ReportDialogFallback } from "@/components/report-dialog-fallback"
import { StudentNameSortButton } from "@/components/student-name-sort"
import {
  sortStudentsByName,
  type StudentNameSortDirection,
} from "@/lib/utils/student-sort"
import {
  ClassReportSkeleton,
  SubjectRecordSkeleton,
} from "@/components/skeletons"
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
import { useEligibilityThreshold } from "@/hooks/use-eligibility-threshold"
import { exportAllocationPerformancePdf } from "@/lib/pdf-reports"
import { formatPercentage } from "@/lib/utils"
import { notifier } from "@/lib/utils/notifier"

// The per-student drill-down is a screen in its own right, so it downloads
// when a name is clicked rather than riding along with this report.
const StudentDetailDialog = lazy(async () => ({
  default: (await import("@/pages/roster/student-detail-dialog"))
    .StudentDetailDialog,
}))

export function AllocationReportDialog({
  allocation,
  onClose,
}: {
  allocation: Allocation
  onClose: () => void
}) {
  const students = useGetClassStudentsQuery(allocation.id)
  const threshold = useEligibilityThreshold()
  const [search, setSearch] = useState("")
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [nameSort, setNameSort] = useState<StudentNameSortDirection>("default")
  const [detailEnrollment, setDetailEnrollment] = useState<number | null>(null)
  // Drawing a roster-sized PDF outlasts the click, so the button reports its own
  // progress rather than only greying out.
  const [exporting, setExporting] = useState(false)

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = (students.data ?? []).filter((row) => {
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
          row.attendance.held,
          threshold
        )
      )
    })
    return sortStudentsByName(filtered, nameSort)
  }, [attentionOnly, nameSort, search, students.data, threshold])

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
      row.attendance.held,
      threshold
    )
  ).length

  const exportPdf = async () => {
    setExporting(true)
    try {
      await exportAllocationPerformancePdf(allocation, rows, threshold)
    } catch {
      notifier.error("Could not export this subject report.")
    } finally {
      setExporting(false)
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
                disabled={!rows.length || exporting}
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
            isLoading={students.isLoading}
            isFetching={students.isFetching && !students.isLoading}
            error={students.error}
            onRetry={students.refetch}
            skeleton={<ClassReportSkeleton />}
          >
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Enrolled students"
                  value={students.data?.length ?? 0}
                />
                <Metric label="Need attention" value={attentionCount} danger />
                <Metric
                  label="Average performance"
                  value={formatPercentage(average)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border bg-card p-2">
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
                    <TableRow className="bg-table-header">
                      <TableHead>#</TableHead>
                      <TableHead>
                        <StudentNameSortButton
                          direction={nameSort}
                          onChange={setNameSort}
                        />
                      </TableHead>
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
                              : formatPercentage(row.performancePercentage)}
                          </div>
                          {isAttention(
                            row.performancePercentage,
                            row.attendance.percentage,
                            row.attendance.held,
                            threshold
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
        <Suspense
          fallback={
            <ReportDialogFallback
              title="Loading student record…"
              description="Fetching this student's record for the subject."
              overlayClassName="z-[90]"
              className="z-[100]"
              onClose={() => setDetailEnrollment(null)}
            >
              <SubjectRecordSkeleton />
            </ReportDialogFallback>
          }
        >
          <StudentDetailDialog
            allocation={allocation.id}
            enrollment={detailEnrollment}
            onClose={() => setDetailEnrollment(null)}
          />
        </Suspense>
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
          ? "border border-l-4 border-l-red-500 bg-card p-3"
          : "border bg-card p-3"
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
  classesHeld: number,
  threshold: number
) {
  return (
    (classesHeld > 0 && attendance < threshold) ||
    (performance !== null &&
      eligibilityFor(performance, threshold) === "at-risk")
  )
}
