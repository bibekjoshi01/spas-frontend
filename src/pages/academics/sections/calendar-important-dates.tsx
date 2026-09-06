import { useState } from "react"
import { CalendarOff, PartyPopper } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type {
  CalendarDay,
  CalendarEntryKind,
  CalendarMonth,
  CalendarYear,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { calendarDisplayEntries } from "@/lib/utils/calendar"

type Filter = "ALL" | CalendarEntryKind

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Everything" },
  { value: "HOLIDAY", label: "Holidays" },
  { value: "EVENT", label: "Events" },
]

interface DatedEntry {
  day: CalendarDay
  entry: ReturnType<typeof calendarDisplayEntries>[number]
}

interface MonthGroup {
  month: CalendarMonth
  rows: DatedEntry[]
}

/** Every marked date of the year, month by month, so a term can be read at once. */
function group(year: CalendarYear, filter: Filter): MonthGroup[] {
  return year.months
    .map((month) => ({
      month,
      rows: month.days.flatMap((day) =>
        calendarDisplayEntries(day)
          .filter((entry) => filter === "ALL" || entry.kind === filter)
          .map((entry) => ({ day, entry }))
      ),
    }))
    .filter((group) => group.rows.length > 0)
}

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })

const weekdayName = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  })

export function CalendarImportantDates({
  year,
  onClose,
}: {
  year: CalendarYear
  onClose: () => void
}) {
  const [filter, setFilter] = useState<Filter>("ALL")
  const groups = group(year, filter)
  const all = year.months.flatMap((month) =>
    month.days.flatMap(calendarDisplayEntries)
  )
  const holidays = all.filter((entry) => entry.kind === "HOLIDAY").length

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col sm:max-w-3xl">
        <DialogHeader className="pr-10">
          <DialogTitle>Important dates · {year.year} BS</DialogTitle>
          <DialogDescription>
            {all.length === 0
              ? "Nothing is marked on this year yet."
              : `${holidays} ${holidays === 1 ? "holiday" : "holidays"} and ${
                  all.length - holidays
                } ${all.length - holidays === 1 ? "event" : "events"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter">
          {FILTERS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={filter === option.value ? "default" : "outline"}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {groups.length === 0 && (
            <p className="border bg-card p-6 text-center text-sm text-muted-foreground">
              {all.length === 0
                ? "Mark a date on the calendar and it will be listed here."
                : "Nothing of that kind is marked this year."}
            </p>
          )}

          {groups.map(({ month, rows }) => (
            <section key={month.index} className="border bg-card">
              <div className="flex items-baseline justify-between gap-2 border-b bg-band px-3 py-2">
                <h3 className="font-semibold">{month.name}</h3>
                <span className="text-sm font-semibold">
                  {month.nameNepali}
                </span>
              </div>
              <ul className="divide-y">
                {rows.map(({ day, entry }) => (
                  <li
                    key={`${entry.id}`}
                    className="flex items-start gap-3 px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        "flex w-16 shrink-0 flex-col items-center rounded-sm border py-1",
                        entry.kind === "HOLIDAY"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-info/15 text-info"
                      )}
                    >
                      <span className="text-base leading-none font-bold tabular-nums">
                        {day.dayLabel}
                      </span>
                      <span className="mt-0.5 text-[10px] leading-none tabular-nums opacity-80">
                        {shortDate(day.date)}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            entry.kind === "HOLIDAY"
                              ? "destructive"
                              : "secondary"
                          }
                          className="gap-1"
                        >
                          {entry.kind === "HOLIDAY" ? (
                            <CalendarOff className="size-3" aria-hidden />
                          ) : (
                            <PartyPopper className="size-3" aria-hidden />
                          )}
                          {entry.kind === "HOLIDAY" ? "Holiday" : "Event"}
                        </Badge>
                        <span className="font-medium">{entry.title}</span>
                      </span>
                      {entry.note && (
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {entry.note}
                        </span>
                      )}
                    </span>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {weekdayName(day.date)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
