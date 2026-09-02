import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Eye,
  Pencil,
  Plus,
} from "lucide-react"

import { ClassPicker } from "@/components/class-picker"
import { ClassWorkspaceNav } from "@/components/class-workspace-nav"
import { PageHeader } from "@/components/page-header"
import { InlineSpinner, QueryState } from "@/components/query-state"
import { StudentNameSortButton } from "@/components/student-name-sort"
import {
  sortStudentsByName,
  type StudentNameSortDirection,
} from "@/lib/utils/student-sort"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { useHasPermission } from "@/hooks/use-has-permissions"
import { useRememberedClass } from "@/hooks/use-remembered-class"
import {
  ATTENDANCE_LABELS,
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
  const recordedDates = useMemo(
    () =>
      Array.from(
        new Set(sessions.data?.results.map((session) => session.date) ?? [])
      ).map(fromDateKey),
    [sessions.data]
  )
  const selectedSessions = useMemo(
    () =>
      sessions.data?.results
        .filter((session) => session.date === selectedKey)
        .sort((a, b) => a.period - b.period) ?? [],
    [selectedKey, sessions.data]
  )
  const sessionParam = params.get("session")
  const selectedSessionId =
    sessionParam === "none"
      ? null
      : Number(sessionParam) || selectedSessions[0]?.id || null

  const chooseClass = (next: number) => {
    setChosenId(next)
    remember(next)
    setParams({ class: String(next), date: selectedKey })
  }

  const chooseDate = (next?: Date) => {
    if (!next || !allocation) return
    setParams({ class: String(allocation), date: toDateKey(next) })
  }

  const todayKey = toDateKey(today)
  const todaySessions =
    sessions.data?.results.filter((session) => session.date === todayKey) ?? []
  const todayHref = todaySessions[0]
    ? `/attendance/${allocation}/${todayKey}?period=${todaySessions[0].period}`
    : `/attendance/${allocation}/${todayKey}`

  const viewTodayInline = () => {
    if (!allocation || !todaySessions[0]) return
    setParams({
      class: String(allocation),
      date: todayKey,
      session: String(todaySessions[0].id),
    })
  }

  const toggleSession = (session: AttendanceSessionSummary) => {
    const next = new URLSearchParams({
      class: String(session.allocation),
      date: session.date,
    })
    if (selectedSessionId === session.id) {
      next.set("session", "none")
    } else {
      next.set("session", String(session.id))
    }
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 p-3 md:p-4">
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

      {chosen && <ClassWorkspaceNav value={chosen} active="Attendance" />}

      <div className="flex flex-col gap-2 border bg-card p-2 sm:flex-row sm:items-center">
        <span className="shrink-0 text-sm font-medium">Select class</span>
        <ClassPicker
          classes={classes.data ?? []}
          value={allocation}
          onChange={chooseClass}
          label="Select class"
          className="sm:w-[28rem]"
        />
        {allocation &&
          isWritable &&
          todayIsInSemester &&
          (todaySessions.length ? (
            <Button size="sm" className="sm:ml-auto" onClick={viewTodayInline}>
              <Eye className="size-4" aria-hidden />
              View today's attendance
            </Button>
          ) : canAddAttendance ? (
            <Button asChild size="sm" className="sm:ml-auto">
              <Link to={todayHref}>
                <Plus className="size-4" aria-hidden />
                Take attendance today
              </Link>
            </Button>
          ) : null)}
      </div>

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
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
          <section
            className="self-start border bg-card"
            aria-label="Attendance calendar"
          >
            <div className="border-b bg-band px-3 py-2">
              <h2 className="font-semibold">Attendance calendar</h2>
              <p className="text-xs text-muted-foreground">
                Recorded dates have a green marker. Blank dates are not
                absences.
              </p>
            </div>
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
          </section>

          <section className="min-w-0 border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-band px-3 py-2">
              <div>
                <h2 className="font-semibold">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {chosen
                    ? `${chosen.code} — ${chosen.name}`
                    : "Choose a class"}
                </p>
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
                    canEdit={Boolean(
                      isWritable &&
                      selectedDateIsInSemester &&
                      canEditAttendance
                    )}
                    onToggle={() => toggleSession(session)}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
                <CalendarCheck
                  className="mb-3 size-8 text-muted-foreground"
                  aria-hidden
                />
                <p className="font-medium">No attendance recorded</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
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
  canEdit,
  onToggle,
}: {
  session: AttendanceSessionSummary
  expanded: boolean
  canEdit: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Recorded attendance</span>
              {session.period > 1 && (
                <Badge variant="outline" className="gap-1">
                  <Clock3 className="size-3" aria-hidden />
                  Period {session.period}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {session.presentCount} present · {session.markedCount} marked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToggle}>
            <Eye className="size-4" aria-hidden />
            {expanded ? "Hide attendance" : "View attendance"}
          </Button>
          {canEdit && (
            <Button asChild size="sm">
              <Link
                to={`/attendance/${session.allocation}/${session.date}?period=${session.period}`}
              >
                <Pencil className="size-4" aria-hidden />
                Edit attendance
              </Link>
            </Button>
          )}
        </div>
      </div>
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
  const records = useMemo(
    () => sortStudentsByName(detail.data?.records ?? [], nameSort),
    [detail.data?.records, nameSort]
  )

  return (
    <div className="border-t bg-band p-3">
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
        <div className="overflow-x-auto border bg-table-surface">
          <table className="w-full bg-table-surface text-sm">
            <thead className="border-b bg-table-header text-left text-table-header-foreground">
              <tr>
                <th className="w-14 px-3 py-2 font-semibold">#</th>
                <th className="w-28 px-3 py-2 font-semibold">Roll</th>
                <th className="px-3 py-2 font-semibold">
                  <StudentNameSortButton
                    direction={nameSort}
                    onChange={setNameSort}
                  />
                </th>
                <th className="w-40 px-3 py-2 font-semibold">Phone</th>
                <th className="w-32 px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((record, index) => (
                <tr key={record.id}>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {record.rollNumber}
                  </td>
                  <td className="px-3 py-2 font-medium">{record.fullName}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">
                    {record.phoneNo || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={STATUS_STYLES[record.status]}
                    >
                      {ATTENDANCE_LABELS[record.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
