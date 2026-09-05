import { useState } from "react"
import {
  CalendarSearch,
  ChevronLeft,
  ChevronRight,
  Download,
  Save,
} from "lucide-react"

import { InlineSpinner, QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useHasRole, useIsSuperUser } from "@/hooks/use-has-permissions"
import {
  type CalendarDay,
  type CalendarMonth,
  fieldErrorsFrom,
  formErrorFrom,
  useGetCalendarSettingsQuery,
  useGetCalendarYearQuery,
  useGetStudentCalendarYearQuery,
  useUpdateCalendarSettingsMutation,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { localDateKey } from "@/lib/utils/date"
import { notifier } from "@/lib/utils/notifier"

import { CalendarDayDialog } from "./calendar-day-dialog"
import { CalendarDownloadDialog } from "./calendar-download-dialog"
import { CalendarImportantDates } from "./calendar-important-dates"

/**
 * The week, Sunday first.
 *
 * `weekday` arrives as `date.isoweekday()` — Monday 1 through Sunday 7 — so a
 * cell's column is `weekday % 7`, which lands Sunday at 0 with no lookup.
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

const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** Week rows in every month card, so all twelve are the same height. */
const WEEKS = 6

const NEPALI_DIGITS = "०१२३४५६७८९"

/** `2082` -> `२०८२`. The digit map is fixed, unlike the calendar table. */
function toNepaliDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => NEPALI_DIGITS[Number(digit)])
}

const column = (day: CalendarDay) => day.weekday % 7

/** The day of the Gregorian month, read off the date the entry is stored against. */
const englishDay = (date: string) => Number(date.slice(8, 10))

/**
 * "Chaitra (March/April)" — a Bikram Sambat month, and the Gregorian ones it
 * runs across. A BS month starts partway through an AD month, so naming both
 * is how a reader locates it.
 */
function monthHeading(month: CalendarMonth): string {
  if (!month.days.length) return month.nameNepali
  const first = Number(month.days[0].date.slice(5, 7)) - 1
  const last = Number(month.days[month.days.length - 1].date.slice(5, 7)) - 1
  const span =
    first === last
      ? ENGLISH_MONTHS[first]
      : `${ENGLISH_MONTHS[first]}/${ENGLISH_MONTHS[last]}`
  return `${month.name} (${span})`
}

export function AcademicCalendarSection() {
  const isSuperUser = useIsSuperUser()
  const isStudent = useHasRole("STUDENT")
  const [year, setYear] = useState<number | undefined>(undefined)
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [showImportant, setShowImportant] = useState(false)
  const [showDownload, setShowDownload] = useState(false)

  // A student reads the calendar through the portal, which applies its own
  // conditions; everyone else reads the staff endpoint.
  const staff = useGetCalendarYearQuery(
    { system: "BS", year },
    { skip: isStudent }
  )
  const portal = useGetStudentCalendarYearQuery(
    { system: "BS", year },
    { skip: !isStudent }
  )
  const calendar = isStudent ? portal : staff
  const data = calendar.currentData
  const today = localDateKey()

  const markedCount =
    data?.months.reduce(
      (total, month) =>
        total + month.days.reduce((sum, day) => sum + day.entries.length, 0),
      0
    ) ?? 0

  const openDay =
    (openDate &&
      data?.months
        .flatMap((month) => month.days.map((day) => ({ day, month })))
        .find((pair) => pair.day.date === openDate)) ||
    null

  const step = (delta: number) => {
    if (!data || calendar.isFetching) return
    const next = data.year + delta
    if (next < data.minYear || next > data.maxYear) return
    setYear(next)
    setOpenDate(null)
    setShowImportant(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border bg-card p-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous year"
            disabled={!data || calendar.isFetching || data.year <= data.minYear}
            onClick={() => step(-1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="min-w-32 text-center">
            <span className="block text-lg leading-tight font-bold tabular-nums">
              {data ? toNepaliDigits(data.year) : "—"}
            </span>
            <span className="block text-[11px] text-muted-foreground tabular-nums">
              {data ? `${data.year} BS` : ""}
            </span>
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next year"
            disabled={!data || calendar.isFetching || data.year >= data.maxYear}
            onClick={() => step(1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!data || calendar.isFetching || calendar.isError}
            onClick={() => setShowDownload(true)}
          >
            <Download className="size-4" aria-hidden />
            Download calendar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || calendar.isFetching || calendar.isError}
            onClick={() => setShowImportant(true)}
          >
            <CalendarSearch className="size-4" aria-hidden />
            Important dates
            {markedCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 tabular-nums">
                {markedCount}
              </Badge>
            )}
          </Button>
          <Legend />
        </div>
      </div>

      {isSuperUser && <WeekendPolicy />}

      <QueryState
        isLoading={calendar.isLoading || (calendar.isFetching && !data)}
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
                year={data.year}
                today={today}
                weekendDays={data.weekendDays}
                onPick={setOpenDate}
              />
            ))}
          </div>
        )}
      </QueryState>

      {showDownload && data && (
        <CalendarDownloadDialog
          initialYear={data}
          isStudent={isStudent}
          onClose={() => setShowDownload(false)}
        />
      )}

      {showImportant && data && (
        <CalendarImportantDates
          year={data}
          onClose={() => setShowImportant(false)}
        />
      )}

      {openDay && !calendar.isError && (
        <CalendarDayDialog
          key={openDay.day.date}
          day={openDay.day}
          canManage={isSuperUser}
          heading={`${openDay.month.nameNepali} ${openDay.day.dayLabel}`}
          subheading={`${monthHeading(openDay.month)} · ${openDay.day.date}`}
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
        <span className="size-3 rounded-sm bg-destructive/15 ring-1 ring-destructive/50" />
        Holiday
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-info/15 ring-1 ring-info/50" />
        Event
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-band" />
        Weekend
      </span>
    </div>
  )
}

function WeekendPolicy() {
  const settings = useGetCalendarSettingsQuery()
  const [update, state] = useUpdateCalendarSettingsMutation()
  const [draft, setDraft] = useState<number[] | null>(null)

  const saved = settings.data?.weekendDays ?? []
  const chosen = draft ?? saved
  const dirty =
    draft !== null && [...draft].sort().join() !== [...saved].sort().join()
  const validationError =
    fieldErrorsFrom(state.error).weekendDays ?? formErrorFrom(state.error)

  return (
    <section className="border bg-card">
      <div className="border-b bg-band-info px-4 py-3">
        <h2 className="text-base font-bold text-band-info-foreground">
          Weekend days
        </h2>
        <p className="mt-1 text-sm text-band-info-foreground/70">
          Choose which weekdays are marked as weekends on the calendar.
        </p>
      </div>
      <QueryState
        isLoading={settings.isLoading}
        error={settings.error}
        onRetry={settings.refetch}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3">
          {settings.isLoading
            ? WEEKDAYS.map((day) => (
                <Skeleton key={day.iso} className="h-5 w-20" />
              ))
            : WEEKDAYS.map((day) => (
                <Label
                  key={day.iso}
                  className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                >
                  <Checkbox
                    checked={chosen.includes(day.iso)}
                    disabled={state.isLoading || settings.isFetching}
                    onCheckedChange={(checked) =>
                      setDraft(
                        checked === true
                          ? [...chosen, day.iso]
                          : chosen.filter((iso) => iso !== day.iso)
                      )
                    }
                  />
                  {day.en}
                </Label>
              ))}

          <Button
            size="sm"
            className="ml-auto"
            disabled={
              !dirty ||
              state.isLoading ||
              settings.isFetching ||
              chosen.length === 7
            }
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
        </div>
        {chosen.length === 7 && (
          <p role="alert" className="px-3 pb-3 text-sm text-destructive">
            At least one day must remain a teaching day.
          </p>
        )}
        {validationError && (
          <p role="alert" className="px-3 pb-3 text-sm text-destructive">
            {validationError}
          </p>
        )}
      </QueryState>
    </section>
  )
}

function MonthCard({
  month,
  year,
  today,
  weekendDays,
  onPick,
}: {
  month: CalendarMonth
  year: number
  today: string
  weekendDays: number[]
  onPick: (date: string) => void
}) {
  const leading = month.days.length ? column(month.days[0]) : 0
  /*
   * Always six week rows, padded at both ends.
   *
   * A full lattice — the grid shows the border colour through a one-pixel gap
   * — rules every cell on all four sides. Six rows rather than "however many
   * this month needs" because the cards sit in a stretching grid: a 32-day
   * month next to a 29-day one would pull the shorter card taller and strand
   * its bottom rule below a strip of empty card. Every month is 29 to 32 days
   * starting at most six columns in, so six rows always fit.
   */
  const trailing = WEEKS * 7 - leading - month.days.length

  return (
    <section className="overflow-hidden border bg-card">
      <div className="flex items-baseline justify-between gap-2 border-b bg-band px-3 py-2">
        <h3 className="font-semibold">{monthHeading(month)}</h3>
        <span className="shrink-0 text-sm font-semibold">
          {month.nameNepali} {toNepaliDigits(year)}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-px border-b bg-border">
        {WEEKDAYS.map((day) => (
          <span
            key={day.iso}
            className={cn(
              "bg-card py-1.5 text-center text-[11px] font-semibold text-muted-foreground",
              weekendDays.includes(day.iso) && "text-destructive"
            )}
          >
            {day.np}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border">
        {Array.from({ length: leading }).map((_, index) => (
          <span key={`lead-${index}`} className="bg-card" aria-hidden />
        ))}
        {month.days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            isToday={day.date === today}
            onPick={onPick}
          />
        ))}
        {Array.from({ length: trailing }).map((_, index) => (
          <span key={`trail-${index}`} className="bg-card" aria-hidden />
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
      aria-current={isToday ? "date" : undefined}
      onClick={() => onPick(day.date)}
      className={cn(
        "relative flex aspect-square flex-col justify-between bg-card px-1.5 py-1 text-left transition-colors hover:bg-accent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        day.isWeekend && "bg-band",
        holiday && "bg-destructive/15 text-destructive",
        event && "bg-info/15 text-info",
        isToday && "ring-2 ring-primary ring-inset"
      )}
    >
      <span
        className={cn(
          "text-sm leading-none font-semibold tabular-nums",
          (day.isWeekend || holiday) && !event && "text-destructive"
        )}
      >
        {day.dayLabel}
      </span>
      <span className="self-end text-[10px] leading-none text-muted-foreground tabular-nums">
        {englishDay(day.date)}
      </span>
      {day.entries.length > 1 && (
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-current opacity-70" />
      )}
    </button>
  )
}

function YearSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="border bg-card">
          <div className="border-b bg-band px-3 py-2">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid grid-cols-7 gap-px bg-border">
            {Array.from({ length: WEEKS * 7 }).map((_, cell) => (
              <Skeleton key={cell} className="aspect-square rounded-none" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
