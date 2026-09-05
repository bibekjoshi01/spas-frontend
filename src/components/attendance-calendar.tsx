import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetAttendanceCalendarQuery } from "@/lib/api"
import { localDateKey } from "@/lib/utils/date"
import { cn } from "@/lib/utils"

const nepali = (value: number) =>
  String(value).replace(/\d/g, (digit) => "०१२३४५६७८९"[Number(digit)]!)
const englishDate = (value: string) => new Date(`${value}T00:00:00`)

/** Uses the academic calendar's BS conversion and closure policy. */
export function AttendanceCalendar({
  allocation,
  selected,
  onSelect,
  recordedDates,
}: {
  allocation: number
  selected: string
  onSelect: (date: string) => void
  recordedDates: string[]
}) {
  const [year, setYear] = useState<number>()
  const [monthIndex, setMonthIndex] = useState<number>()
  const query = useGetAttendanceCalendarQuery({
    allocation,
    year,
    anchor: selected,
  })
  const data = query.currentData
  const month =
    data?.months.find((item) => item.index === monthIndex) ??
    data?.months.find((item) =>
      item.days.some((day) => day.date === selected)
    ) ??
    data?.months[0]
  const today = localDateKey()
  const move = (step: number) => {
    if (!data || !month) return
    const next = month.index + step
    setYear(data.year + (next < 1 ? -1 : next > 12 ? 1 : 0))
    setMonthIndex(next < 1 ? 12 : next > 12 ? 1 : next)
  }
  if (query.isError)
    return (
      <div className="p-4 text-sm">
        Calendar unavailable{" "}
        <Button variant="ghost" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    )
  if (!data || !month)
    return (
      <p className="p-4 text-sm" role="status">
        Loading calendar…
      </p>
    )
  const first = month.days[0]!
  const last = month.days.at(-1)!
  const range = [first.date, last.date]
    .map((date) =>
      englishDate(date).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    )
    .join(" – ")
  return (
    <div className="w-full space-y-3 p-3 sm:w-[25rem]">
      <div className="flex items-center justify-between gap-2">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Previous month"
          disabled={
            query.isFetching ||
            (data.year === data.minYear && month.index === 1)
          }
          onClick={() => move(-1)}
        >
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <div className="text-xl font-semibold">
            {month.nameNepali} {nepali(data.year)}
          </div>
          <div className="text-xs text-muted-foreground">{range}</div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Next month"
          disabled={
            query.isFetching ||
            (data.year === data.maxYear && month.index === 12)
          }
          onClick={() => move(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="flex justify-center gap-2">
        <select
          aria-label="Nepali month"
          className="min-w-0 rounded border bg-white px-2 py-1 text-sm"
          value={month.index}
          onChange={(event) => setMonthIndex(Number(event.target.value))}
        >
          {data.months.map((item) => (
            <option key={item.index} value={item.index}>
              {item.nameNepali}
            </option>
          ))}
        </select>
        <select
          aria-label="Nepali year"
          className="rounded border bg-white px-2 py-1 text-sm"
          value={data.year}
          onChange={(event) => {
            setYear(Number(event.target.value))
            setMonthIndex(month.index)
          }}
        >
          {Array.from(
            { length: data.maxYear - data.minYear + 1 },
            (_, i) => data.minYear + i
          ).map((item) => (
            <option key={item} value={item}>
              {nepali(item)} / {item}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setYear(undefined)
            setMonthIndex(undefined)
            onSelect(today)
          }}
        >
          Today
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {[
          "आइत / Sun",
          "सोम / Mon",
          "मंगल / Tue",
          "बुध / Wed",
          "बिही / Thu",
          "शुक्र / Fri",
          "शनि / Sat",
        ].map((label) => (
          <span key={label} className="py-1 text-[10px] text-muted-foreground">
            {label}
          </span>
        ))}
        {Array.from({ length: first.weekday % 7 }, (_, i) => (
          <span key={`space-${i}`} />
        ))}
        {month.days.map((day) => {
          const holidays = day.entries.filter(
            (entry) => entry.kind === "HOLIDAY"
          )
          const closed = day.isWeekend || holidays.length > 0
          const recorded = recordedDates.includes(day.date)
          const title = [
            ...day.entries.map((entry) => entry.title),
            ...(day.isWeekend ? ["Weekend"] : []),
          ].join(", ")
          return (
            <button
              key={day.date}
              type="button"
              disabled={day.date > today || query.isFetching}
              aria-pressed={selected === day.date}
              aria-label={`${month.nameNepali} ${day.dayLabel}, ${day.date}${title ? `, ${title}` : ""}${recorded ? ", attendance recorded" : ""}`}
              title={title || undefined}
              onClick={() => onSelect(day.date)}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center rounded border bg-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40",
                closed && "text-red-600",
                selected === day.date && "ring-2 ring-primary",
                day.date === today && "border-primary"
              )}
            >
              <span className="text-lg leading-6">{day.dayLabel}</span>
              <span className="text-[10px] text-muted-foreground">
                {englishDate(day.date).getDate()}
              </span>
              {recorded && (
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-emerald-600" />
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Red: weekend or holiday · Green dot: recorded
      </p>
    </div>
  )
}
