import { lazy, Suspense, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Download,
  EllipsisVertical,
  Eye,
  PencilLine,
  Search,
  FileDown,
  X,
} from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { ClassPicker } from "@/components/class-picker"
import { ClassWorkspaceNav } from "@/components/class-workspace-nav"
import { useEligibilityThreshold } from "@/hooks/use-eligibility-threshold"
import { useHasPermission } from "@/hooks/use-has-permissions"
import { useRememberedClass } from "@/hooks/use-remembered-class"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { ReportDialogFallback } from "@/components/report-dialog-fallback"
import { SubjectRecordSkeleton } from "@/components/skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  type ClassStudent,
  eligibilityFor,
  useGetClassesQuery,
  useGetClassStudentsQuery,
} from "@/lib/api"
import { exportRosterPdf } from "@/lib/pdf-reports"
import { formatPercentage } from "@/lib/utils"

// A report is a screen's worth of code and it is opened from a row, so it
// downloads on that click rather than with the list behind it.
const StudentDetailDialog = lazy(async () => ({
  default: (await import("./student-detail-dialog")).StudentDetailDialog,
}))

const ELIGIBILITY_LABEL = {
  eligible: "Eligible",
  borderline: "Borderline",
  "at-risk": "At risk",
} as const

const ELIGIBILITY_VARIANT = {
  eligible: "secondary",
  borderline: "outline",
  "at-risk": "destructive",
} as const

/**
 * Students — one class at a time, with all three parameters rolled up.
 *
 * Everything here is computed by the backend, so what a teacher sees matches
 * what the eligibility rule will decide.
 */
export default function RosterPage() {
  const canViewPerformance = useHasPermission("view_class_performance")
  const canEditPerformance = useHasPermission("edit_class_performance")
  const [params, setParams] = useSearchParams()
  const classes = useGetClassesQuery()
  const { initial, remember } = useRememberedClass(classes.data)

  const [chosenId, setChosenId] = useState<number | null>(
    Number(params.get("class")) || null
  )
  const [selectedBatch, setSelectedBatch] = useState(
    params.get("batch") ?? "all"
  )
  const [search, setSearch] = useState("")
  const [standingFilter, setStandingFilter] = useState("all")
  const [detailEnrollment, setDetailEnrollment] = useState<number | null>(
    Number(params.get("student")) || null
  )

  // Falls back to the remembered class until the user picks one, so the screen
  // is useful on first load without an effect writing state.
  const allocation = chosenId ?? (selectedBatch === "all" ? initial : null)

  const students = useGetClassStudentsQuery(allocation as number, {
    skip: !allocation,
  })

  const chosen = classes.data?.find((item) => item.allocation === allocation)
  const batchOptions = useMemo(() => {
    const unique = new Map<string, { value: string; label: string }>()
    for (const item of classes.data ?? []) {
      const value = `${item.programCode}:${item.batchYear}`
      unique.set(value, {
        value,
        label: `${item.programCode} — ${item.batchYear}`,
      })
    }
    return [...unique.values()].sort((left, right) =>
      left.label.localeCompare(right.label)
    )
  }, [classes.data])
  const filteredClasses = useMemo(
    () =>
      selectedBatch === "all"
        ? (classes.data ?? [])
        : (classes.data ?? []).filter(
            (item) => `${item.programCode}:${item.batchYear}` === selectedBatch
          ),
    [classes.data, selectedBatch]
  )

  const threshold = useEligibilityThreshold()

  const visible = useMemo(() => {
    if (!students.data) return []
    const term = search.trim().toLowerCase()
    return students.data.filter((row) => {
      const matchesSearch =
        !term ||
        row.fullName.toLowerCase().includes(term) ||
        row.rollNumber.toLowerCase().includes(term) ||
        row.registrationNumber.toLowerCase().includes(term)
      if (!matchesSearch) return false
      const standing =
        row.performancePercentage === null
          ? "no-data"
          : eligibilityFor(row.performancePercentage, threshold)
      if (standingFilter === "all") return true
      if (standingFilter === "needs-attention") {
        return (
          standing === "at-risk" ||
          (row.attendance.held > 0 && row.attendance.percentage < threshold) ||
          row.classPerformance.score === null ||
          row.assignments.done < row.assignments.total
        )
      }
      return standing === standingFilter
    })
  }, [students.data, search, standingFilter, threshold])

  const atRisk = students.data?.filter(
    (row) =>
      row.performancePercentage !== null &&
      eligibilityFor(row.performancePercentage, threshold) === "at-risk"
  ).length

  const choose = (next: number) => {
    setChosenId(next)
    remember(next)
    setParams({
      class: String(next),
      ...(selectedBatch !== "all" ? { batch: selectedBatch } : {}),
    })
  }

  const openDetail = (enrollment: number) => {
    setDetailEnrollment(enrollment)
    const next = new URLSearchParams(params)
    next.set("class", String(allocation))
    next.set("student", String(enrollment))
    setParams(next)
  }

  const closeDetail = () => {
    setDetailEnrollment(null)
    const next = new URLSearchParams(params)
    next.delete("student")
    setParams(next)
  }

  const chooseBatch = (next: string) => {
    setSelectedBatch(next)
    const current = classes.data?.find((item) => item.allocation === allocation)
    const currentMatches =
      next === "all" ||
      (current && `${current.programCode}:${current.batchYear}` === next)
    if (!currentMatches) setChosenId(null)
    setParams({
      ...(currentMatches && allocation ? { class: String(allocation) } : {}),
      ...(next !== "all" ? { batch: next } : {}),
    })
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Students"
        description={
          chosen
            ? `${chosen.code} — ${chosen.name} · ${chosen.programCode} ${chosen.batchYear}`
            : "Choose a class."
        }
        meta={
          students.data && (
            <>
              <span>{students.data.length} enrolled</span>
              {atRisk !== undefined && atRisk > 0 && (
                <span className="text-rose-600 dark:text-rose-400">
                  {atRisk} at risk
                </span>
              )}
            </>
          )
        }
        actions={
          <>
            {allocation && canViewPerformance && (
              <Button asChild size="sm">
                <Link to={`/class-performance?class=${allocation}`}>
                  <PencilLine className="size-4" aria-hidden />
                  {chosen?.semesterStatus === "RUNNING" && canEditPerformance
                    ? "Add class performance"
                    : "View class performance"}
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!visible.length}
              onClick={() => exportCsv(visible, chosen?.code ?? "class")}
            >
              <Download className="size-4" aria-hidden />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!visible.length || !chosen}
              onClick={() =>
                chosen && void exportRosterPdf(chosen, visible, threshold)
              }
            >
              <FileDown className="size-4" aria-hidden />
              Export PDF
            </Button>
          </>
        }
      />

      {chosen && <ClassWorkspaceNav value={chosen} active="Roster" />}

      <div className="flex flex-col gap-2 rounded-sm border bg-card p-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, roll or registration number"
            className="pl-8"
            aria-label="Search students"
          />
        </div>

        {classes.data && (
          <>
            <Select value={selectedBatch} onValueChange={chooseBatch}>
              <SelectTrigger
                className="w-full sm:w-56"
                aria-label="Filter roster by batch"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectItem value="all">All batches</SelectItem>
                {batchOptions.map((batch) => (
                  <SelectItem key={batch.value} value={batch.value}>
                    {batch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ClassPicker
              classes={filteredClasses}
              value={allocation}
              onChange={choose}
              label="Filter roster by subject"
              className="sm:w-[28rem]"
              showBatchFilter={false}
            />
            <Select value={standingFilter} onValueChange={setStandingFilter}>
              <SelectTrigger
                className="w-full sm:w-48"
                aria-label="Filter students by standing"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectItem value="all">All standings</SelectItem>
                <SelectItem value="needs-attention">Needs attention</SelectItem>
                <SelectItem value="at-risk">At risk</SelectItem>
                <SelectItem value="borderline">Borderline</SelectItem>
                <SelectItem value="eligible">Eligible</SelectItem>
                <SelectItem value="no-data">No performance data</SelectItem>
              </SelectContent>
            </Select>
            {(search ||
              selectedBatch !== "all" ||
              standingFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setStandingFilter("all")
                  chooseBatch("all")
                }}
              >
                <X className="size-4" aria-hidden />
                Clear filters
              </Button>
            )}
          </>
        )}
      </div>

      <QueryState
        isLoading={classes.isLoading || students.isLoading}
        error={classes.error ?? students.error}
        isEmpty={visible.length === 0}
        onRetry={students.refetch}
        skeleton="table"
        emptyTitle={
          search ? "No students match that" : "No students on this class"
        }
        emptyMessage={
          search
            ? "Try a different name or roll number."
            : "Register students onto the class to see them here."
        }
      >
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-slate-300 bg-slate-200 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800">
                <TableHead className="w-16">Roll</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="min-w-52">Contact info</TableHead>
                <TableHead className="w-56">Attendance</TableHead>
                <TableHead className="w-32 text-right">Internal</TableHead>
                <TableHead className="w-32 text-right">Assignments</TableHead>
                <TableHead className="w-32 text-right">
                  Class performance
                </TableHead>
                <TableHead className="w-40">Standing</TableHead>
                <TableHead className="w-14 px-1 text-center">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const standing =
                  row.performancePercentage === null
                    ? null
                    : eligibilityFor(row.performancePercentage, threshold)

                return (
                  <TableRow key={row.enrollment}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {row.rollNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.fullName}</span>
                        {row.isRetake && (
                          <Badge variant="outline" className="text-xs">
                            Retake
                          </Badge>
                        )}
                      </div>
                      {row.registrationNumber && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.registrationNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="space-y-0.5">
                        <div>{row.email || "No email"}</div>
                        <div className="tabular-nums">
                          Primary: {row.phoneNo || "—"}
                        </div>
                        <div className="tabular-nums">
                          Alternate: {row.alternatePhoneNo || "—"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AttendanceMeter percentage={row.attendance.percentage} />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {row.attendance.attended}/{row.attendance.held} classes
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.internalMarks.total > 0 ? (
                        <>
                          {row.internalMarks.obtained}
                          <span className="text-muted-foreground">
                            /{row.internalMarks.total}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.assignments.total > 0 ? (
                        <>
                          {row.assignments.done}
                          <span className="text-muted-foreground">
                            /{row.assignments.total}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.classPerformance.score !== null ? (
                        <span className="font-medium">
                          {row.classPerformance.score}/10
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not rated</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge
                          variant={
                            standing ? ELIGIBILITY_VARIANT[standing] : "outline"
                          }
                        >
                          {standing
                            ? `${ELIGIBILITY_LABEL[standing]} · ${formatPercentage(row.performancePercentage)}`
                            : "No data"}
                        </Badge>
                        <RecentAttendance records={row.attendance.recent} />
                        <span className="block text-[11px] text-muted-foreground">
                          {concernFor(row, threshold)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-14 px-1 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${row.fullName}`}
                          >
                            <EllipsisVertical className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                          <DropdownMenuItem
                            onSelect={() => openDetail(row.enrollment)}
                          >
                            <Eye className="size-4" aria-hidden />
                            View details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </QueryState>
      {allocation && detailEnrollment && (
        <Suspense
          fallback={
            <ReportDialogFallback
              title="Loading student record…"
              description="Fetching this student's record for the subject."
              overlayClassName="z-[90]"
              className="z-[100]"
              onClose={closeDetail}
            >
              <SubjectRecordSkeleton />
            </ReportDialogFallback>
          }
        >
          <StudentDetailDialog
            allocation={allocation}
            enrollment={detailEnrollment}
            onClose={closeDetail}
          />
        </Suspense>
      )}
    </div>
  )
}

function concernFor(row: ClassStudent, threshold: number) {
  if (row.attendance.held > 0 && row.attendance.percentage < threshold) {
    return `Attendance ${formatPercentage(row.attendance.percentage)}`
  }
  if (
    row.internalMarks.total > 0 &&
    (row.internalMarks.obtained / row.internalMarks.total) * 100 < 50
  ) {
    return "Low assessment result"
  }
  if (row.assignments.done < row.assignments.total) {
    return `${row.assignments.total - row.assignments.done} assignments incomplete`
  }
  if (row.classPerformance.score === null) return "Not rated"
  return "No immediate concern"
}

const ATTENDANCE_DOT = {
  PRESENT: "border border-emerald-600 bg-emerald-500",
  ABSENT: "border border-muted-foreground/50 bg-transparent",
  LATE: "border border-muted-foreground/50 bg-transparent",
  EXCUSED: "border border-muted-foreground/50 bg-transparent",
} as const

function RecentAttendance({
  records,
}: {
  records: ClassStudent["attendance"]["recent"]
}) {
  if (!records.length) {
    return (
      <span className="block text-[11px] text-muted-foreground">
        No attendance yet
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1" aria-label="Latest attendance">
      {records.map((record) => {
        const date = new Date(`${record.date}T00:00:00`).toLocaleDateString(
          [],
          {
            month: "short",
            day: "numeric",
          }
        )
        const label = `${date}, period ${record.period}: ${record.status.toLowerCase()}`
        return (
          <span
            key={`${record.date}-${record.period}`}
            title={label}
            aria-label={label}
            className={`size-2.5 rounded-full ${ATTENDANCE_DOT[record.status]}`}
          />
        )
      })}
    </div>
  )
}

function exportCsv(rows: ClassStudent[], classCode: string) {
  const header = [
    "Roll",
    "Registration",
    "Name",
    "Email",
    "Primary phone",
    "Alternate phone",
    "Attended",
    "Held",
    "Attendance %",
    "Internal",
    "Internal total",
    "Assignments done",
    "Assignments total",
    "Class performance / 10",
  ]

  const body = rows.map((row) => [
    row.rollNumber,
    row.registrationNumber,
    row.fullName,
    row.email,
    row.phoneNo,
    row.alternatePhoneNo,
    row.attendance.attended,
    row.attendance.held,
    Math.round(row.attendance.percentage * 100) / 100,
    row.internalMarks.obtained,
    row.internalMarks.total,
    row.assignments.done,
    row.assignments.total,
    row.classPerformance.score ?? "",
  ])

  const csv = [header, ...body]
    .map((line) =>
      line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n")

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `${classCode}-students.csv`
  link.click()
  URL.revokeObjectURL(url)
}
