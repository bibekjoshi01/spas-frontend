import { useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { CalendarDays, Check, Copy, Phone, Save, Users } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard"
import { InlineSpinner, QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useHasPermission } from "@/hooks/use-has-permissions"
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  apiErrorMessage,
  useGetAttendanceSessionQuery,
  useGetAttendanceSessionsQuery,
  useGetClassesQuery,
  useGetRosterQuery,
  useRecordAttendanceMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"
import { localDateKey } from "@/lib/utils/date"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: "data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
  ABSENT: "data-[active=true]:bg-rose-600 data-[active=true]:text-white",
  LATE: "data-[active=true]:bg-amber-500 data-[active=true]:text-white",
  EXCUSED: "data-[active=true]:bg-sky-600 data-[active=true]:text-white",
}

export default function AttendanceSessionPage() {
  const canAddAttendance = useHasPermission("add_attendance")
  const canEditAttendance = useHasPermission("edit_attendance")
  const { allocationId, date } = useParams<{
    allocationId: string
    date: string
  }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const allocation = Number(allocationId)
  const sessionDate = date ?? localDateKey()
  const requestedPeriod = Math.max(Number(searchParams.get("period")) || 1, 1)

  const classes = useGetClassesQuery()
  const roster = useGetRosterQuery(allocation, { skip: !allocation })

  // Any attendance already recorded for this date, so re-opening the screen
  // shows what was saved rather than resetting everyone to present.
  const existing = useGetAttendanceSessionsQuery(
    { allocation, date: sessionDate },
    { skip: !allocation }
  )
  const history = useGetAttendanceSessionsQuery(
    { allocation, limit: 200 },
    { skip: !allocation }
  )
  const existingId = existing.data?.results?.find(
    (session) => session.period === requestedPeriod
  )?.id
  const detail = useGetAttendanceSessionQuery(existingId as number, {
    skip: !existingId,
  })
  const previousSession = useMemo(
    () =>
      [...(history.data?.results ?? [])]
        .filter(
          (session) =>
            session.date < sessionDate ||
            (session.date === sessionDate && session.period < requestedPeriod)
        )
        .sort(
          (left, right) =>
            right.date.localeCompare(left.date) || right.period - left.period
        )[0],
    [history.data, requestedPeriod, sessionDate]
  )
  const previousDetail = useGetAttendanceSessionQuery(
    previousSession?.id as number,
    { skip: !previousSession }
  )

  const [record, { isLoading: isSaving }] = useRecordAttendanceMutation()

  // Only the teacher's edits live in state. What is on the server is derived
  // during render and the edits sit on top, so a refetch never discards
  // unsaved marks and there is no effect syncing one into the other.
  const [edits, setEdits] = useState<Record<number, AttendanceStatus>>({})
  const [search, setSearch] = useState("")

  const classInfo = classes.data?.find((item) => item.allocation === allocation)
  const semesterReadOnly = classInfo?.semesterStatus !== "RUNNING"
  const canWrite =
    !semesterReadOnly &&
    !existing.isLoading &&
    (existingId ? canEditAttendance : canAddAttendance)

  const saved = useMemo(() => {
    const map: Record<number, AttendanceStatus> = {}
    detail.data?.records.forEach((row) => {
      map[row.enrollment] = row.status
    })
    return map
  }, [detail.data])

  const statuses = useMemo(() => ({ ...saved, ...edits }), [saved, edits])
  const isDirty = Object.keys(edits).length > 0
  const isComplete =
    (roster.data?.length ?? 0) > 0 &&
    roster.data?.every((entry) => Boolean(statuses[entry.enrollment]))

  const visible = useMemo(() => {
    if (!roster.data) return []
    const term = search.trim().toLowerCase()
    if (!term) return roster.data

    return roster.data.filter(
      (entry) =>
        entry.fullName.toLowerCase().includes(term) ||
        entry.rollNumber.toLowerCase().includes(term) ||
        entry.phoneNo.includes(term)
    )
  }, [roster.data, search])

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    }
    Object.values(statuses).forEach((status) => {
      tally[status] += 1
    })
    return tally
  }, [statuses])

  const setStatus = (enrollment: number, status: AttendanceStatus) => {
    setEdits((current) => ({ ...current, [enrollment]: status }))
  }

  const markAll = (status: AttendanceStatus) => {
    if (!roster.data) return
    const next: Record<number, AttendanceStatus> = {}
    roster.data.forEach((entry) => {
      next[entry.enrollment] = status
    })
    setEdits(next)
  }

  const copyPrevious = () => {
    if (!roster.data || !previousDetail.data) return
    const allowed = new Set(roster.data.map((entry) => entry.enrollment))
    setEdits(
      Object.fromEntries(
        previousDetail.data.records
          .filter((record) => allowed.has(record.enrollment))
          .map((record) => [record.enrollment, record.status])
      )
    )
    notifier.info(
      `Copied attendance from ${new Date(`${previousDetail.data.date}T00:00:00`).toLocaleDateString()}. Review exceptions before saving.`
    )
  }

  const save = async () => {
    if (!roster.data || !isComplete || !canWrite) return

    try {
      const result = await record({
        allocation,
        date: sessionDate,
        period: requestedPeriod,
        entries: roster.data.map((entry) => ({
          enrollment: entry.enrollment,
          status: statuses[entry.enrollment]!,
        })),
      }).unwrap()

      notifier.success(`Attendance saved for ${result.marked} students.`)
      setEdits({})
    } catch (error) {
      notifier.error(apiErrorMessage(error, "Could not save attendance."))
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:space-y-5 md:p-5">
      <UnsavedChangesGuard when={isDirty && !isSaving} />
      <PageHeader
        title={classInfo ? classInfo.name : "Attendance"}
        description={
          classInfo
            ? `${classInfo.code} · ${classInfo.programCode} · Batch ${classInfo.batchYear}`
            : undefined
        }
        meta={
          <>
            <span>{new Date(`${sessionDate}T00:00:00`).toDateString()}</span>
            {existingId && (
              <Badge variant="secondary" className="gap-1">
                <Check className="size-3" aria-hidden />
                Already recorded
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/attendance?class=${allocation}&date=${sessionDate}`)
              }
            >
              <CalendarDays className="size-4" aria-hidden />
              View attendance history
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={!canWrite || isSaving || !isDirty || !isComplete}
            >
              {isSaving ? (
                <InlineSpinner />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {!canWrite
                ? "Read only"
                : existingId && !isDirty
                  ? "Saved"
                  : isComplete
                    ? "Save attendance"
                    : "Unsaved"}
            </Button>
          </>
        }
      />

      <QueryState
        isLoading={roster.isLoading || classes.isLoading}
        error={roster.error}
        isEmpty={(roster.data?.length ?? 0) === 0}
        onRetry={roster.refetch}
        skeleton="table"
        emptyTitle="No students on this class"
        emptyMessage="Register students onto the class before taking attendance."
        emptyAction={
          <Button asChild variant="outline" size="sm">
            <Link to="/students">Manage students</Link>
          </Button>
        }
      >
        <div className="space-y-4">
          {!canWrite && classInfo && !existing.isLoading && (
            <div className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {semesterReadOnly
                ? `This semester is ${classInfo.semesterStatus.toLowerCase()}. Attendance is available for viewing only.`
                : "You can view this attendance, but your role does not permit changing it."}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/10 p-3 dark:border-primary/30 dark:bg-primary/20">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" aria-hidden />
              {ATTENDANCE_STATUSES.map((status) => (
                <span
                  key={status}
                  className="text-muted-foreground tabular-nums"
                >
                  {ATTENDANCE_LABELS[status]}{" "}
                  <strong className="text-foreground">{counts[status]}</strong>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canWrite || !previousDetail.data}
                onClick={copyPrevious}
              >
                <Copy className="size-4" aria-hidden />
                Copy previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canWrite}
                onClick={() => markAll("PRESENT")}
              >
                All present
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canWrite}
                onClick={() => markAll("ABSENT")}
              >
                All absent
              </Button>
            </div>
          </div>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a student by name or roll number"
            aria-label="Find a student"
            className="bg-white dark:bg-input/30"
          />

          <ul className="divide-y rounded-lg border bg-white dark:bg-card">
            {visible.map((entry) => (
              <li
                key={entry.enrollment}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {entry.rollNumber}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {entry.fullName}
                    </span>
                    {entry.phoneNo && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <Phone className="size-3" aria-hidden />
                        {entry.phoneNo}
                      </span>
                    )}
                  </span>
                  {entry.isRetake && (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      Retake
                    </Badge>
                  )}
                </div>

                <div
                  className="flex gap-1"
                  role="group"
                  aria-label={`Status for ${entry.fullName}`}
                >
                  {ATTENDANCE_STATUSES.map((status) => {
                    const active = statuses[entry.enrollment] === status
                    return (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        data-active={active}
                        aria-pressed={active}
                        disabled={!canWrite}
                        className={cn(
                          "h-8 px-2.5 text-xs",
                          STATUS_STYLES[status]
                        )}
                        onClick={() => setStatus(entry.enrollment, status)}
                      >
                        {ATTENDANCE_LABELS[status]}
                      </Button>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>

          {canWrite && !existingId && !isComplete && (
            <p className="text-center text-xs font-medium text-amber-700 dark:text-amber-300">
              Attendance is unsaved. Mark every student before saving.
            </p>
          )}

          {canWrite && isDirty && isComplete && (
            <p className="text-center text-xs text-muted-foreground">
              You have unsaved changes.
            </p>
          )}
        </div>
      </QueryState>
    </div>
  )
}
