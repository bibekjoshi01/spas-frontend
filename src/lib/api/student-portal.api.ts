import { rootAPI } from "@/lib/redux/api-slice"

import type { ManagementStudentReport } from "./domain"

export interface StudentPortalPolicy {
  attendanceWeight: number
  classPerformanceWeight: number
  assignmentWeight: number
  assessmentWeight: number
  attendanceEligibilityThreshold: string
}

export interface StudentPortalOverview extends ManagementStudentReport {
  policy: StudentPortalPolicy
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
  useGetStudentPortalSettingsQuery,
  useUpdateStudentPortalSettingsMutation,
} = studentPortalApi
