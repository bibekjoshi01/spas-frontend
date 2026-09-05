import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Save } from "lucide-react"

import { InlineSpinner, QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsSuperUser } from "@/hooks/use-has-permissions"
import {
  type CalendarDay,
  type CalendarMonth,
  type CalendarSystem,
  useGetCalendarSettingsQuery,
  useGetCalendarYearQuery,
  useUpdateCalendarSettingsMutation,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { localDateKey } from "@/lib/utils/date"
import { notifier } from "@/lib/utils/notifier"

import { CalendarDayDialog } from "./calendar-day-dialog"

/**
 * The week, Sunday first.
 *
 * `weekday` arrives as `date.isoweekday()` — Monday 1 through Sunday 7 — so a
 * cell's column is `weekday % 7`, which lands Sunday at 0 without a lookup.
 */
const WEEKDAYS = [
  { iso: 7, en: "Sun", np: "आइत" },
  { iso: 1, en: "Mon", np: "सोम" },
  { iso: 2, en: "Tue", np: "मंगल" },
  { iso: 3, en: "Wed", np: "बुध" },
  { iso: 4, en: "Thu", np: "बिहि" },
  { iso: 5, en: "Fri", np: "शुक्र" },
  { iso: 6, en: "Sat", np: "शनि" },
] as const

const NEPALI_DIGITS = "०१२३४५६७८९"

/** `2082` -> `२०८२`. The digit map is fixed, unlike the calendar table. */
function toNepaliDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => NEPALI_DIGITS[Number(digit)])
}

const column = (day: CalendarDay) => day.weekday % 7

export function AcademicCalendarSection() {
  const isSuperUser = useIsSuperUser()
  const [system, setSystem] = useState<CalendarSystem>("BS")
  const [year, setYear] = useState<number | undefined>(undefined)
  const [openDate, setOpenDate] = useState<string | null>(null)

  const calendar = useGetCalendarYearQuery({ system, year })
  const data = calendar.data
  const nepali = system === "BS"
  const today = useMemo(() => localDateKey(), [])

  // Left to the compiler to memoize; hand-rolling it here defeated the rule
  // that keeps that optimisation available.
  const openDay =
    (openDate &&
      data?.months
        .flatMap((month) => month.days.map((day) => ({ day, month })))
        .find((pair) => pair.day.date === openDate)) ||
    null

  const step = (delta: number) => {
    if (!data) return
    const next = data.year + delta
    if (next < data.minYear || next > data.maxYear) return
    setYear(next)
  }

  const switchSystem = (next: CalendarSystem) => {
    // The years are not comparable across systems, so changing the calendar
    // returns to that system's current year rather than carrying a number over.
    setSystem(next)
    setYear(undefined)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border bg-card p-2">
        <div
          className="flex items-center gap-1 rounded-sm border p-0.5"
          role="group"
          aria-label="Calendar system"
        >
          {(["BS", "AD"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={system === option ? "default" : "ghost"}
              aria-pressed={system === option}
              onClick={() => switchSystem(option)}
            >
              {option === "BS" ? "नेपाली" : "English"}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous year"
            disabled={!data || data.year <= data.minYear}
            onClick={() => step(-1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="min-w-24 text-center text-lg font-bold tabular-nums">
            {data
              ? `${nepali ? toNepaliDigits(data.year) : data.year} ${system}`
              : "—"}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next year"
            disabled={!data || data.year >= data.maxYear}
            onClick={() => step(1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        <Legend />
      </div>

      <WeekendPolicy canManage={isSuperUser} />

      <QueryState
        isLoading={calendar.isLoading}
        isFetching={calendar.isFetching && !calendar.isLoading}
        error={calendar.error}
        onRetry={calendar.refetch}
        skeleton={<YearSkeleton />}
      >
        {data && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.months.map((month) => (
              <MonthCard
                key={month.index}
                month={month}
                nepali={nepali}
                today={today}
                onPick={setOpenDate}
              />
            ))}
          </div>
        )}
      </QueryState>

      {openDay && (
        <CalendarDayDialog
          day={openDay.day}
          canManage={isSuperUser}
          heading={`${nepali ? openDay.month.nameNepali : openDay.month.name} ${openDay.day.dayLabel}`}
          subheading={
            nepali
              ? `${openDay.day.date} · ${openDay.day.entries[0]?.nepaliDate ?? ""}`.trim()
              : openDay.day.date
          }
          onClose={() => setOpenDate(null)}
        />
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-destructive-soft ring-1 ring-destructive/40" />
        Holiday
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-band-info ring-1 ring-primary/40" />
        Event
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-band" />
        Weekend
      </span>
    </div>
  )
}

function WeekendPolicy({ canManage }: { canManage: boolean }) {
  const settings = useGetCalendarSettingsQuery()
  const [update, state] = useUpdateCalendarSettingsMutation()
  const [draft, setDraft] = useState<number[] | null>(null)

  const saved = settings.data?.weekendDays ?? []
  const chosen = draft ?? saved
  const dirty =
    draft !== null && [...draft].sort().join() !== [...saved].sort().join()

  const toggle = (iso: number, checked: boolean) => {
    const next = checked
      ? [...chosen, iso]
      : chosen.filter((day) => day !== iso)
    setDraft(next)
  }

  return (
    <section className="border bg-card">
      <div className="border-b bg-band px-3 py-2.5">
        <h2 className="font-semibold">Weekend days</h2>
        <p className="text-xs text-muted-foreground">
          The days the college does not teach. Every other screen will schedule
          around them.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3">
        {settings.isLoading
          ? WEEKDAYS.map((day) => (
              <Skeleton key={day.iso} className="h-5 w-20" />
            ))
          : WEEKDAYS.map((day) => (
              <Label
                key={day.iso}
                className={cn(
                  "flex items-center gap-2 text-sm font-normal",
                  canManage ? "cursor-pointer" : "cursor-default"
                )}
              >
                <Checkbox
                  checked={chosen.includes(day.iso)}
                  disabled={!canManage || state.isLoading}
                  onCheckedChange={(checked) =>
                    toggle(day.iso, checked === true)
                  }
                />
                {day.en}
              </Label>
            ))}

        {canManage && (
          <Button
            size="sm"
            className="ml-auto"
            disabled={!dirty || state.isLoading}
            onClick={async () => {
              try {
                await update({ weekendDays: chosen }).unwrap()
                setDraft(null)
                notifier.success("Weekend days saved.")
              } catch {
                notifier.error("Could not save the weekend days.")
              }
            }}
          >
            {state.isLoading ? (
              <InlineSpinner />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {dirty ? "Save weekend" : "Saved"}
          </Button>
        )}
      </div>
    </section>
  )
}

function MonthCard({
  month,
  nepali,
  today,
  onPick,
}: {
  month: CalendarMonth
  nepali: boolean
  today: string
  onPick: (date: string) => void
}) {
  const leading = month.days.length ? column(month.days[0]) : 0
  const span = monthSpan(month)

  return (
    <section className="border bg-card">
      <div className="flex items-baseline justify-between gap-2 border-b bg-band px-3 py-2">
        <h3 className="font-semibold">
          {nepali ? month.nameNepali : month.name}
        </h3>
        <span className="text-xs text-muted-foreground">{span}</span>
      </div>

      <div className="grid grid-cols-7 border-b text-center text-[11px] font-semibold text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <span key={day.iso} className="py-1.5">
            {nepali ? day.np : day.en}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: leading }).map((_, index) => (
          <span key={`lead-${index}`} aria-hidden />
        ))}
        {month.days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            isToday={day.date === today}
            onPick={onPick}
          />
        ))}
      </div>
    </section>
  )
}

function DayCell({
  day,
  isToday,
  onPick,
}: {
  day: CalendarDay
  isToday: boolean
  onPick: (date: string) => void
}) {
  const holiday = day.entries.some((entry) => entry.kind === "HOLIDAY")
  const event = !holiday && day.entries.length > 0
  const label = day.entries.length
    ? `${day.date}: ${day.entries.map((entry) => entry.title).join(", ")}`
    : day.date

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => onPick(day.date)}
      className={cn(
        "relative aspect-square border-r border-b p-1 text-sm transition-colors last:border-r-0 hover:bg-accent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        day.isWeekend && "bg-band",
        holiday && "bg-destructive-soft font-semibold text-destructive",
        event && "bg-band-info font-semibold text-band-info-foreground",
        isToday && "ring-2 ring-primary ring-inset"
      )}
    >
      <span className="tabular-nums">{day.dayLabel}</span>
      {day.entries.length > 1 && (
        <span className="absolute right-1 bottom-1 text-[9px] tabular-nums opacity-70">
          {day.entries.length}
        </span>
      )}
    </button>
  )
}

/** "14 Apr – 14 May 2025" — where a Nepali month actually falls. */
function monthSpan(month: CalendarMonth): string {
  if (!month.days.length) return ""
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    })
  const first = month.days[0].date
  const last = month.days[month.days.length - 1].date
  return `${format(first)} – ${format(last)} ${last.slice(0, 4)}`
}

function YearSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="border bg-card">
          <div className="border-b bg-band px-3 py-2">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-7 gap-px p-1">
            {Array.from({ length: 35 }).map((_, cell) => (
              <Skeleton key={cell} className="aspect-square rounded-none" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
