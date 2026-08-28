import { rootAPI } from "@/lib/redux/api-slice"

import type {
  Assignment,
  AssignmentStatus,
  AssignmentSubmission,
  BatchSemesterPerformanceReport,
  AttendanceSessionDetail,
  AttendanceSessionSummary,
  AttendanceAttention,
  AttendanceStatus,
  ClassStudent,
  ClassStudentDetail,
  ClassPerformanceRating,
  ClassSummary,
  DashboardOverview,
  Exam,
  ExamMark,
  ExamType,
  ManagementStudentReport,
  RosterEntry,
} from "./domain"
import type {
  ListParams,
  MessageResponse,
  MessageWithIdResponse,
  Paginated,
} from "./types"

const PERFORMANCE = "performance-mod"

export interface PerformanceWeights {
  attendanceWeight: number
  classPerformanceWeight: number
  assignmentWeight: number
  assessmentWeight: number
  updatedAt: string
}

/**
 * Everything a teacher does, in one slice.
 *
 * Each mutation declares the aggregates it invalidates, so saving attendance
 * refreshes the class percentages and the dashboard without any screen having
 * to remember to refetch.
 */
export const teachingApi = rootAPI.injectEndpoints({
  endpoints: (build) => ({
    getPerformanceWeights: build.query<PerformanceWeights, void>({
      query: () => ({ url: `${PERFORMANCE}/settings/performance-weights` }),
      providesTags: ["PerformanceWeights"],
    }),

    updatePerformanceWeights: build.mutation<
      PerformanceWeights,
      Omit<PerformanceWeights, "updatedAt">
    >({
      query: (body) => ({
        url: `${PERFORMANCE}/settings/performance-weights`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["PerformanceWeights"],
    }),
    // Aggregates -----------------------------------------------------------

    getDashboardOverview: build.query<DashboardOverview, void>({
      query: () => ({ url: `${PERFORMANCE}/analytics/overview` }),
      providesTags: ["Overview"],
    }),

    getAttendanceAttention: build.query<
      Paginated<AttendanceAttention>,
      ListParams | void
    >({
      query: (params) => ({
        url: `${PERFORMANCE}/analytics/attendance-attention`,
        params: params || undefined,
      }),
      providesTags: ["Overview"],
    }),

    getManagementStudentReport: build.query<ManagementStudentReport, number>({
      query: (studentId) => ({
        url: `${PERFORMANCE}/analytics/students/${studentId}/report`,
      }),
      providesTags: (_result, _error, studentId) => [
        { type: "Student", id: studentId },
      ],
    }),

    getBatchSemesterPerformanceReport: build.query<
      BatchSemesterPerformanceReport,
      ListParams & { batchSemester: number }
    >({
      query: ({ batchSemester, ...params }) => ({
        url: `${PERFORMANCE}/analytics/batch-semester-report`,
        params: { ...params, batch_semester: batchSemester },
      }),
      providesTags: ["Overview"],
    }),

    getClasses: build.query<
      ClassSummary[],
      void | { semesterStatus?: "UPCOMING" | "RUNNING" | "COMPLETED" }
    >({
      query: (params) => ({
        url: `${PERFORMANCE}/analytics/classes`,
        params: params?.semesterStatus
          ? { semester_status: params.semesterStatus }
          : undefined,
      }),
      providesTags: ["ClassSummary"],
    }),

    getClassStudents: build.query<ClassStudent[], number>({
      query: (allocation) => ({
        url: `${PERFORMANCE}/analytics/classes/${allocation}/students`,
      }),
      providesTags: (_result, _error, allocation) => [
        { type: "ClassStudents", id: allocation },
      ],
    }),

    getClassStudentDetail: build.query<
      ClassStudentDetail,
      { allocation: number; enrollment: number }
    >({
      query: ({ allocation, enrollment }) => ({
        url: `${PERFORMANCE}/analytics/classes/${allocation}/students/${enrollment}`,
      }),
      providesTags: (_result, _error, arg) => [
        { type: "ClassStudents", id: arg.allocation },
      ],
    }),

    // Roster ---------------------------------------------------------------

    getRoster: build.query<RosterEntry[], number>({
      query: (allocation) => ({
        url: `${PERFORMANCE}/roster`,
        params: { allocation },
      }),
      providesTags: (_result, _error, allocation) => [
        { type: "Roster", id: allocation },
      ],
    }),

    getClassPerformance: build.query<ClassPerformanceRating[], number>({
      query: (allocation) => ({
        url: `${PERFORMANCE}/class-performance`,
        params: { allocation },
      }),
      providesTags: (_result, _error, allocation) => [
        { type: "ClassPerformance", id: allocation },
      ],
    }),

    saveClassPerformance: build.mutation<
      MessageResponse & { saved: number; cleared: number },
      {
        allocation: number
        entries: Array<{
          enrollment: number
          score: number | null
          remarks?: string
        }>
      }
    >({
      query: (body) => ({
        url: `${PERFORMANCE}/class-performance`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ClassPerformance", id: arg.allocation },
        { type: "ClassStudents", id: arg.allocation },
      ],
    }),

    // Attendance -----------------------------------------------------------

    getAttendanceSessions: build.query<
      Paginated<AttendanceSessionSummary>,
      { allocation?: number; date?: string; limit?: number; offset?: number }
    >({
      query: (params) => ({
        url: `${PERFORMANCE}/attendance-sessions`,
        params,
      }),
      providesTags: ["AttendanceSession"],
    }),

    getAttendanceSession: build.query<AttendanceSessionDetail, number>({
      query: (id) => ({ url: `${PERFORMANCE}/attendance-sessions/${id}` }),
      providesTags: (_result, _error, id) => [
        { type: "AttendanceSession", id },
      ],
    }),

    /**
     * Record a class and its whole roster in one call.
     *
     * Posting the same allocation and date again corrects that class rather
     * than creating a second one, so the screen can simply save what is on it.
     */
    recordAttendance: build.mutation<
      MessageWithIdResponse & { marked: number },
      {
        allocation: number
        date: string
        period?: number
        entries: Array<{ enrollment: number; status: AttendanceStatus }>
      }
    >({
      query: (body) => ({
        url: `${PERFORMANCE}/attendance-sessions`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        "AttendanceSession",
        "ClassSummary",
        "Overview",
        { type: "ClassStudents", id: arg.allocation },
      ],
    }),

    deleteAttendanceSession: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${PERFORMANCE}/attendance-sessions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AttendanceSession", "ClassSummary", "Overview"],
    }),

    // Internal exams -------------------------------------------------------

    getExams: build.query<
      Paginated<Exam>,
      { allocation?: number; limit?: number }
    >({
      query: (params) => ({ url: `${PERFORMANCE}/internal-exams`, params }),
      providesTags: ["Exam"],
    }),

    createExam: build.mutation<
      MessageWithIdResponse,
      {
        allocation: number
        title: string
        examType: ExamType
        fullMarks: number
        passMarks: number
        examDate?: string | null
      }
    >({
      query: (body) => ({
        url: `${PERFORMANCE}/internal-exams`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["Exam", "Overview"],
    }),

    updateExam: build.mutation<
      MessageWithIdResponse,
      { id: number; body: Partial<Omit<Exam, "id" | "uuid" | "allocation">> }
    >({
      query: ({ id, body }) => ({
        url: `${PERFORMANCE}/internal-exams/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Exam"],
    }),

    deleteExam: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${PERFORMANCE}/internal-exams/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Exam", "Overview"],
    }),

    getExamMarks: build.query<ExamMark[], number>({
      query: (examId) => ({
        url: `${PERFORMANCE}/internal-exams/${examId}/marks`,
      }),
      providesTags: (_result, _error, examId) => [
        { type: "ExamMarks", id: examId },
      ],
    }),

    saveExamMarks: build.mutation<
      MessageResponse & { saved: number },
      {
        examId: number
        allocation: number
        entries: Array<{
          enrollment: number
          marksObtained?: string | number | null
          isAbsent?: boolean
        }>
      }
    >({
      query: ({ examId, entries }) => ({
        url: `${PERFORMANCE}/internal-exams/${examId}/marks`,
        method: "POST",
        data: { entries },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ExamMarks", id: arg.examId },
        { type: "ClassStudents", id: arg.allocation },
        "Exam",
      ],
    }),

    // Assignments ----------------------------------------------------------

    getAssignments: build.query<
      Paginated<Assignment>,
      { allocation?: number; limit?: number }
    >({
      query: (params) => ({ url: `${PERFORMANCE}/assignments`, params }),
      providesTags: ["Assignment"],
    }),

    createAssignment: build.mutation<
      MessageWithIdResponse,
      {
        allocation: number
        title: string
        assignedDate: string
        dueDate?: string | null
      }
    >({
      query: (body) => ({
        url: `${PERFORMANCE}/assignments`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["Assignment", "Overview"],
    }),

    updateAssignment: build.mutation<
      MessageWithIdResponse,
      {
        id: number
        body: Partial<Pick<Assignment, "title" | "assignedDate" | "dueDate">>
      }
    >({
      query: ({ id, body }) => ({
        url: `${PERFORMANCE}/assignments/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Assignment"],
    }),

    deleteAssignment: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `${PERFORMANCE}/assignments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Assignment", "Overview"],
    }),

    getAssignmentSubmissions: build.query<AssignmentSubmission[], number>({
      query: (assignmentId) => ({
        url: `${PERFORMANCE}/assignments/${assignmentId}/submissions`,
      }),
      providesTags: (_result, _error, id) => [
        { type: "AssignmentSubmissions", id },
      ],
    }),

    saveAssignmentSubmissions: build.mutation<
      MessageResponse & { saved: number },
      {
        assignmentId: number
        allocation: number
        entries: Array<{
          enrollment: number
          status: AssignmentStatus
          remarks?: string
        }>
      }
    >({
      query: ({ assignmentId, entries }) => ({
        url: `${PERFORMANCE}/assignments/${assignmentId}/submissions`,
        method: "POST",
        data: { entries },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "AssignmentSubmissions", id: arg.assignmentId },
        { type: "ClassStudents", id: arg.allocation },
        "Assignment",
      ],
    }),
  }),
})

export const {
  useGetPerformanceWeightsQuery,
  useUpdatePerformanceWeightsMutation,
  useGetDashboardOverviewQuery,
  useGetAttendanceAttentionQuery,
  useGetManagementStudentReportQuery,
  useGetBatchSemesterPerformanceReportQuery,
  useLazyGetBatchSemesterPerformanceReportQuery,
  useGetClassesQuery,
  useGetClassStudentsQuery,
  useGetClassStudentDetailQuery,
  useGetRosterQuery,
  useGetClassPerformanceQuery,
  useSaveClassPerformanceMutation,
  useGetAttendanceSessionsQuery,
  useGetAttendanceSessionQuery,
  useRecordAttendanceMutation,
  useDeleteAttendanceSessionMutation,
  useGetExamsQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useGetExamMarksQuery,
  useSaveExamMarksMutation,
  useGetAssignmentsQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
  useGetAssignmentSubmissionsQuery,
  useSaveAssignmentSubmissionsMutation,
} = teachingApi
