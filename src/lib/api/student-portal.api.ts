import { rootAPI } from "@/lib/redux/api-slice"

import type {
  ClassStudentDetail,
  ClassSummary,
  ManagementStudentReport,
  SemesterStatus,
  AttendanceStatus,
} from "./domain"
import type { Paginated } from "./types"

export interface StudentPortalPolicy {
  updatedAt: string | null
  attendanceWeight: number
  classPerformanceWeight: number
  assignmentWeight: number
  assessmentWeight: number
  attendanceEligibilityThreshold: string
}

export interface StudentPortalSubject {
  enrollment: number
  batchSemester: number
  semester: number
  semesterStatus: SemesterStatus
  isRetake: boolean
  isActive: boolean
  class: Omit<
    ClassSummary,
    | "studentCount"
    | "classesHeld"
    | "attendancePercentage"
    | "teacher"
    | "trend"
  > & {
    creditHours: number
    teacher: { fullName: string }
  }
  attendance: {
    held: number
    present: number
    late: number
    absent: number
    excused: number
    unmarked: number
    percentage: number | null
    eligible: boolean | null
  }
  assessments: Array<
    ClassStudentDetail["assessments"][number] & {
      result: "NOT_RECORDED" | "ABSENT" | "PASS" | "FAIL" | "RECORDED"
    }
  >
  assignments: ClassStudentDetail["assignments"]
  classPerformance: ClassStudentDetail["classPerformance"]
  performancePercentage: number | null
}

export interface StudentPortalSemester {
  id: number
  batchSemester: number
  semester: number
  semesterStatus: SemesterStatus
  batchYear: number
  startDate: string | null
  endDate: string | null
  status: "ACTIVE" | "COMPLETED" | "WITHDRAWN"
  isActive: boolean
}

export interface StudentPortalOverview {
  asOfDate: string
  student: ManagementStudentReport["student"] & {
    firstName: string
    middleName: string
    lastName: string
    gender: string
    dateOfBirth: string | null
  }
  subjects: StudentPortalSubject[]
  semesters: StudentPortalSemester[]
  policy: StudentPortalPolicy
}

export interface StudentPortalAttendance {
  id: number
  date: string
  period: number
  status: AttendanceStatus | null
  excuseReason: string
}

export interface StudentPortalSettings {
  loginEnabled: boolean
  updatedAt: string | null
}

export const studentPortalApi = rootAPI.injectEndpoints({
  endpoints: (build) => ({
    getStudentPortalOverview: build.query<StudentPortalOverview, void>({
      query: () => ({ url: "performance-mod/student-portal/overview" }),
      providesTags: ["StudentPortal"],
    }),
    getStudentPortalSubject: build.query<StudentPortalSubject, number>({
      query: (enrollment) => ({
        url: `performance-mod/student-portal/subjects/${enrollment}`,
      }),
      providesTags: ["StudentPortal"],
    }),
    getStudentPortalAttendance: build.query<
      Paginated<StudentPortalAttendance>,
      { enrollment: number; offset?: number }
    >({
      query: ({ enrollment, offset = 0 }) => ({
        url: `performance-mod/student-portal/subjects/${enrollment}/attendance`,
        params: { limit: 10, offset },
      }),
      providesTags: ["StudentPortal"],
    }),
    getStudentPortalSettings: build.query<StudentPortalSettings, void>({
      query: () => ({ url: "students-mod/settings/student-portal" }),
      providesTags: ["StudentPortal"],
    }),
    updateStudentPortalSettings: build.mutation<
      StudentPortalSettings,
      { loginEnabled: boolean }
    >({
      query: (data) => ({
        url: "students-mod/settings/student-portal",
        method: "PUT",
        data,
      }),
      invalidatesTags: ["StudentPortal"],
    }),
  }),
})

export const {
  useGetStudentPortalOverviewQuery,
  useGetStudentPortalSubjectQuery,
  useGetStudentPortalAttendanceQuery,
  useGetStudentPortalSettingsQuery,
  useUpdateStudentPortalSettingsMutation,
} = studentPortalApi
