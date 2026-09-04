import { useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  CalendarDays,
  Check,
  Copy,
  MessageSquareText,
  Phone,
  Save,
  Users,
  X,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard"
import { InlineSpinner, QueryState } from "@/components/query-state"
import { RecordHistory } from "@/components/record-history"
import { StudentNameSortButton } from "@/components/student-name-sort"
import {
  sortStudentsByName,
  type StudentNameSortDirection,
} from "@/lib/utils/student-sort"
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
    { allocation, limit: 0 },
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
  const [reasonEdits, setReasonEdits] = useState<Record<number, string>>({})
  const [reasonEnrollment, setReasonEnrollment] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [nameSort, setNameSort] = useState<StudentNameSortDirection>("default")

  const classInfo = classes.data?.find((item) => item.allocation === allocation)
  const semesterReadOnly = classInfo?.semesterStatus !== "RUNNING"
  const sessionIsLoading =
    existing.isLoading || Boolean(existingId && detail.isLoading)
  const sessionError = existing.error ?? detail.error
  const canWrite =
    !semesterReadOnly &&
    !sessionIsLoading &&
    !sessionError &&
    (existingId ? canEditAttendance : canAddAttendance)

  const saved = useMemo(() => {
    const map: Record<number, AttendanceStatus> = {}
    detail.data?.records.forEach((row) => {
      map[row.enrollment] = row.status
    })
    return map
  }, [detail.data])

  const statuses = useMemo(() => ({ ...saved, ...edits }), [saved, edits])
  const savedReasons = useMemo(() => {
    const map: Record<number, string> = {}
    detail.data?.records.forEach((row) => {
      map[row.enrollment] = row.excuseReason
    })
    return map
  }, [detail.data])
  const reasons = useMemo(
    () => ({ ...savedReasons, ...reasonEdits }),
    [reasonEdits, savedReasons]
  )
  const isDirty =
    Object.keys(edits).length > 0 || Object.keys(reasonEdits).length > 0
  const isComplete =
    (roster.data?.length ?? 0) > 0 &&
    roster.data?.every((entry) => Boolean(statuses[entry.enrollment]))

  const visible = useMemo(() => {
    if (!roster.data) return []
    const term = search.trim().toLowerCase()
    const filtered = roster.data.filter(
      (entry) =>
        !term ||
        entry.fullName.toLowerCase().includes(term) ||
        entry.rollNumber.toLowerCase().includes(term) ||
        entry.phoneNo.includes(term)
    )
    return sortStudentsByName(filtered, nameSort)
  }, [nameSort, roster.data, search])

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
    if (status === "EXCUSED") {
      setReasonEnrollment(enrollment)
    } else {
      setReasonEdits((current) => ({ ...current, [enrollment]: "" }))
      setReasonEnrollment((current) =>
        current === enrollment ? null : current
      )
    }
  }

  const markAll = (status: AttendanceStatus) => {
    if (!roster.data) return
    const next: Record<number, AttendanceStatus> = {}
    roster.data.forEach((entry) => {
      next[entry.enrollment] = status
    })
    setEdits(next)
    if (status !== "EXCUSED") {
      setReasonEdits(
        Object.fromEntries(roster.data.map((entry) => [entry.enrollment, ""]))
      )
      setReasonEnrollment(null)
    }
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
    setReasonEdits(
      Object.fromEntries(
        previousDetail.data.records
          .filter((record) => allowed.has(record.enrollment))
          .map((record) => [record.enrollment, record.excuseReason])
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
          excuseReason:
            statuses[entry.enrollment] === "EXCUSED"
              ? reasons[entry.enrollment] || ""
              : "",
        })),
      }).unwrap()

      notifier.success(`Attendance saved for ${result.marked} students.`)
      setEdits({})
      setReasonEdits({})
      setReasonEnrollment(null)
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
              <span className="hidden sm:inline">View attendance history</span>
              <span className="sm:hidden">History</span>
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
        isLoading={roster.isLoading || classes.isLoading || sessionIsLoading}
        error={roster.error ?? classes.error ?? sessionError}
        isEmpty={(roster.data?.length ?? 0) === 0}
        onRetry={() => {
          roster.refetch()
          classes.refetch()
          existing.refetch()
          if (existingId) detail.refetch()
        }}
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
            <div className="border-l-4 border-amber-500 bg-band-warn px-3 py-2 text-sm text-band-warn-foreground">
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

            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={!canWrite || !previousDetail.data}
                onClick={copyPrevious}
              >
                <Copy className="size-4" aria-hidden />
                <span className="hidden sm:inline">Copy previous</span>
                <span className="sm:hidden">Copy</span>
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
            className="bg-card dark:bg-input/30"
          />

          <ul className="divide-y rounded-lg border bg-card">
            <li className="sticky top-0 z-10 flex items-center border-b bg-table-header px-3 py-2 text-table-header-foreground">
              <span className="w-12 shrink-0 sm:w-20">Roll</span>
              <StudentNameSortButton
                direction={nameSort}
                onChange={setNameSort}
              />
            </li>
            {visible.map((entry) => (
              <li
                key={entry.enrollment}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground tabular-nums sm:w-20">
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
                  className="grid w-full grid-cols-4 gap-1 sm:flex sm:w-auto"
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
                          "h-9 px-1 text-xs sm:h-8 sm:px-2.5",
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

          {/* A register edited after the fact is exactly what an audit asks
              about, so the answer sits on the register itself. */}
          {existingId && (
            <RecordHistory
              resource="attendance-session"
              objectId={existingId}
              label="Who changed this register"
            />
          )}
        </div>
      </QueryState>

      {reasonEnrollment !== null &&
        statuses[reasonEnrollment] === "EXCUSED" && (
          <aside
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l bg-background shadow-xl"
            aria-label="Excuse reason"
          >
            <div className="flex items-start justify-between gap-3 border-b p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <MessageSquareText
                    className="size-4 text-sky-600"
                    aria-hidden
                  />
                  Excuse reason
                </div>
                <p className="text-sm text-muted-foreground">
                  {roster.data?.find(
                    (entry) => entry.enrollment === reasonEnrollment
                  )?.fullName ?? "Student"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close excuse reason"
                onClick={() => setReasonEnrollment(null)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="space-y-2 p-4">
              <label htmlFor="excuse-reason" className="text-sm font-medium">
                Comment or reason{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="excuse-reason"
                value={reasons[reasonEnrollment] ?? ""}
                onChange={(event) =>
                  setReasonEdits((current) => ({
                    ...current,
                    [reasonEnrollment]: event.target.value,
                  }))
                }
                maxLength={500}
                rows={7}
                autoFocus
                placeholder="For example: Medical leave supported by a doctor's note"
                className="min-h-36 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p className="text-right text-xs text-muted-foreground tabular-nums">
                {(reasons[reasonEnrollment] ?? "").length}/500
              </p>
              <p className="text-xs text-muted-foreground">
                Saved with this student’s attendance record. Choosing another
                status removes the reason.
              </p>
            </div>
          </aside>
        )}
    </div>
  )
}
