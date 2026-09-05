import { rootAPI } from "@/lib/redux/api-slice"

import type { ImportResult, SemesterStatus, UserBrief } from "./domain"
import type {
  BulkResponse,
  ListParams,
  MessageResponse,
  MessageWithIdResponse,
  Paginated,
} from "./types"

const ACADEMICS = "academics-mod"
const STUDENTS = "students-mod"

export interface Department {
  id: number
  uuid: string
  name: string
  code: string
  head: UserBrief | null
  isActive: boolean
  programCount: number
}

export interface Program {
  id: number
  uuid: string
  name: string
  code: string
  totalSemesters: number
  department: { id: number; name: string; code: string }
  coordinator: UserBrief | null
  isActive: boolean
}

export type BatchStatus = "UPCOMING" | "RUNNING" | "GRADUATED"

export interface Batch {
  id: number
  uuid: string
  year: number
  program: { id: number; name: string; code: string }
  studentCount: number
  status: BatchStatus
  graduatedOn: string | null
  isActive: boolean
}

/** What graduating a batch is about to change, before it changes it. */
export interface BatchGraduationPreview {
  batch: string
  semestersTotal: number
  semestersCompleted: number
  canGraduate: boolean
  blocker: string | null
  studentsTotal: number
  studentsToGraduate: number
  studentsAlreadyLeft: number
}

export interface BatchSemester {
  id: number
  uuid: string
  batch: Batch
  semester: number
  status: SemesterStatus
  startDate: string | null
  endDate: string | null
  isActive: boolean
}

export interface Subject {
  id: number
  uuid: string
  code: string
  name: string
  program: { id: number; name: string; code: string }
  semester: number
  creditHours: number
  isElective: boolean
  isActive: boolean
}

export interface SubjectEnrollment {
  id: number
  student: { id: number; rollNumber: string; fullName: string }
  allocation: number
  isRetake: boolean
  isActive: boolean
}

export interface ClassMeeting {
  id?: number
  /** isoweekday(): Monday is 1, Sunday is 7. */
  weekday: number
  startTime: string | null
  endTime: string | null
}

export interface Allocation {
  id: number
  uuid: string
  subject: { id: number; code: string; name: string; semester: number }
  teacher: UserBrief
  batchSemester: {
    id: number
    semester: number
    status: SemesterStatus
    batch: Batch
  }
  enrolledCount: number
  startTime: string | null
  endTime: string | null
  meetings: ClassMeeting[]
  isActive: boolean
}

/**
 * The listings that keep their own copy of a program's identity.
 *
 * Every one of these embeds the program's code or name in its rows, so a
 * rename — or a program moving to another department — leaves them showing
 * something that is no longer true until they are refetched.
 */
const PROGRAM_DEPENDENTS = [
  "Batch",
  "BatchSemester",
  "Subject",
  "Allocation",
  "Student",
  "ClassSummary",
] as const

/** The listings that embed a batch's year. */
const BATCH_DEPENDENTS = [
  "BatchSemester",
  "Allocation",
  "Student",
  "ClassSummary",
] as const

/** The academic structure a head or coordinator maintains. */
export const academicsApi = rootAPI.injectEndpoints({
  endpoints: (build) => ({
    getDepartments: build.query<Paginated<Department>, ListParams | void>({
      query: (params) => ({
        url: `${ACADEMICS}/departments`,
        params: params ?? {},
      }),
      providesTags: ["Department"],
    }),
    createDepartment: build.mutation<
      MessageWithIdResponse,
      { name: string; code: string; head?: number | null }
    >({
      query: (data) => ({
        url: `${ACADEMICS}/departments`,
        method: "POST",
        data,
      }),
      invalidatesTags: ["Department"],
    }),
    updateDepartment: build.mutation<
      MessageWithIdResponse,
      {
        id: number
        body: Partial<Pick<Department, "name" | "code" | "isActive">> & {
          head?: number | null
        }
      }
    >({
      query: ({ id, body }) => ({
        url: `${ACADEMICS}/departments/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Department", "Program"],
    }),
    deleteDepartment: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${ACADEMICS}/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Department", "Program"],
    }),

    getPrograms: build.query<Paginated<Program>, ListParams | void>({
      query: (params) => ({
        url: `${ACADEMICS}/programs`,
        params: params ?? {},
      }),
      providesTags: ["Program"],
    }),
    getAuthorityCandidates: build.query<
      Paginated<UserBrief>,
      { role?: string } | void
    >({
      query: (params) => ({
        url: `${ACADEMICS}/programs/assignment-candidates`,
        params: params ?? {},
      }),
      providesTags: ["User"],
    }),
    createProgram: build.mutation<
      MessageWithIdResponse,
      {
        department: number
        name: string
        code: string
        totalSemesters?: number
        coordinator?: number | null
      }
    >({
      query: (data) => ({ url: `${ACADEMICS}/programs`, method: "POST", data }),
      // The departments table counts programs, so it is stale the moment one
      // is added, moved to another department, or archived.
      invalidatesTags: ["Program", "Department"],
    }),
    updateProgram: build.mutation<
      MessageWithIdResponse,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `${ACADEMICS}/programs/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Program", "Department", ...PROGRAM_DEPENDENTS],
    }),
    deleteProgram: build.mutation<MessageResponse, number>({
      query: (id) => ({ url: `${ACADEMICS}/programs/${id}`, method: "DELETE" }),
      invalidatesTags: ["Program", "Department"],
    }),

    getBatches: build.query<Paginated<Batch>, ListParams | void>({
      query: (params) => ({
        url: `${ACADEMICS}/batches`,
        params: params ?? {},
      }),
      providesTags: ["Batch"],
    }),
    createBatch: build.mutation<
      MessageWithIdResponse,
      { program: number; year: number }
    >({
      query: (data) => ({ url: `${ACADEMICS}/batches`, method: "POST", data }),
      invalidatesTags: ["Batch"],
    }),
    updateBatch: build.mutation<
      MessageWithIdResponse,
      { id: number; body: { year?: number; isActive?: boolean } }
    >({
      query: ({ id, body }) => ({
        url: `${ACADEMICS}/batches/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Batch", ...BATCH_DEPENDENTS],
    }),
    getBatchGraduationPreview: build.query<BatchGraduationPreview, number>({
      query: (id) => ({ url: `${ACADEMICS}/batches/${id}/graduation-preview` }),
    }),
    graduateBatch: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${ACADEMICS}/batches/${id}/graduate`,
        method: "POST",
      }),
      // Graduating rewrites student standing across the cohort, so everything
      // that reads a student or a batch has to be refetched.
      invalidatesTags: ["Batch", "Student", "Overview", "ClassSummary"],
    }),
    undoBatchGraduation: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${ACADEMICS}/batches/${id}/undo-graduation`,
        method: "POST",
      }),
      invalidatesTags: ["Batch", "Student", "Overview", "ClassSummary"],
    }),
    deleteBatch: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${ACADEMICS}/batches/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Batch", "BatchSemester"],
    }),

    getBatchSemesters: build.query<Paginated<BatchSemester>, ListParams | void>(
      {
        query: (params) => ({
          url: `${ACADEMICS}/batch-semesters`,
          params: params ?? {},
        }),
        providesTags: ["BatchSemester"],
      }
    ),
    createBatchSemester: build.mutation<
      MessageWithIdResponse,
      {
        batch: number
        semester: number
        status?: SemesterStatus
        startDate?: string | null
        endDate?: string | null
      }
    >({
      query: (data) => ({
        url: `${ACADEMICS}/batch-semesters`,
        method: "POST",
        data,
      }),
      invalidatesTags: [
        "BatchSemester",
        "Batch",
        "Allocation",
        "ClassSummary",
        "Overview",
      ],
    }),
    updateBatchSemester: build.mutation<
      MessageWithIdResponse,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `${ACADEMICS}/batch-semesters/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: [
        "BatchSemester",
        "Batch",
        "Allocation",
        "ClassSummary",
        "Overview",
      ],
    }),

    getSubjects: build.query<Paginated<Subject>, ListParams | void>({
      query: (params) => ({
        url: `${ACADEMICS}/subjects`,
        params: params ?? {},
      }),
      providesTags: ["Subject"],
    }),
    importSubjects: build.mutation<
      ImportResult,
      { file: File; program: number; commit: boolean }
    >({
      query: ({ file, program, commit }) => {
        const form = new FormData()
        form.append("file", file)
        form.append("program", String(program))
        form.append("commit", commit ? "true" : "false")
        return {
          url: `${ACADEMICS}/subjects/import`,
          method: "POST",
          data: form,
        }
      },
      // A preview writes nothing, so it must not invalidate anything either.
      invalidatesTags: (_result, _error, arg) =>
        arg.commit ? ["Subject"] : [],
    }),

    createSubject: build.mutation<
      MessageWithIdResponse,
      {
        program: number
        semester: number
        code: string
        name: string
        creditHours?: number
        isElective?: boolean
      }
    >({
      query: (data) => ({ url: `${ACADEMICS}/subjects`, method: "POST", data }),
      invalidatesTags: ["Subject"],
    }),
    updateSubject: build.mutation<
      MessageWithIdResponse,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `${ACADEMICS}/subjects/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Subject", "Allocation", "ClassSummary"],
    }),
    deleteSubject: build.mutation<MessageResponse, number>({
      query: (id) => ({ url: `${ACADEMICS}/subjects/${id}`, method: "DELETE" }),
      invalidatesTags: ["Subject"],
    }),

    getAllocations: build.query<Paginated<Allocation>, ListParams | void>({
      query: (params) => ({
        url: `${ACADEMICS}/allocations`,
        params: params ?? {},
      }),
      providesTags: ["Allocation"],
    }),
    createAllocation: build.mutation<
      MessageWithIdResponse,
      {
        batchSemester: number
        subject: number
        teacher: number
        startTime?: string | null
        endTime?: string | null
        meetings?: ClassMeeting[]
      }
    >({
      query: (data) => ({
        url: `${ACADEMICS}/allocations`,
        method: "POST",
        data,
      }),
      invalidatesTags: ["Allocation", "ClassSummary", "Overview"],
    }),
    updateAllocation: build.mutation<
      MessageWithIdResponse,
      {
        id: number
        body: {
          batchSemester?: number
          subject?: number
          teacher: number
          startTime?: string | null
          endTime?: string | null
          /** Omit to leave the timetable untouched; send [] to clear it. */
          meetings?: ClassMeeting[]
          isActive?: boolean
        }
      }
    >({
      query: ({ id, body }) => ({
        url: `${ACADEMICS}/allocations/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Allocation", "ClassSummary", "Overview"],
    }),
    deleteAllocation: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${ACADEMICS}/allocations/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Allocation", "ClassSummary", "Overview"],
    }),

    /** Register a group of students onto a class in one call. */
    getSubjectEnrollments: build.query<
      Paginated<SubjectEnrollment>,
      { allocation: number; limit?: number }
    >({
      query: (params) => ({
        url: `${STUDENTS}/subject-enrollments`,
        params,
      }),
      providesTags: ["SubjectEnrollment"],
    }),

    enrolStudentsOnClass: build.mutation<
      BulkResponse,
      { allocation: number; students: number[]; isRetake?: boolean }
    >({
      query: (data) => ({
        url: `${STUDENTS}/subject-enrollments/bulk`,
        method: "POST",
        data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        "SubjectEnrollment",
        // The allocations table carries the enrolled count, so registering
        // students onto a class changes a row the reader is looking at.
        "Allocation",
        "ClassSummary",
        "Overview",
        { type: "Roster", id: arg.allocation },
        { type: "ClassStudents", id: arg.allocation },
      ],
    }),

    /** Promote a group of students into a semester in one call. */
    enrolStudentsInSemester: build.mutation<
      BulkResponse,
      { batchSemester: number; students: number[]; status?: string }
    >({
      query: (data) => ({
        url: `${STUDENTS}/semester-enrollments/bulk`,
        method: "POST",
        data,
      }),
      invalidatesTags: ["SemesterEnrollment", "Overview"],
    }),
  }),
})

export const {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetProgramsQuery,
  useGetAuthorityCandidatesQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
  useGetBatchesQuery,
  useGetBatchGraduationPreviewQuery,
  useGraduateBatchMutation,
  useUndoBatchGraduationMutation,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
  useGetBatchSemestersQuery,
  useCreateBatchSemesterMutation,
  useUpdateBatchSemesterMutation,
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useImportSubjectsMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetAllocationsQuery,
  useCreateAllocationMutation,
  useUpdateAllocationMutation,
  useDeleteAllocationMutation,
  useGetSubjectEnrollmentsQuery,
  useEnrolStudentsOnClassMutation,
  useEnrolStudentsInSemesterMutation,
} = academicsApi

// Academic calendar
// ------------------------------------------------------------------------------------

export type CalendarSystem = "BS" | "AD"
export type CalendarEntryKind = "HOLIDAY" | "EVENT"

export interface CalendarEntry {
  id: number
  uuid: string
  /** The Gregorian date, which is what the entry is stored against. */
  date: string
  /** The same day read as Bikram Sambat, e.g. `2082-05-20`. */
  nepaliDate: string
  kind: CalendarEntryKind
  title: string
  note: string
  isActive: boolean
}

export interface CalendarDay {
  date: string
  day: number
  /** The day number as the chosen system writes it — `१२` in Nepali. */
  dayLabel: string
  /** `date.isoweekday()`: Monday is 1, Sunday is 7. */
  weekday: number
  isWeekend: boolean
  entries: CalendarEntry[]
}

export interface CalendarMonth {
  index: number
  name: string
  nameNepali: string
  days: CalendarDay[]
}

export interface CalendarYear {
  system: CalendarSystem
  year: number
  minYear: number
  maxYear: number
  weekendDays: number[]
  months: CalendarMonth[]
}

export interface CalendarSettings {
  weekendDays: number[]
}

/**
 * The calendar.
 *
 * The grid arrives already laid out. Bikram Sambat is a published table rather
 * than a formula, and independent copies of it disagree from BS 2084 onward, so
 * the server holds the only one and says which dates fall where — a holiday can
 * then never be saved against one day and drawn on another.
 */
export const calendarApi = rootAPI.injectEndpoints({
  endpoints: (build) => ({
    getCalendarYear: build.query<
      CalendarYear,
      { system: CalendarSystem; year?: number }
    >({
      query: ({ system, year }) => ({
        url: `${ACADEMICS}/calendar/year`,
        params: year ? { system, year } : { system },
      }),
      providesTags: ["AcademicCalendar"],
    }),
    /** The same year, for a student, through the portal's own conditions. */
    getStudentCalendarYear: build.query<
      CalendarYear,
      { system: CalendarSystem; year?: number }
    >({
      query: ({ system, year }) => ({
        url: `${ACADEMICS}/student-portal/calendar/year`,
        params: year ? { system, year } : { system },
      }),
      providesTags: ["AcademicCalendar"],
    }),
    getCalendarSettings: build.query<CalendarSettings, void>({
      query: () => ({ url: `${ACADEMICS}/calendar/settings` }),
      providesTags: ["AcademicCalendar"],
    }),
    updateCalendarSettings: build.mutation<CalendarSettings, CalendarSettings>({
      query: (data) => ({
        url: `${ACADEMICS}/calendar/settings`,
        method: "PUT",
        data,
      }),
      invalidatesTags: ["AcademicCalendar"],
    }),
    createCalendarEntry: build.mutation<
      MessageWithIdResponse,
      { date: string; kind: CalendarEntryKind; title: string; note?: string }
    >({
      query: (data) => ({
        url: `${ACADEMICS}/calendar-entries`,
        method: "POST",
        data,
      }),
      invalidatesTags: ["AcademicCalendar"],
    }),
    updateCalendarEntry: build.mutation<
      MessageWithIdResponse,
      {
        id: number
        body: Partial<{
          date: string
          kind: CalendarEntryKind
          title: string
          note: string
          isActive: boolean
        }>
      }
    >({
      query: ({ id, body }) => ({
        url: `${ACADEMICS}/calendar-entries/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["AcademicCalendar"],
    }),
    deleteCalendarEntry: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${ACADEMICS}/calendar-entries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AcademicCalendar"],
    }),
  }),
})

export const {
  useGetCalendarYearQuery,
  useGetStudentCalendarYearQuery,
  useGetCalendarSettingsQuery,
  useUpdateCalendarSettingsMutation,
  useCreateCalendarEntryMutation,
  useUpdateCalendarEntryMutation,
  useDeleteCalendarEntryMutation,
} = calendarApi
