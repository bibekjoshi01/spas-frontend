import { useMemo, useState } from "react"
import { FileDown, Mail } from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { PageHeader } from "@/components/page-header"
import { ResourceList } from "@/components/resource-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { notifier } from "@/lib/utils/notifier"

import { ManagementStudentReportDialog } from "@/pages/people/management-student-report-dialog"

export default function BatchPerformanceReportPage() {
  const batches = useGetBatchesQuery(ALL)
  const semesters = useGetBatchSemestersQuery(ALL)
  const [batch, setBatch] = useState("all")
  const [semesterId, setSemesterId] = useState("")
  const [studentId, setStudentId] = useState<number | null>(null)
  const [loadExport, exportState] =
    useLazyGetBatchSemesterPerformanceReportQuery()
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    attention: "all",
    ordering: "risk",
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
  const data = report.data

  const exportPdf = async () => {
    if (!effectiveSemesterId) return
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
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Batch performance"
        description="Semester-level attendance and performance for every student in your management scope."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Students" value={data?.summary.students} />
        <Summary label="With evidence" value={data?.summary.withEvidence} />
        <Summary
          label="Need attention"
          value={data?.summary.needsAttention}
          tone="danger"
        />
        <Summary
          label="Average performance"
          value={
            data?.summary.averagePerformance === null
              ? "—"
              : data
                ? `${data.summary.averagePerformance}%`
                : undefined
          }
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
          <>
            <Select
              value={batch}
              onValueChange={(value) => {
                setBatch(value)
                setSemesterId("")
              }}
            >
              <SelectTrigger className="w-52" aria-label="Select batch">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All authorized batches</SelectItem>
                {batches.data?.results.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.program.code} · Batch {row.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={effectiveSemesterId} onValueChange={setSemesterId}>
              <SelectTrigger className="w-64" aria-label="Select semester">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {visibleSemesters.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.batch.program.code} · Batch {row.batch.year} · Semester{" "}
                    {row.semester} · {row.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.attention}
              onValueChange={(attention) => setFilters({ attention })}
            >
              <SelectTrigger className="w-44" aria-label="Filter by standing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                <SelectItem value="true">Needs attention</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.ordering}
              onValueChange={(ordering) => setFilters({ ordering })}
            >
              <SelectTrigger className="w-48" aria-label="Sort report">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">Attention first</SelectItem>
                <SelectItem value="-overall_percentage">
                  Highest performance
                </SelectItem>
                <SelectItem value="roll_number">Roll number</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        clearFilters={{
          visible: filters.attention !== "all" || filters.ordering !== "risk",
          onClear: () => setFilters({ attention: "all", ordering: "risk" }),
        }}
        action={
          <Button
            size="sm"
            variant="outline"
            disabled={
              !effectiveSemesterId || exportState.isLoading || !data?.count
            }
            onClick={() => void exportPdf()}
          >
            <FileDown className="size-4" aria-hidden />
            Export PDF
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
            header: "Student",
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
        <ManagementStudentReportDialog
          studentId={studentId}
          onClose={() => setStudentId(null)}
        />
      )}
    </div>
  )
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number | undefined
  tone?: "danger"
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
        <div className="mt-1 text-xl font-bold tabular-nums">
          {value ?? "—"}
        </div>
      </CardContent>
    </Card>
  )
}

function percent(value: number | null) {
  return value === null ? "—" : `${value}%`
}
