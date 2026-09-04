import type { ClassMeeting } from "@/lib/api"

/**
 * The teaching week, Sunday first.
 *
 * Saturday is the weekly holiday here rather than a day off the calendar, so it
 * stays in the list — a college that teaches on it can say so. Numbers are
 * `isoweekday()`, which is what the API stores.
 */
export const WEEK = [
  { weekday: 7, short: "Sun", long: "Sunday" },
  { weekday: 1, short: "Mon", long: "Monday" },
  { weekday: 2, short: "Tue", long: "Tuesday" },
  { weekday: 3, short: "Wed", long: "Wednesday" },
  { weekday: 4, short: "Thu", long: "Thursday" },
  { weekday: 5, short: "Fri", long: "Friday" },
  { weekday: 6, short: "Sat", long: "Saturday" },
] as const

export interface DayState {
  on: boolean
  startTime: string
  endTime: string
}

export interface ScheduleState {
  sameTimeEveryDay: boolean
  sharedStart: string
  sharedEnd: string
  days: Record<number, DayState>
}

const blankDay = (): DayState => ({ on: false, startTime: "", endTime: "" })

/** Reads an existing timetable back into the editor's shape. */
export function scheduleFrom(
  meetings: ClassMeeting[] | undefined
): ScheduleState {
  const days: Record<number, DayState> = {}
  for (const { weekday } of WEEK) days[weekday] = blankDay()

  for (const meeting of meetings ?? []) {
    days[meeting.weekday] = {
      on: true,
      startTime: meeting.startTime ?? "",
      endTime: meeting.endTime ?? "",
    }
  }

  const timed = (meetings ?? []).filter((row) => row.startTime && row.endTime)
  // One slot is not evidence of a pattern, so a single day opens per-day.
  const uniform =
    timed.length > 1 &&
    timed.length === (meetings ?? []).length &&
    timed.every(
      (row) =>
        row.startTime === timed[0].startTime && row.endTime === timed[0].endTime
    )

  return {
    sameTimeEveryDay: uniform,
    sharedStart: uniform ? (timed[0].startTime ?? "") : "",
    sharedEnd: uniform ? (timed[0].endTime ?? "") : "",
    days,
  }
}

export function emptySchedule(): ScheduleState {
  return scheduleFrom([])
}

/** The payload the API expects: one row per day the class meets. */
export function meetingsFrom(state: ScheduleState): ClassMeeting[] {
  return WEEK.filter(({ weekday }) => state.days[weekday].on).map(
    ({ weekday }) => {
      const day = state.days[weekday]
      const start = state.sameTimeEveryDay ? state.sharedStart : day.startTime
      const end = state.sameTimeEveryDay ? state.sharedEnd : day.endTime
      return { weekday, startTime: start || null, endTime: end || null }
    }
  )
}

/** Every chosen day needs both times or neither, and start before end. */
export function scheduleIsValid(state: ScheduleState): boolean {
  return meetingsFrom(state).every(
    (row) =>
      Boolean(row.startTime) === Boolean(row.endTime) &&
      (!row.startTime || !row.endTime || row.startTime < row.endTime)
  )
}
