import type { CalendarDay, CalendarEntry } from "@/lib/api"

/** A read-only projection. Derived dates are never sent to calendar-entry writes. */
export function calendarDisplayEntries(
  day: CalendarDay
): Array<
  Pick<CalendarEntry, "kind" | "title" | "note" | "isActive"> & {
    id: number | string
  }
> {
  return [
    ...day.entries,
    ...(day.milestones ?? []).map((item) => ({
      id: item.key,
      kind: "EVENT" as const,
      title: item.title,
      note: "",
      isActive: true,
    })),
  ]
}
