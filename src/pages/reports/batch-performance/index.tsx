import { lazy, Suspense, useMemo, useState } from "react"
import { FileDown, Mail } from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { FilterBar } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { InlineSpinner } from "@/components/query-state"
import { ResourceList } from "@/components/resource-list"
import { ReportDialogFallback } from "@/components/report-dialog-fallback"
import { StudentReportSkeleton } from "@/components/skeletons"
import { StudentNameSortButton } from "@/components/student-name-sort"
import {
  studentNameOrdering,
  type StudentNameSortDirection,
} from "@/lib/utils/student-sort"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePagedQuery } from "@/hooks/use-paged-query"
import {
  ALL,
  type BatchSemesterPerformanceRow,
  useGetBatchSemestersQuery,
  useGetBatchSemesterPerformanceReportQuery,
  useGetBatchesQuery,
  useLazyGetBatchSemesterPerformanceReportQuery,
} from "@/lib/api"
import { exportBatchSemesterPerformancePdf } from "@/lib/pdf-reports"
import { formatPercentage } from "@/lib/utils"
import { notifier } from "@/lib/utils/notifier"

// A report is a screen's worth of code and it is opened from a row, so it
// downloads on that click rather than with the list behind it.
const ManagementStudentReportDialog = lazy(async () => ({
  default: (await import("@/pages/people/management-student-report-dialog"))
    .ManagementStudentReportDialog,
}))

export default function BatchPerformanceReportPage() {
  const batches = useGetBatchesQuery(ALL)
  const semesters = useGetBatchSemestersQuery(ALL)
  const [batch, setBatch] = useState("all")
  const [semesterId, setSemesterId] = useState("")
  const [studentId, setStudentId] = useState<number | null>(null)
  const [nameSort, setNameSort] = useState<StudentNameSortDirection>("default")
  const [loadExport] = useLazyGetBatchSemesterPerformanceReportQuery()
  // Covers the render as well as the fetch: pulling every row is only half the
  // wait, and a button that springs back while the PDF is still drawing invites
  // a second click.
  const [exporting, setExporting] = useState(false)
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    attention: "all",
    ordering: "full_name",
  })

  const visibleSemesters = useMemo(
    () =>
      (semesters.data?.results ?? []).filter(
        (row) => batch === "all" || String(row.batch.id) === batch
      ),
    [batch, semesters.data]
  )

  const preferredSemester =
    visibleSemesters.find((row) => row.status === "RUNNING") ??
    visibleSemesters[0]
  const effectiveSemesterId = visibleSemesters.some(
    (row) => String(row.id) === semesterId
  )
    ? semesterId
    : preferredSemester
      ? String(preferredSemester.id)
      : ""

  const report = useGetBatchSemesterPerformanceReportQuery(
    { ...params, batchSemester: Number(effectiveSemesterId) },
    { skip: !effectiveSemesterId }
  )
  // Do not keep rows from the previously selected batch on screen while the
  // newly selected batch-semester is loading.
  const data = report.currentData

  const selectBatch = (value: string) => {
    setBatch(value)
    setSemesterId("")
    setOffset(0)
  }

  const selectSemester = (value: string) => {
    setSemesterId(value)
    setOffset(0)
  }

  const exportPdf = async () => {
    if (!effectiveSemesterId) return
    setExporting(true)
    try {
      const complete = await loadExport({
        batchSemester: Number(effectiveSemesterId),
        limit: 0,
        ordering: filters.ordering,
        ...(filters.attention === "true" ? { attention: true } : {}),
      }).unwrap()
      await exportBatchSemesterPerformancePdf(complete)
    } catch {
      notifier.error("Could not export this batch report.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Batch performance"
        description="Semester-level attendance and performance for every student in your management scope."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary
          label="Students"
          value={data?.summary.students}
          loading={report.isFetching}
        />
        <Summary
          label="With Evidence"
          value={data?.summary.withEvidence}
          loading={report.isFetching}
        />
        <Summary
          label="Need Attention"
          value={data?.summary.needsAttention}
          tone="danger"
          loading={report.isFetching}
        />
        <Summary
          label="Average Performance"
          value={
            data?.summary.averagePerformance === null
              ? "—"
              : data
                ? formatPercentage(data.summary.averagePerformance)
                : undefined
          }
          loading={report.isFetching}
        />
      </div>

      <ResourceList<BatchSemesterPerformanceRow>
        rows={data?.results}
        rowKey={(row) => row.studentId}
        isLoading={report.isLoading}
        isFetching={report.isFetching}
        error={report.error}
        refetch={report.refetch}
        count={data?.count}
        offset={offset}
        onOffsetChange={setOffset}
        search={{
          value: filters.search,
          onChange: (search) => setFilters({ search }),
          placeholder: "Search student, roll or phone",
        }}
        filters={
          <FilterBar
            pageKey="reports.batch-performance"
            filters={[
              {
                id: "batch",
                label: "Batch",
                // Batch and semester name the report rather than narrow it, so
                // neither can be taken off the toolbar.
                pinned: true,
                control: (
                  <Select value={batch} onValueChange={selectBatch}>
                    <SelectTrigger className="w-52" aria-label="Select batch">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All authorized batches
                      </SelectItem>
                      {batches.data?.results.map((row) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.program.code} · Batch {row.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
              {
                id: "semester",
                label: "Semester",
                pinned: true,
                control: (
                  <Select
                    value={effectiveSemesterId}
                    onValueChange={selectSemester}
                  >
                    <SelectTrigger
                      className="w-64"
                      aria-label="Select semester"
                    >
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleSemesters.map((row) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.batch.program.code} · Batch {row.batch.year} ·
                          Semester {row.semester} · {row.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
              {
                id: "attention",
                label: "Standing",
                isActive: filters.attention !== "all",
                onReset: () => setFilters({ attention: "all" }),
                control: (
                  <Select
                    value={filters.attention}
                    onValueChange={(attention) => setFilters({ attention })}
                  >
                    <SelectTrigger
                      className="w-44"
                      aria-label="Filter by standing"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All students</SelectItem>
                      <SelectItem value="true">Needs attention</SelectItem>
                    </SelectContent>
                  </Select>
                ),
              },
              {
                id: "ordering",
                label: "Sort order",
                defaultVisible: false,
                isActive: filters.ordering !== "full_name",
                onReset: () => {
                  setNameSort("default")
                  setFilters({ ordering: "full_name" })
                },
                control: (
                  <Select
                    value={filters.ordering}
                    onValueChange={(ordering) => {
                      setNameSort(
                        ordering === "-full_name"
                          ? "desc"
                          : ordering === "full_name"
                            ? "default"
                            : "default"
                      )
                      setFilters({ ordering })
                    }}
                  >
                    <SelectTrigger className="w-48" aria-label="Sort report">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_name">Student name</SelectItem>
                      <SelectItem value="-full_name">
                        Student name descending
                      </SelectItem>
                      <SelectItem value="risk">Attention first</SelectItem>
                      <SelectItem value="-overall_percentage">
                        Highest performance
                      </SelectItem>
                      <SelectItem value="roll_number">Roll number</SelectItem>
                    </SelectContent>
                  </Select>
                ),
              },
            ]}
          />
        }
        clearFilters={{
          visible:
            filters.attention !== "all" || filters.ordering !== "full_name",
          onClear: () => {
            setNameSort("default")
            setFilters({ attention: "all", ordering: "full_name" })
          },
        }}
        action={
          <Button
            size="sm"
            variant="outline"
            disabled={!effectiveSemesterId || exporting || !data?.count}
            onClick={() => void exportPdf()}
          >
            {exporting ? (
              <InlineSpinner />
            ) : (
              <FileDown className="size-4" aria-hidden />
            )}
            {exporting ? "Preparing PDF…" : "Export PDF"}
          </Button>
        }
        emptyTitle={
          effectiveSemesterId ? "No students found" : "Select a semester"
        }
        emptyMessage={
          effectiveSemesterId
            ? "No semester enrollments match the selected filters."
            : "Choose an authorized batch semester to generate its report."
        }
        columns={[
          {
            header: "#",
            className: "w-12 text-right tabular-nums text-muted-foreground",
            cell: (_row, index) => offset + index + 1,
          },
          {
            header: (
              <StudentNameSortButton
                direction={nameSort}
                onChange={(direction) => {
                  setNameSort(direction)
                  setFilters({
                    ordering: studentNameOrdering(direction) || "full_name",
                  })
                }}
              />
            ),
            cell: (row) => (
              <button
                className="text-left"
                onClick={() => setStudentId(row.studentId)}
              >
                <span className="block font-semibold hover:underline">
                  {row.fullName}
                </span>
                <span className="text-xs text-muted-foreground">
                  Roll {row.rollNumber} · {row.subjects} subjects
                </span>
              </button>
            ),
          },
          {
            header: "Contact",
            className: "text-xs text-muted-foreground",
            cell: (row) => (
              <div>
                {row.phoneNo || "—"}
                <br />
                {row.email || "—"}
              </div>
            ),
          },
          {
            header: "Attendance",
            className: "min-w-44",
            cell: (row) =>
              row.attendance.percentage === null ? (
                "—"
              ) : (
                <div className="space-y-1">
                  <AttendanceMeter percentage={row.attendance.percentage} />
                  <span className="text-xs text-muted-foreground">
                    {row.attendance.present + row.attendance.late}/
                    {row.attendance.held} attended
                  </span>
                </div>
              ),
          },
          {
            header: "Assessment",
            className: "text-center tabular-nums",
            cell: (row) => percent(row.assessment.percentage),
          },
          {
            header: "Assignment",
            className: "text-center tabular-nums",
            cell: (row) => percent(row.assignment.percentage),
          },
          {
            header: "Class performance",
            className: "text-center tabular-nums",
            cell: (row) => percent(row.classPerformancePercentage),
          },
          {
            header: "Overall",
            className: "text-center",
            cell: (row) => (
              <div className="space-y-1">
                <div className="font-bold tabular-nums">
                  {percent(row.overallPercentage)}
                </div>
                {row.needsAttention && (
                  <Badge variant="destructive">Needs attention</Badge>
                )}
              </div>
            ),
          },
          {
            header: "",
            className: "w-12 text-right",
            cell: (row) =>
              row.email ? (
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={`mailto:${row.email}`}
                    aria-label={`Email ${row.fullName}`}
                  >
                    <Mail className="size-4" aria-hidden />
                  </a>
                </Button>
              ) : null,
          },
        ]}
      />

      {studentId !== null && (
        <Suspense
          fallback={
            <ReportDialogFallback
              title="Student report"
              description="Loading the complete academic performance record…"
              overlayClassName="z-[90]"
              className="z-[100]"
              onClose={() => setStudentId(null)}
            >
              <StudentReportSkeleton />
            </ReportDialogFallback>
          }
        >
          <ManagementStudentReportDialog
            studentId={studentId}
            onClose={() => setStudentId(null)}
          />
        </Suspense>
      )}
    </div>
  )
}

function Summary({
  label,
  value,
  tone,
  loading,
}: {
  label: string
  value: string | number | undefined
  tone?: "danger"
  loading?: boolean
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-l-4 border-l-red-500"
          : "border-l-4 border-l-slate-500"
      }
    >
      <CardContent className="p-3">
        <div className="text-xs font-bold text-muted-foreground">{label}</div>
        {/* A bare dash would read as a real total of nothing, so a figure
            still being counted shows as a skeleton instead. */}
        {loading ? (
          <Skeleton className="mt-1.5 h-6 w-16" />
        ) : (
          <div className="mt-1 text-xl font-bold tabular-nums">
            {value ?? "—"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function percent(value: number | null) {
  return formatPercentage(value)
}
