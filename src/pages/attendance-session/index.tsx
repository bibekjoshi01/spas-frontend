import { useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  MessageSquareText,
  Phone,
  Save,
  Search,
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  PRESENT:
    "data-[active=true]:border-emerald-600 data-[active=true]:bg-emerald-600 data-[active=true]:text-white dark:data-[active=true]:border-emerald-700 dark:data-[active=true]:bg-emerald-700",
  ABSENT:
    "data-[active=true]:border-rose-600 data-[active=true]:bg-rose-600 data-[active=true]:text-white dark:data-[active=true]:border-rose-700 dark:data-[active=true]:bg-rose-700",
  LATE: "data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500 data-[active=true]:text-white dark:data-[active=true]:border-amber-600 dark:data-[active=true]:bg-amber-600",
  EXCUSED:
    "data-[active=true]:border-sky-600 data-[active=true]:bg-sky-600 data-[active=true]:text-white dark:data-[active=true]:border-sky-700 dark:data-[active=true]:bg-sky-700",
}

export default function AttendanceSessionPage() {
  const canAddAttendance = useHasPermission("add_attendance")
  const canEditAttendance = useHasPermission("edit_attendance")
  const { allocationId, date } = useParams<{
    allocationId: string
    date: string
  }>()
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
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "ALL">(
    "ALL"
  )
  const [nameSort, setNameSort] = useState<StudentNameSortDirection>("default")
  const [currentCell, setCurrentCell] = useState<{
    enrollment: number
    status: AttendanceStatus
  } | null>(null)

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
        (!term ||
          entry.fullName.toLowerCase().includes(term) ||
          entry.rollNumber.toLowerCase().includes(term) ||
          entry.phoneNo.includes(term)) &&
        (statusFilter === "ALL" || statuses[entry.enrollment] === statusFilter)
    )
    return sortStudentsByName(filtered, nameSort)
  }, [nameSort, roster.data, search, statusFilter, statuses])
  const reasonStudent = roster.data?.find(
    (entry) => entry.enrollment === reasonEnrollment
  )

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    }
    roster.data?.forEach((entry) => {
      const status = statuses[entry.enrollment]
      if (status) tally[status] += 1
    })
    return tally
  }, [roster.data, statuses])
  const rosterCount = roster.data?.length ?? 0

  const moveCellFocus = (
    rowIndex: number,
    statusIndex: number,
    key: string
  ) => {
    let nextRow = rowIndex
    let nextStatus = statusIndex

    if (key === "ArrowUp") {
      nextRow = Math.max(0, rowIndex - 1)
      nextStatus = 0
    }
    if (key === "ArrowDown") {
      nextRow = Math.min(visible.length - 1, rowIndex + 1)
      nextStatus = 0
    }
    if (key === "ArrowLeft") nextStatus = Math.max(0, statusIndex - 1)
    if (key === "ArrowRight")
      nextStatus = Math.min(ATTENDANCE_STATUSES.length - 1, statusIndex + 1)

    const entry = visible[nextRow]
    const status = ATTENDANCE_STATUSES[nextStatus]
    if (!entry || !status) return

    setCurrentCell({ enrollment: entry.enrollment, status })
    if (statuses[entry.enrollment] !== status) {
      setStatus(entry.enrollment, status)
    } else if (status === "EXCUSED") {
      setReasonEnrollment(entry.enrollment)
    }
    document
      .getElementById(`attendance-${entry.enrollment}-${status.toLowerCase()}`)
      ?.focus()
  }

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
    <div className="mx-auto max-w-4xl space-y-3 p-3 md:p-4">
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
            <Button asChild variant="outline" size="sm">
              <Link to={`/attendance?class=${allocation}&date=${sessionDate}`}>
                <ArrowLeft className="size-4" aria-hidden />
                <span className="hidden sm:inline">Back to attendance</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <Button
              size="sm"
              className="text-xs sm:text-sm"
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

      <nav
        className="border bg-card px-3 py-2"
        aria-label="Attendance session context"
      >
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
          <li className="font-semibold text-foreground">
            {classInfo?.name ?? "Attendance register"}
          </li>
          {classInfo && (
            <>
              <li aria-hidden>/</li>
              <li>{classInfo.programCode}</li>
              <li aria-hidden>/</li>
              <li>Batch {classInfo.batchYear}</li>
            </>
          )}
          <li aria-hidden>/</li>
          <li>
            {new Date(`${sessionDate}T00:00:00`).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </li>
          <li aria-hidden>/</li>
          <li>Period {requestedPeriod}</li>
          {existingId && (
            <li className="ml-0.5">
              <Badge
                variant="outline"
                className="gap-1 border-emerald-600/30 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              >
                <Check className="size-2.5" aria-hidden />
                Recorded
              </Badge>
            </li>
          )}
        </ol>
      </nav>

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
        <div className="space-y-3">
          {!canWrite && classInfo && !existing.isLoading && (
            <div className="flex items-start gap-2 border border-amber-500/30 bg-band-warn px-3 py-2.5 text-xs text-band-warn-foreground sm:text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                {semesterReadOnly
                  ? `This semester is ${classInfo.semesterStatus.toLowerCase()}. Attendance is available for viewing only.`
                  : "You can view this attendance, but your role does not permit changing it."}
              </p>
            </div>
          )}
          <section
            className="flex flex-col gap-3 border bg-card p-3 xl:flex-row xl:items-center xl:justify-between"
            aria-label="Attendance controls"
          >
            <div
              className="grid w-full grid-cols-5 border-b xl:w-auto"
              role="tablist"
              aria-label="Filter register by attendance status"
            >
              <Button
                type="button"
                role="tab"
                variant="ghost"
                size="sm"
                data-active={statusFilter === "ALL"}
                aria-selected={statusFilter === "ALL"}
                className="h-auto min-w-0 flex-col gap-0 rounded-none border-b-2 border-transparent px-1 py-1.5 text-[10px] text-muted-foreground shadow-none hover:bg-accent hover:text-foreground data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary sm:h-9 sm:flex-row sm:gap-1 sm:px-2 sm:text-xs"
                onClick={() => setStatusFilter("ALL")}
              >
                <span>All</span>
                <strong className="tabular-nums">{rosterCount}</strong>
              </Button>
              {ATTENDANCE_STATUSES.map((status) => (
                <Button
                  key={status}
                  type="button"
                  role="tab"
                  variant="ghost"
                  size="sm"
                  data-active={statusFilter === status}
                  aria-selected={statusFilter === status}
                  className="h-auto min-w-0 flex-col gap-0 rounded-none border-b-2 border-transparent px-1 py-1.5 text-[10px] text-muted-foreground shadow-none hover:bg-accent hover:text-foreground data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary sm:h-9 sm:flex-row sm:gap-1 sm:px-2 sm:text-xs"
                  onClick={() => setStatusFilter(status)}
                >
                  <span>{ATTENDANCE_LABELS[status]}</span>
                  <strong className="tabular-nums">{counts[status]}</strong>
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-3 sm:flex xl:shrink-0 xl:border-t-0 xl:pt-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:min-w-28 sm:text-sm"
                disabled={!canWrite}
                onClick={() => markAll("PRESENT")}
              >
                All present
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:min-w-28 sm:text-sm"
                disabled={!canWrite}
                onClick={() => markAll("ABSENT")}
              >
                All absent
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="col-span-2 w-full text-xs sm:w-auto sm:text-sm"
                disabled={!canWrite || !previousDetail.data}
                onClick={copyPrevious}
              >
                <Copy className="size-4" aria-hidden />
                Copy previous session
              </Button>
            </div>
          </section>

          <section
            className="overflow-hidden border bg-card"
            aria-labelledby="register-heading"
          >
            <div className="flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="register-heading" className="text-sm font-semibold">
                  Student register
                </h2>
                <p className="text-xs text-muted-foreground">
                  {search || statusFilter !== "ALL"
                    ? `${visible.length} of ${rosterCount} students`
                    : `${rosterCount} ${rosterCount === 1 ? "student" : "students"}`}
                </p>
              </div>
              <div className="flex h-8 w-full items-center border bg-background px-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:h-9 sm:max-w-xs sm:px-2">
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

            <ul className="divide-y">
              <li className="sticky top-0 z-10 hidden items-center border-b-2 border-table-header-border bg-table-header px-3 py-2 text-xs font-semibold tracking-wide text-table-header-foreground uppercase sm:flex">
                <span className="w-24 shrink-0">Roll</span>
                <StudentNameSortButton
                  direction={nameSort}
                  onChange={setNameSort}
                />
                <span className="ml-auto pr-2">Attendance status</span>
              </li>
              {visible.map((entry, rowIndex) => (
                <li
                  key={entry.enrollment}
                  data-current={currentCell?.enrollment === entry.enrollment}
                  className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-l-transparent px-2 py-2 transition-colors hover:bg-muted/40 data-[current=true]:border-l-primary data-[current=true]:bg-primary/5 sm:gap-3 sm:px-3 sm:py-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground tabular-nums sm:w-20">
                      {entry.rollNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium sm:text-sm">
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
                    {ATTENDANCE_STATUSES.map((status, statusIndex) => {
                      const active = statuses[entry.enrollment] === status
                      const isCurrent =
                        currentCell?.enrollment === entry.enrollment &&
                        currentCell.status === status
                      return (
                        <Button
                          key={status}
                          id={`attendance-${entry.enrollment}-${status.toLowerCase()}`}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          data-active={active}
                          data-current={isCurrent}
                          aria-pressed={active}
                          disabled={!canWrite}
                          className={cn(
                            "h-8 min-w-0 px-1 text-[10px] data-[current=true]:ring-2 data-[current=true]:ring-primary data-[current=true]:ring-offset-1 data-[current=true]:ring-offset-background sm:min-w-20 sm:px-2.5 sm:text-xs",
                            STATUS_STYLES[status]
                          )}
                          onClick={() => setStatus(entry.enrollment, status)}
                          onFocus={() =>
                            setCurrentCell({
                              enrollment: entry.enrollment,
                              status,
                            })
                          }
                          onKeyDown={(event) => {
                            if (
                              ![
                                "ArrowUp",
                                "ArrowDown",
                                "ArrowLeft",
                                "ArrowRight",
                              ].includes(event.key)
                            )
                              return
                            event.preventDefault()
                            moveCellFocus(rowIndex, statusIndex, event.key)
                          }}
                        >
                          {active && <Check className="size-3.5" aria-hidden />}
                          {ATTENDANCE_LABELS[status]}
                        </Button>
                      )
                    })}
                  </div>
                </li>
              ))}
              {visible.length === 0 && (
                <li className="flex min-h-32 flex-col items-center justify-center px-4 py-8 text-center">
                  <Search
                    className="mb-2 size-6 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-sm font-medium">
                    {search
                      ? "No matching students"
                      : statusFilter === "ALL"
                        ? "No students"
                        : `No ${ATTENDANCE_LABELS[statusFilter].toLowerCase()} students`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {search
                      ? "Try a different name, roll number, or phone number."
                      : "Choose another attendance status to see students."}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1"
                    onClick={() => {
                      setSearch("")
                      setStatusFilter("ALL")
                    }}
                  >
                    {search ? "Clear filters" : "Show all students"}
                  </Button>
                </li>
              )}
            </ul>
          </section>

          {canWrite && !existingId && !isComplete && (
            <p
              className="text-center text-xs font-medium text-amber-700 dark:text-amber-300"
              role="status"
            >
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

      <Sheet
        open={
          reasonEnrollment !== null && statuses[reasonEnrollment] === "EXCUSED"
        }
        onOpenChange={(open) => {
          if (!open) setReasonEnrollment(null)
        }}
      >
        <SheetContent
          className="w-full gap-0 sm:max-w-md"
          showCloseButton
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (!currentCell) return
            requestAnimationFrame(() => {
              document
                .getElementById(
                  `attendance-${currentCell.enrollment}-${currentCell.status.toLowerCase()}`
                )
                ?.focus()
            })
          }}
        >
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquareText className="size-4 text-sky-600" aria-hidden />
              Excuse reason
            </SheetTitle>
            <SheetDescription>
              {reasonStudent
                ? `${reasonStudent.fullName} · ${reasonStudent.rollNumber}`
                : "Add context for this attendance record."}
            </SheetDescription>
          </SheetHeader>
          {reasonEnrollment !== null && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                <label
                  htmlFor="excuse-reason"
                  className="block text-sm font-medium"
                >
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
                  className="min-h-36 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                />
                <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
                  <p>
                    Saved with this student&apos;s attendance record. Choosing
                    another status removes the reason.
                  </p>
                  <span className="shrink-0 tabular-nums">
                    {(reasons[reasonEnrollment] ?? "").length}/500
                  </span>
                </div>
              </div>
            </div>
          )}
          <SheetFooter className="border-t bg-band">
            <SheetClose asChild>
              <Button type="button">Done</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
