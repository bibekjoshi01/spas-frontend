import { rootAPI } from "@/lib/redux/api-slice"

export interface ScheduleChange {
  id: number
  allocation: number
  date: string
  kind: "MAKEUP" | "CANCELLED"
  reason: string
}

export interface ClassCalendarDay {
  date: string
  label: string
  isWeekend: boolean
  holidayTitles: string[]
  outsideSemester: boolean
  isExpected: boolean
  isCancelled: boolean
  isMakeup: boolean
  isScheduled: boolean
  requiresReason: boolean
  scheduleChange: Pick<ScheduleChange, "id" | "kind" | "reason"> | null
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
    getClassCalendarRange: build.query<
      {
        days: ClassCalendarDay[]
        summary: {
          plannedDays: number
          heldDays: number
          cancelledDays: number
          makeupDays: number
          unrecordedDays: number
          isScheduled: boolean
        }
      },
      { allocation: number; date_from: string; date_to: string }
    >({
      query: (params) => ({ url: "performance-mod/calendar/class", params }),
      providesTags: ["AcademicCalendar", "AttendanceSession"],
    }),
    saveClassSchedule: build.mutation<
      ScheduleChange,
      { id?: number; body: Omit<ScheduleChange, "id"> }
    >({
      query: ({ id, body }) => ({
        url: `performance-mod/class-schedule${id ? `/${id}` : ""}`,
        method: id ? "PATCH" : "POST",
        data: body,
      }),
      invalidatesTags: ["AcademicCalendar", "Overview"],
    }),
    removeClassSchedule: build.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `performance-mod/class-schedule/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AcademicCalendar", "Overview"],
    }),
  }),
})

export const {
  useGetClassCalendarDayQuery,
  useGetClassCalendarRangeQuery,
  useSaveClassScheduleMutation,
  useRemoveClassScheduleMutation,
} = api
