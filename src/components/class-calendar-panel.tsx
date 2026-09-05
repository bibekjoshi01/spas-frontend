import { useState } from "react"
import { Field, FormDialog } from "@/components/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePickerInput } from "@/components/ui/date-time-picker"
import { useHasPermission } from "@/hooks/use-has-permissions"
import {
  fieldErrorsFrom,
  formErrorFrom,
  useGetClassCalendarDayQuery,
  useGetClassCalendarRangeQuery,
  useSaveClassScheduleMutation,
  type ScheduleChange,
} from "@/lib/api"

export function ClassCalendarPanel({
  allocation,
  date,
  writable,
}: {
  allocation: number
  date: string
  writable: boolean
}) {
  const day = useGetClassCalendarDayQuery({ allocation, date })
  const start = `${date.slice(0, 7)}-01`
  const end = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)),
    0
  ).getDate()
  const report = useGetClassCalendarRangeQuery({
    allocation,
    date_from: start,
    date_to: `${date.slice(0, 7)}-${end}`,
  })
  const [open, setOpen] = useState(false)
  const canAdd = useHasPermission("add_attendance")
  const canEdit = useHasPermission("edit_attendance")
  const summary = report.currentData?.summary
  return (
    <div className="space-y-2 border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {day.currentData?.label ??
            (day.isError ? "Calendar unavailable" : "Checking calendar…")}
        </span>
        {writable && (canAdd || canEdit) && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Change schedule
          </Button>
        )}
      </div>
      {summary && (
        <p
          className="text-xs text-muted-foreground"
          title="Plan uses the current timetable and calendar. Held days come from attendance records."
        >
          This month ·{" "}
          {summary.isScheduled
            ? `${summary.plannedDays} planned`
            : "No timetable"}{" "}
          · {summary.heldDays} held · {summary.cancelledDays} cancelled ·{" "}
          {summary.makeupDays} makeup
        </p>
      )}
      {(day.isError || report.isError) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            day.refetch()
            report.refetch()
          }}
        >
          Retry
        </Button>
      )}
      {open && (
        <ScheduleForm
          allocation={allocation}
          initialDate={date}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function ScheduleForm({
  allocation,
  initialDate,
  onClose,
}: {
  allocation: number
  initialDate: string
  onClose: () => void
}) {
  const [date, setDate] = useState(initialDate)
  const [kind, setKind] = useState<ScheduleChange["kind"]>("MAKEUP")
  const [reason, setReason] = useState("")
  const day = useGetClassCalendarDayQuery({ allocation, date }, { skip: !date })
  const [save, state] = useSaveClassScheduleMutation()
  const canAdd = useHasPermission("add_attendance")
  const canEdit = useHasPermission("edit_attendance")
  const existing = day.currentData?.scheduleChange
  const errors = fieldErrorsFrom(state.error)
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Change class schedule"
      submitLabel="Save schedule"
      canSubmit={Boolean(
        date &&
        reason.trim() &&
        day.currentData &&
        !day.isFetching &&
        !day.isError &&
        (existing ? canEdit : canAdd)
      )}
      isSubmitting={state.isLoading}
      formError={formErrorFrom(state.error)}
      onSubmit={async () => {
        try {
          await save({
            id: existing?.id,
            body: { allocation, date, kind, reason },
          }).unwrap()
          onClose()
        } catch {
          /* Field errors below. */
        }
      }}
    >
      <Field label="Date" error={errors.date}>
        <DatePickerInput value={date} onValueChange={setDate} />
      </Field>
      <Field label="Class" error={errors.kind}>
        <div className="flex gap-2">
          {(["MAKEUP", "CANCELLED"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={kind === value ? "default" : "outline"}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {value === "MAKEUP" ? "Makeup class" : "Cancelled"}
            </Button>
          ))}
        </div>
      </Field>
      {existing && (
        <p className="text-xs text-muted-foreground">
          Currently {existing.kind === "MAKEUP" ? "makeup" : "cancelled"}:{" "}
          {existing.reason}
        </p>
      )}
      <Field label="Reason" htmlFor="schedule-reason" error={errors.reason}>
        <Input
          id="schedule-reason"
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Practical class rescheduled"
        />
      </Field>
      {day.isError && (
        <Button type="button" variant="ghost" onClick={() => day.refetch()}>
          Retry calendar
        </Button>
      )}
    </FormDialog>
  )
}
