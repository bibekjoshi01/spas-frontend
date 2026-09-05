import { lazy, Suspense, useMemo, useState } from "react"
import { Search, X } from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { ExportMenu } from "@/components/export-menu"
import { QueryState } from "@/components/query-state"
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
import { exportSpreadsheet, type ExportFormat } from "@/lib/spreadsheet-export"
import { allocationExportTable } from "@/lib/spreadsheet-reports"
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
  const [exporting, setExporting] = useState<ExportFormat | null>(null)

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

  const exportReport = async (format: ExportFormat) => {
    setExporting(format)
    try {
      if (format === "pdf") {
        await exportAllocationPerformancePdf(allocation, rows, threshold)
      } else {
        await exportSpreadsheet(
          format,
          allocationExportTable(allocation, rows, threshold)
        )
      }
    } catch {
      notifier.error("Could not export this subject report.")
    } finally {
      setExporting(null)
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          overlayClassName="z-[80]"
          className="z-[90] flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl sm:p-0"
        >
          <DialogHeader className="shrink-0 border-b bg-muted/20 p-4 pr-12 sm:p-5 sm:pr-12">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="truncate text-base sm:text-lg">
                  {allocation.subject.code} — {allocation.subject.name}
                </DialogTitle>
                <DialogDescription className="mt-1 truncate text-xs sm:text-sm">
                  {allocation.batchSemester.batch.program.code} · Batch{" "}
                  {allocation.batchSemester.batch.year} ·{" "}
                  {semesterLabel(allocation.batchSemester.semester)} ·{" "}
                  {allocation.teacher.fullName}
                </DialogDescription>
              </div>
              <ExportMenu
                exporting={exporting}
                disabled={!rows.length}
                onExport={(format) => void exportReport(format)}
              />
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
            <QueryState
              isLoading={students.isLoading}
              isFetching={students.isFetching && !students.isLoading}
              error={students.error}
              onRetry={students.refetch}
              skeleton={<ClassReportSkeleton />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                  <Metric
                    label="Enrolled students"
                    value={students.data?.length ?? 0}
                  />
                  <Metric
                    label="Need attention"
                    value={attentionCount}
                    danger
                  />
                  <Metric
                    label="Average performance"
                    value={formatPercentage(average)}
                  />
                </div>

                <div className="flex flex-col gap-2 border bg-card p-2 sm:flex-row sm:items-center">
                  <div
                    className="order-1 flex min-w-0 gap-1 overflow-x-auto"
                    aria-label="Filter students by attention status"
                  >
                    <button
                      type="button"
                      aria-pressed={!attentionOnly}
                      onClick={() => setAttentionOnly(false)}
                      className={`flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        !attentionOnly
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All
                      <span className="text-xs tabular-nums">
                        {students.data?.length ?? 0}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={attentionOnly}
                      onClick={() => setAttentionOnly(true)}
                      className={`flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        attentionOnly
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Needs attention
                      <span className="text-xs tabular-nums">
                        {attentionCount}
                      </span>
                    </button>
                  </div>
                  <div className="order-2 flex justify-end sm:ml-auto">
                    <div className="relative w-full sm:w-64 lg:w-72">
                      <Search
                        className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search student, roll or phone"
                        className="bg-background pr-9 pl-8"
                        aria-label="Search students"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label="Clear report search"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border">
                  <Table className="min-w-[48rem]">
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
                        <TableHead>Performance evidence</TableHead>
                        <TableHead>Overall</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={row.enrollment}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <button
                              className="min-h-10 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                              onClick={() =>
                                setDetailEnrollment(row.enrollment)
                              }
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
                          <TableCell>
                            <dl className="grid min-w-44 grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
                              <dt className="text-muted-foreground">
                                Assessment
                              </dt>
                              <dd className="font-medium tabular-nums">
                                {row.internalMarks.total
                                  ? `${row.internalMarks.obtained}/${row.internalMarks.total}`
                                  : "—"}
                              </dd>
                              <dt className="text-muted-foreground">
                                Assignments
                              </dt>
                              <dd className="font-medium tabular-nums">
                                {row.assignments.total
                                  ? `${row.assignments.done}/${row.assignments.total}`
                                  : "—"}
                              </dd>
                              <dt className="text-muted-foreground">Rating</dt>
                              <dd className="font-medium tabular-nums">
                                {row.classPerformance.score === null
                                  ? "—"
                                  : `${row.classPerformance.score}/10`}
                              </dd>
                            </dl>
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
                            colSpan={6}
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
          </div>
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
