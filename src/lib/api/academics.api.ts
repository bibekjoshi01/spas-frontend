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

export interface Batch {
  id: number
  uuid: string
  year: number
  program: { id: number; name: string; code: string }
  studentCount: number
  isActive: boolean
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
  isActive: boolean
}

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
      invalidatesTags: ["Department"],
    }),
    deleteDepartment: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${ACADEMICS}/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Department"],
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
      invalidatesTags: ["Program"],
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
      invalidatesTags: ["Program"],
    }),
    deleteProgram: build.mutation<MessageResponse, number>({
      query: (id) => ({ url: `${ACADEMICS}/programs/${id}`, method: "DELETE" }),
      invalidatesTags: ["Program"],
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
      invalidatesTags: ["Batch"],
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
      invalidatesTags: ["Subject"],
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
