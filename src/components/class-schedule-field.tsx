import { useMemo } from "react"

import { Field } from "@/components/form-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { TimePickerInput } from "@/components/ui/date-time-picker"
import type { ClassMeeting } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  type DayState,
  type ScheduleState,
  WEEK,
} from "@/lib/utils/class-schedule"

/**
 * Which days a class meets, and at what time.
 *
 * Colleges split two ways: five days at one fixed hour, or a couple of sessions
 * a week at different hours. "Same time every day" is on by default because the
 * first case is the common one and should cost six clicks rather than five
 * identical rows of time pickers; turning it off reveals the per-day times the
 * second case needs.
 */
export function ClassScheduleField({
  value,
  onChange,
  error,
}: {
  value: ScheduleState
  onChange: (next: ScheduleState) => void
  error?: string
}) {
  const chosen = useMemo(
    () => WEEK.filter(({ weekday }) => value.days[weekday].on),
    [value.days]
  )

  const toggleDay = (weekday: number) =>
    onChange({
      ...value,
      days: {
        ...value.days,
        [weekday]: { ...value.days[weekday], on: !value.days[weekday].on },
      },
    })

  const setDayTime = (weekday: number, patch: Partial<DayState>) =>
    onChange({
      ...value,
      days: { ...value.days, [weekday]: { ...value.days[weekday], ...patch } },
    })

  return (
    <Field
      label="Meets on"
      error={error}
      hint={
        chosen.length
          ? undefined
          : "Leave every day off if the timetable is not settled yet — the class then shows up every day."
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {WEEK.map(({ weekday, short, long }) => {
            const on = value.days[weekday].on
            return (
              <button
                key={weekday}
                type="button"
                aria-pressed={on}
                aria-label={long}
                onClick={() => toggleDay(weekday)}
                className={cn(
                  "min-w-12 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted"
                )}
              >
                {short}
              </button>
            )
          })}
        </div>

        {chosen.length > 0 && (
          <>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={value.sameTimeEveryDay}
                onCheckedChange={(checked) =>
                  onChange({ ...value, sameTimeEveryDay: checked === true })
                }
              />
              Same time every day
            </label>

            {value.sameTimeEveryDay ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TimePickerInput
                  value={value.sharedStart}
                  max={value.sharedEnd || undefined}
                  onValueChange={(sharedStart) =>
                    onChange({ ...value, sharedStart })
                  }
                  aria-label="Start time for every selected day"
                />
                <TimePickerInput
                  value={value.sharedEnd}
                  min={value.sharedStart || undefined}
                  onValueChange={(sharedEnd) =>
                    onChange({ ...value, sharedEnd })
                  }
                  aria-label="End time for every selected day"
                />
              </div>
            ) : (
              <div className="space-y-2 rounded-md border p-2">
                {chosen.map(({ weekday, long }) => (
                  <div
                    key={weekday}
                    className="grid items-center gap-2 sm:grid-cols-[5.5rem_1fr_1fr]"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {long}
                    </span>
                    <TimePickerInput
                      value={value.days[weekday].startTime}
                      max={value.days[weekday].endTime || undefined}
                      onValueChange={(startTime) =>
                        setDayTime(weekday, { startTime })
                      }
                      aria-label={`${long} start time`}
                    />
                    <TimePickerInput
                      value={value.days[weekday].endTime}
                      min={value.days[weekday].startTime || undefined}
                      onValueChange={(endTime) =>
                        setDayTime(weekday, { endTime })
                      }
                      aria-label={`${long} end time`}
                    />
                  </div>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">
                  Leave a day&rsquo;s times empty to record only that it meets.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Field>
  )
}

/** "Sun, Tue · 07:00–08:00" — the timetable on one line, for tables and cards. */
export function ScheduleSummary({
  meetings,
  formatTime,
}: {
  meetings: ClassMeeting[] | undefined
  formatTime: (value: string) => string
}) {
  if (!meetings?.length) {
    return <span className="text-muted-foreground">Every day</span>
  }

  const days = WEEK.filter(({ weekday }) =>
    meetings.some((row) => row.weekday === weekday)
  )
  const timed = meetings.filter((row) => row.startTime && row.endTime)
  const uniform =
    timed.length === meetings.length &&
    timed.every(
      (row) =>
        row.startTime === timed[0].startTime && row.endTime === timed[0].endTime
    )

  return (
    <span className="whitespace-nowrap">
      {days.map((day) => day.short).join(", ")}
      {timed.length > 0 && (
        <span className="text-muted-foreground">
          {uniform
            ? ` · ${formatTime(timed[0].startTime as string)}–${formatTime(timed[0].endTime as string)}`
            : " · varies"}
        </span>
      )}
    </span>
  )
}
