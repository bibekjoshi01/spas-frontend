import { createApi } from "@reduxjs/toolkit/query/react"
import type { AxiosRequestConfig } from "axios"

import { baseURL } from "@/lib/utils/tenant"
import { axiosInstance } from "./axios"

export interface QueryArgs {
  url: string
  method?: AxiosRequestConfig["method"]
  data?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface QueryError {
  status?: number
  data?: unknown
}

const CACHE_TAGS = [
  // Aggregates
  "Overview",
  "ClassSummary",
  "ClassStudents",
  // Teaching
  "AttendanceSession",
  "Roster",
  "Exam",
  "ExamMarks",
  "Assignment",
  "AssignmentSubmissions",
  "ClassPerformance",
  // Academic structure
  "Department",
  "Program",
  "Batch",
  "BatchSemester",
  "Subject",
  "Allocation",
  // People
  "Student",
  "SemesterEnrollment",
  "SubjectEnrollment",
  "User",
  "Role",
  "Permission",
  "Profile",
  "PerformanceWeights",
] as const

/**
 * RTK Query on top of the shared axios instance.
 *
 * Going through axios rather than fetch keeps one place responsible for the
 * bearer token, the refresh-and-retry queue and the offline notice — every
 * query and mutation inherits all of it.
 */
const axiosBaseQuery =
  ({ baseUrl }: { baseUrl: string } = { baseUrl: "" }) =>
  async (
    args: QueryArgs,
    api: {
      dispatch: (action: unknown) => void
      type: "query" | "mutation"
    }
  ) => {
    const { url, method = "GET", data, params, headers } = args

    try {
      const result = await axiosInstance({
        url: baseUrl + url,
        method,
        data,
        params,
        headers,
      })

      // A successful action can change embedded names, counts, eligibility,
      // reports, and table rows outside its immediate resource. Invalidate all
      // active server-data views so mounted tables refetch instead of relying
      // on every mutation author to remember every downstream dependency.
      const isImportPreview =
        data instanceof FormData && data.get("commit") === "false"
      if (api.type === "mutation" && !isImportPreview) {
        api.dispatch(rootAPI.util.invalidateTags([...CACHE_TAGS]))
      }

      return { data: result.data }
    } catch (error) {
      const axiosError = error as {
        isRefreshError?: boolean
        response?: { status: number; data: unknown }
        message: string
      }

      if (axiosError?.isRefreshError) {
        api.dispatch(rootAPI.util.resetApiState())
      }

      return {
        error: {
          status: axiosError?.response?.status,
          data: axiosError?.response?.data ?? axiosError.message,
        } satisfies QueryError,
      }
    }
  }

/**
 * Cache tags mirror the API resources.
 *
 * Recording attendance invalidates the class summaries and the dashboard as
 * well as the session itself, so a teacher never sees a stale percentage after
 * saving — that fan-out is declared on each mutation, not managed by hand.
 */
export const rootAPI = createApi({
  reducerPath: "rootAPI",

  baseQuery: axiosBaseQuery({ baseUrl: baseURL }),

  tagTypes: CACHE_TAGS,

  // A teacher leaves a screen open all day; refetching when the tab regains
  // focus keeps attendance counts honest without a manual refresh.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,

  endpoints: () => ({}),
})
