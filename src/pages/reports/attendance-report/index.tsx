import { useMemo } from "react"
import { FileDown } from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { PageHeader } from "@/components/page-header"
import { ResourceList } from "@/components/resource-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DatePickerInput } from "@/components/ui/date-time-picker"
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
  type ManagementAttendanceReportRow,
  useGetAllocationsQuery,
  useGetBatchSemestersQuery,
  useGetBatchesQuery,
  useGetManagementAttendanceReportQuery,
  useGetProgramsQuery,
  useLazyGetManagementAttendanceReportQuery,
} from "@/lib/api"
import { exportManagementAttendanceReportPdf } from "@/lib/pdf-reports"
import { formatDisplayDate, localDateKey } from "@/lib/utils/date"
import { notifier } from "@/lib/utils/notifier"

const today = localDateKey()

export default function AttendanceReportPage() {
  const programs = useGetProgramsQuery(ALL)
  const batches = useGetBatchesQuery(ALL)
  const semesters = useGetBatchSemestersQuery(ALL)
  const allocations = useGetAllocationsQuery(ALL)
  const [loadExport, exportState] = useLazyGetManagementAttendanceReportQuery()
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    start_date: dateDaysAgo(6),
    end_date: today,
    program: "all",
    batch: "all",
    batch_semester: "all",
    allocation: "all",
    ordering: "-date",
  })
  const report = useGetManagementAttendanceReportQuery({
    ...params,
    startDate: filters.start_date,
    endDate: filters.end_date,
  })
  const data = report.data

  const visibleBatches = useMemo(
    () =>
      (batches.data?.results ?? []).filter(
        (row) =>
          filters.program === "all" ||
          String(row.program.id) === filters.program
      ),
    [batches.data, filters.program]
  )
  const visibleSemesters = useMemo(
    () =>
      (semesters.data?.results ?? []).filter(
        (row) =>
          filters.batch === "all" || String(row.batch.id) === filters.batch
      ),
    [filters.batch, semesters.data]
  )
  const visibleAllocations = useMemo(
    () =>
      (allocations.data?.results ?? []).filter((row) => {
        if (
          filters.program !== "all" &&
          String(row.batchSemester.batch.program.id) !== filters.program
        )
          return false
        if (
          filters.batch !== "all" &&
          String(row.batchSemester.batch.id) !== filters.batch
        )
          return false
        if (
          filters.batch_semester !== "all" &&
          String(row.batchSemester.id) !== filters.batch_semester
        )
          return false
        return true
      }),
    [allocations.data, filters.batch, filters.batch_semester, filters.program]
  )

  const setPreset = (days: number) =>
    setFilters({ start_date: dateDaysAgo(days - 1), end_date: today })

  const exportPdf = async () => {
    try {
      const complete = await loadExport({
        ...params,
        limit: 0,
        startDate: filters.start_date,
        endDate: filters.end_date,
      }).unwrap()
      await exportManagementAttendanceReportPdf(complete)
    } catch {
      notifier.error("Could not export this attendance report.")
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Attendance reports"
        description="Daily, weekly, and custom-range attendance across the classes you manage."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Classes Held" value={data?.summary.sessions} />
        <Summary label="Students Marked" value={data?.summary.marked} />
        <Summary label="Absent" value={data?.summary.absent} danger />
        <Summary
          label="Attendance"
          value={data ? `${data.summary.attendancePercentage}%` : undefined}
        />
      </div>

      <ResourceList<ManagementAttendanceReportRow>
        rows={data?.results}
        rowKey={(row) => row.id}
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
          placeholder: "Search subject or teacher",
        }}
        filters={
          <>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setPreset(1)}>
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset(7)}>
                7 days
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreset(30)}>
                30 days
              </Button>
            </div>
            <DatePickerInput
              className="w-48"
              value={filters.start_date}
              max={filters.end_date}
              onValueChange={(start_date) => setFilters({ start_date })}
              aria-label="Report start date"
            />
            <DatePickerInput
              className="w-48"
              value={filters.end_date}
              min={filters.start_date}
              max={today}
              onValueChange={(end_date) => setFilters({ end_date })}
              aria-label="Report end date"
            />
            <Select
              value={filters.program}
              onValueChange={(program) =>
                setFilters({
                  program,
                  batch: "all",
                  batch_semester: "all",
                  allocation: "all",
                })
              }
            >
              <SelectTrigger className="w-52" aria-label="Filter by program">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {programs.data?.results.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.code} — {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.batch}
              onValueChange={(batch) =>
                setFilters({ batch, batch_semester: "all", allocation: "all" })
              }
            >
              <SelectTrigger className="w-48" aria-label="Filter by batch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {visibleBatches.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.program.code} · {row.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.batch_semester}
              onValueChange={(batch_semester) =>
                setFilters({ batch_semester, allocation: "all" })
              }
            >
              <SelectTrigger className="w-52" aria-label="Filter by semester">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All semesters</SelectItem>
                {visibleSemesters.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.batch.program.code} {row.batch.year} · Semester{" "}
                    {row.semester}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.allocation}
              onValueChange={(allocation) => setFilters({ allocation })}
            >
              <SelectTrigger className="w-64" aria-label="Filter by class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {visibleAllocations.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.subject.code} · {row.batchSemester.batch.program.code}{" "}
                    {row.batchSemester.batch.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.ordering}
              onValueChange={(ordering) => setFilters({ ordering })}
            >
              <SelectTrigger className="w-44" aria-label="Sort report">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-date">Newest first</SelectItem>
                <SelectItem value="date">Oldest first</SelectItem>
                <SelectItem value="-absent">Most absent first</SelectItem>
                <SelectItem value="subject">Subject</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        clearFilters={{
          visible:
            filters.program !== "all" ||
            filters.batch !== "all" ||
            filters.batch_semester !== "all" ||
            filters.allocation !== "all" ||
            filters.ordering !== "-date" ||
            filters.start_date !== dateDaysAgo(6) ||
            filters.end_date !== today,
          onClear: () =>
            setFilters({
              program: "all",
              batch: "all",
              batch_semester: "all",
              allocation: "all",
              ordering: "-date",
              start_date: dateDaysAgo(6),
              end_date: today,
            }),
        }}
        action={
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.count || exportState.isLoading}
            onClick={() => void exportPdf()}
          >
            <FileDown className="size-4" aria-hidden /> Export PDF
          </Button>
        }
        emptyTitle="No attendance sessions found"
        emptyMessage="No held classes match this date range and filter selection."
        columns={[
          {
            header: "#",
            className: "w-12 text-right tabular-nums text-muted-foreground",
            cell: (_row, index) => offset + index + 1,
          },
          {
            header: "Date",
            className: "whitespace-nowrap",
            cell: (row) => (
              <div className="font-medium">
                {formatDisplayDate(row.date)}
                <div className="text-xs text-muted-foreground">
                  Period {row.period}
                </div>
              </div>
            ),
          },
          {
            header: "Class",
            cell: (row) => (
              <div>
                <div className="font-semibold">
                  {row.subjectCode} — {row.subjectName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.programCode} · Batch {row.batchYear} · Semester{" "}
                  {row.semester}
                </div>
              </div>
            ),
          },
          { header: "Teacher", cell: (row) => row.teacherName },
          {
            header: "Marked",
            className: "text-center tabular-nums",
            cell: (row) => row.marked,
          },
          {
            header: "Present",
            className: "text-center tabular-nums",
            cell: (row) => row.present,
          },
          {
            header: "Absent",
            className: "text-center font-semibold tabular-nums text-red-700",
            cell: (row) => row.absent,
          },
          {
            header: "Late",
            className: "text-center tabular-nums",
            cell: (row) => row.late,
          },
          {
            header: "Excused",
            className: "text-center tabular-nums",
            cell: (row) => row.excused,
          },
          {
            header: "Attendance",
            className: "min-w-40",
            cell: (row) => (
              <AttendanceMeter percentage={row.attendancePercentage} />
            ),
          },
        ]}
      />
    </div>
  )
}

function Summary({
  label,
  value,
  danger,
}: {
  label: string
  value: string | number | undefined
  danger?: boolean
}) {
  return (
    <Card
      className={
        danger ? "border-l-4 border-l-red-500" : "border-l-4 border-l-slate-500"
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

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return localDateKey(date)
}
