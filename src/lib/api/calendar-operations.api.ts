import { rootAPI } from "@/lib/redux/api-slice"
import type { CalendarYear } from "./academics.api"

export interface ClassCalendarDay {
  date: string
  label: string
  isWeekend: boolean
  holidayTitles: string[]
  isExpected: boolean
}

const api = rootAPI.injectEndpoints({
  endpoints: (build) => ({
    getClassCalendarDay: build.query<
      ClassCalendarDay,
      { allocation: number; date: string }
    >({
      query: (params) => ({ url: "performance-mod/calendar/class", params }),
      providesTags: ["AcademicCalendar"],
    }),
    getAttendanceCalendar: build.query<
      CalendarYear,
      { allocation: number; year?: number; anchor: string }
    >({
      query: (params) => ({
        url: "performance-mod/calendar/class",
        params: { ...params, system: "BS" },
      }),
      providesTags: ["AcademicCalendar"],
    }),
  }),
})

export const { useGetClassCalendarDayQuery, useGetAttendanceCalendarQuery } =
  api
