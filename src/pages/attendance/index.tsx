import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react"

import { ClassPicker } from "@/components/class-picker"
import { ClassWorkspaceNav } from "@/components/class-workspace-nav"
import { PageHeader } from "@/components/page-header"
import { InlineSpinner, QueryState } from "@/components/query-state"
import { ClassWorkspaceSkeleton } from "@/components/skeletons"
import { StudentNameSortButton } from "@/components/student-name-sort"
import {
  sortStudentsByName,
  type StudentNameSortDirection,
} from "@/lib/utils/student-sort"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useHasPermission } from "@/hooks/use-has-permissions"
import { useRememberedClass } from "@/hooks/use-remembered-class"
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  type AttendanceSessionSummary,
  useGetAttendanceSessionQuery,
  useGetAttendanceSessionsQuery,
  useGetClassesQuery,
} from "@/lib/api"

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT:
    "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-700 dark:bg-emerald-700",
  ABSENT:
    "border-rose-600 bg-rose-600 text-white dark:border-rose-700 dark:bg-rose-700",
  LATE: "border-amber-500 bg-amber-500 text-white dark:border-amber-600 dark:bg-amber-600",
  EXCUSED:
    "border-sky-600 bg-sky-600 text-white dark:border-sky-700 dark:bg-sky-700",
}

const today = new Date()
today.setHours(0, 0, 0, 0)

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function fromDateKey(value: string | null) {
  if (!value) return today
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? today : date
}

export default function AttendancePage() {
  const canAddAttendance = useHasPermission("add_attendance")
  const canEditAttendance = useHasPermission("edit_attendance")
  const [params, setParams] = useSearchParams()
  const classes = useGetClassesQuery()
  const { initial, remember } = useRememberedClass(classes.data)
  const [chosenId, setChosenId] = useState<number | null>(
    Number(params.get("class")) || null
  )
  const [calendarOpen, setCalendarOpen] = useState(false)

  const allocation = chosenId ?? initial
  const selectedDate = fromDateKey(params.get("date"))
  const selectedKey = toDateKey(selectedDate)
  const sessions = useGetAttendanceSessionsQuery(
    { allocation: allocation ?? undefined, limit: 0 },
    { skip: !allocation }
  )

  const chosen = classes.data?.find((item) => item.allocation === allocation)
  const isWritable = chosen?.semesterStatus === "RUNNING"
  const semesterStart = chosen?.semesterStartDate
    ? fromDateKey(chosen.semesterStartDate)
    : undefined
  const semesterEnd = chosen?.semesterEndDate
    ? fromDateKey(chosen.semesterEndDate)
    : undefined
  const dateIsInSemester = (date: Date) =>
    (!semesterStart || date >= semesterStart) &&
    (!semesterEnd || date <= semesterEnd)
  const selectedDateIsInSemester = dateIsInSemester(selectedDate)
  const todayIsInSemester = dateIsInSemester(today)
  const recordedDateKeys = useMemo(
    () =>
      Array.from(
        new Set(sessions.data?.results.map((session) => session.date) ?? [])
      ).sort(),
    [sessions.data]
  )
  const recordedDates = useMemo(
    () => recordedDateKeys.map(fromDateKey),
    [recordedDateKeys]
  )
  const previousRecordedDate = [...recordedDateKeys]
    .reverse()
    .find((key) => key < selectedKey)
  const nextRecordedDate = recordedDateKeys.find((key) => key > selectedKey)
  const selectedSessions =
    sessions.data?.results
      .filter((session) => session.date === selectedKey)
      .sort((a, b) => a.period - b.period) ?? []
  const sessionParam = params.get("session")
  const selectedSessionId =
    sessionParam === "none"
      ? null
      : Number(sessionParam) || selectedSessions[0]?.id || null
  const selectedSession =
    selectedSessions.find((session) => session.id === selectedSessionId) ??
    selectedSessions[0]

  const chooseClass = (next: number) => {
    setChosenId(next)
    remember(next)
    setParams({ class: String(next), date: selectedKey })
  }

  const chooseDate = (next?: Date) => {
    if (!next || !allocation) return
    setParams({ class: String(allocation), date: toDateKey(next) })
    setCalendarOpen(false)
  }

  const todayKey = toDateKey(today)
  const todaySessions =
    sessions.data?.results.filter((session) => session.date === todayKey) ?? []
  const todayHref = todaySessions[0]
    ? `/attendance/${allocation}/${todayKey}?period=${todaySessions[0].period}`
    : `/attendance/${allocation}/${todayKey}`

  const toggleSession = (session: AttendanceSessionSummary) => {
    const next = new URLSearchParams({
      class: String(session.allocation),
      date: session.date,
    })
    next.set("session", String(session.id))
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-3 md:p-4">
      <PageHeader
        title="Attendance"
        description="Take today's attendance or review a recorded day."
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-card hover:bg-accent"
          >
            <Link to="/classes">
              <ArrowLeft className="size-4" aria-hidden />
              My Classes
            </Link>
          </Button>
        }
      />

      {classes.isLoading ? (
        <ClassWorkspaceSkeleton compact />
      ) : (
        chosen && (
          <ClassWorkspaceNav value={chosen} active="Attendance" compact />
        )
      )}

      <section
        className="flex flex-col gap-2 border bg-card p-2 lg:flex-row lg:items-center"
        aria-label="Attendance class selection"
      >
        <ClassPicker
          classes={classes.data ?? []}
          value={allocation}
          onChange={chooseClass}
          label="Select class"
          className="sm:w-80"
        />
        {selectedSession &&
          isWritable &&
          selectedDateIsInSemester &&
          canEditAttendance && (
            <Button asChild size="sm" className="w-full lg:ml-auto lg:w-auto">
              <Link
                to={`/attendance/${selectedSession.allocation}/${selectedSession.date}?period=${selectedSession.period}`}
              >
                <Pencil className="size-4" aria-hidden />
                Edit attendance
              </Link>
            </Button>
          )}
        {allocation &&
          isWritable &&
          todayIsInSemester &&
          !todaySessions.length &&
          canAddAttendance && (
            <Button asChild size="sm" className="w-full lg:ml-auto lg:w-auto">
              <Link to={todayHref}>
                <Plus className="size-4" aria-hidden />
                Take attendance today
              </Link>
            </Button>
          )}
      </section>

      <QueryState
        isLoading={classes.isLoading || sessions.isLoading}
        error={classes.error ?? sessions.error}
        isEmpty={(classes.data?.length ?? 0) === 0}
        onRetry={() => {
          classes.refetch()
          sessions.refetch()
        }}
        skeleton="table"
        emptyTitle="No classes allocated"
        emptyMessage="Attendance becomes available after a class is allocated to you."
      >
        <div className="grid gap-3">
          <section className="min-w-0 border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <CalendarCheck
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {selectedDate.toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {chosen?.name ?? "Choose a class"}
                  </p>
                </div>
              </div>
              <div
                className="flex w-full flex-wrap items-center gap-1.5 border-t pt-2 sm:w-auto sm:border-t-0 sm:pt-0"
                role="group"
                aria-label="Choose attendance date"
              >
                <Button
                  variant="outline"
                  size="xs"
                  disabled={!previousRecordedDate}
                  onClick={() =>
                    previousRecordedDate &&
                    chooseDate(fromDateKey(previousRecordedDate))
                  }
                >
                  <ChevronLeft className="size-3" aria-hidden />
                  Previous
                </Button>
                <Button
                  variant={selectedKey === todayKey ? "secondary" : "outline"}
                  size="xs"
                  disabled={!allocation || !todayIsInSemester}
                  onClick={() => chooseDate(today)}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={!nextRecordedDate}
                  onClick={() =>
                    nextRecordedDate &&
                    chooseDate(fromDateKey(nextRecordedDate))
                  }
                >
                  Next
                  <ChevronRight className="size-3" aria-hidden />
                </Button>
                <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant={calendarOpen ? "secondary" : "outline"}
                      size="xs"
                    >
                      <CalendarDays className="size-3" aria-hidden />
                      Choose date
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full gap-0 sm:max-w-sm">
                    <SheetHeader className="border-b pr-12">
                      <SheetTitle>Choose attendance date</SheetTitle>
                      <SheetDescription>
                        Recorded dates are highlighted in green.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="overflow-y-auto p-2 sm:p-3">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={chooseDate}
                        disabled={[
                          { after: today },
                          ...(semesterStart ? [{ before: semesterStart }] : []),
                          ...(semesterEnd ? [{ after: semesterEnd }] : []),
                        ]}
                        modifiers={{ recorded: recordedDates }}
                        modifiersClassNames={{
                          recorded:
                            "rounded-md bg-emerald-100 text-emerald-900 [&_button]:bg-emerald-100 [&_button]:font-semibold [&_button]:text-emerald-900 hover:[&_button]:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:[&_button]:bg-emerald-950 dark:[&_button]:text-emerald-100 dark:hover:[&_button]:bg-emerald-900",
                        }}
                        className="w-full"
                        classNames={{ root: "w-full", month: "w-full" }}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              {chosen && !isWritable && (
                <Badge variant="outline">
                  {chosen.semesterStatus === "COMPLETED"
                    ? "Completed · read only"
                    : "Upcoming · read only"}
                </Badge>
              )}
              {selectedKey === todayKey &&
                allocation &&
                isWritable &&
                todayIsInSemester &&
                canAddAttendance &&
                !selectedSessions.length && (
                  <Button asChild size="sm">
                    <Link to={`/attendance/${allocation}/${selectedKey}`}>
                      <Plus className="size-4" aria-hidden />
                      Take attendance
                    </Link>
                  </Button>
                )}
            </div>

            {selectedSessions.length ? (
              <ul className="divide-y">
                {selectedSessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    expanded={selectedSessionId === session.id}
                    onToggle={() => toggleSession(session)}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center p-4 text-center sm:min-h-56 sm:p-6">
                <CalendarCheck
                  className="mb-3 size-8 text-muted-foreground"
                  aria-hidden
                />
                <p className="font-medium">No attendance recorded</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground sm:text-sm">
                  This date remains blank and does not count as a held class or
                  student absence.
                </p>
                {allocation &&
                  isWritable &&
                  canAddAttendance &&
                  selectedKey < todayKey &&
                  selectedDateIsInSemester && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="mt-4"
                    >
                      <Link to={`/attendance/${allocation}/${selectedKey}`}>
                        <Plus className="size-4" aria-hidden />
                        Add attendance for this date
                      </Link>
                    </Button>
                  )}
              </div>
            )}
          </section>
        </div>
      </QueryState>
    </div>
  )
}

function SessionRow({
  session,
  expanded,
  onToggle,
}: {
  session: AttendanceSessionSummary
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <li className={expanded ? undefined : "border-l-2 border-l-emerald-600"}>
      {!expanded && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="text-xs font-semibold sm:text-sm">
            Period {session.period}
          </span>
          <Button variant="outline" size="sm" onClick={onToggle}>
            <Eye className="size-4" aria-hidden />
            View details
          </Button>
        </div>
      )}
      {expanded && <InlineSessionDetail session={session} />}
    </li>
  )
}

function InlineSessionDetail({
  session,
}: {
  session: AttendanceSessionSummary
}) {
  const detail = useGetAttendanceSessionQuery(session.id)
  const [nameSort, setNameSort] = useState<StudentNameSortDirection>("default")
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "ALL">(
    "ALL"
  )
  const [search, setSearch] = useState("")
  const records = useMemo(() => {
    const sorted = sortStudentsByName(detail.data?.records ?? [], nameSort)
    const byStatus =
      statusFilter === "ALL"
        ? sorted
        : sorted.filter((record) => record.status === statusFilter)
    const query = search.trim().toLowerCase()
    if (!query) return byStatus
    return byStatus.filter((record) =>
      [record.fullName, record.rollNumber, record.phoneNo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [detail.data?.records, nameSort, search, statusFilter])
  const statusCounts = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    }
    detail.data?.records.forEach((record) => {
      counts[record.status] += 1
    })
    return counts
  }, [detail.data?.records])

  return (
    <div className="border-t bg-band p-2 sm:p-3">
      {detail.isLoading ? (
        <div className="flex min-h-24 items-center justify-center">
          <InlineSpinner />
        </div>
      ) : detail.error ? (
        <div className="flex min-h-24 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          Attendance details could not be loaded.
          <Button variant="outline" size="sm" onClick={detail.refetch}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden border bg-table-surface">
          <div className="flex flex-col gap-2 border-b bg-card p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="flex min-w-0 items-center gap-1 overflow-x-auto"
                role="group"
                aria-label="Filter attendance by status"
              >
                <Button
                  variant={statusFilter === "ALL" ? "secondary" : "ghost"}
                  size="xs"
                  aria-pressed={statusFilter === "ALL"}
                  onClick={() => setStatusFilter("ALL")}
                >
                  All {detail.data?.records.length ?? 0}
                </Button>
                {ATTENDANCE_STATUSES.map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "secondary" : "ghost"}
                    size="xs"
                    aria-pressed={statusFilter === status}
                    onClick={() => setStatusFilter(status)}
                  >
                    {ATTENDANCE_LABELS[status]} {statusCounts[status]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex h-8 w-full min-w-0 items-center border bg-background px-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:h-9 sm:w-64 sm:shrink-0 sm:px-2">
              <Search
                className="size-3.5 shrink-0 text-muted-foreground sm:size-4"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students"
                aria-label="Search students"
                className="h-7 min-w-0 border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 sm:h-8 sm:px-2 sm:text-sm dark:bg-transparent"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="flex size-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none sm:size-7"
                  aria-label="Clear student search"
                >
                  <X className="size-3 sm:size-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>
          {records.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-table-header">
                  <TableHead className="hidden w-12 sm:table-cell">#</TableHead>
                  <TableHead className="w-20 sm:w-28">Roll</TableHead>
                  <TableHead>
                    <StudentNameSortButton
                      direction={nameSort}
                      onChange={setNameSort}
                    />
                  </TableHead>
                  <TableHead className="hidden w-40 lg:table-cell">
                    Phone
                  </TableHead>
                  <TableHead className="w-20 sm:w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => (
                  <TableRow key={record.id}>
                    <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] sm:text-xs">
                      {record.rollNumber}
                    </TableCell>
                    <TableCell className="max-w-32 truncate font-medium sm:max-w-none">
                      {record.fullName}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                      {record.phoneNo || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${STATUS_STYLES[record.status]} px-1.5 text-[10px] sm:px-2 sm:text-xs`}
                      >
                        {ATTENDANCE_LABELS[record.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex min-h-24 items-center justify-center px-3 py-6 text-xs text-muted-foreground">
              {search
                ? "No students match your search."
                : "No students have this attendance status."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
