import axios from "axios"
import { rootAPI } from "@/lib/redux/api-slice"
import { axiosInstance } from "@/lib/redux/axios"
import type { MessageResponse, MessageWithIdResponse, Paginated } from "./types"

export interface Institution {
  id: number
  uuid: string
  name: string
  universityName: string
  instituteName: string
  address: string
}
export type InstitutionInput = Omit<Institution, "id" | "uuid">
export interface EvaluationOptions {
  allocation: number
  sheetDate: string
  programmeSection: string
}
export interface InternalEvaluation {
  institution: InstitutionInput | null
  subject: {
    code: string
    name: string
    fullMarks: number
    passMarks: number
    component: string
  }
  program: string
  academicLevel: string
  examiner: string
  headOfDepartment: string
  bsDate: string
  weights: Record<string, number>
  setupIssues: string[]
  canDownloadBlank: boolean
  canDownloadCalculated: boolean
  rows: {
    enrollment: number
    rollNumber: string
    fullName: string
    mark: number | null
    absent: boolean
    remarks: string
    issues: string[]
  }[]
}
const urlFor = (allocation: number) =>
  `performance-mod/allocations/${allocation}/internal-evaluation`
const api = rootAPI.injectEndpoints({
  endpoints: (build) => ({
    getInstitutions: build.query<Paginated<Institution>, void>({
      query: () => ({
        url: "academics-mod/institutions",
        params: { limit: 0 },
      }),
      providesTags: ["Institution"],
    }),
    createInstitution: build.mutation<MessageWithIdResponse, InstitutionInput>({
      query: (data) => ({
        url: "academics-mod/institutions",
        method: "POST",
        data,
      }),
      invalidatesTags: ["Institution"],
    }),
    updateInstitution: build.mutation<
      MessageWithIdResponse,
      { id: number; body: InstitutionInput }
    >({
      query: ({ id, body }) => ({
        url: `academics-mod/institutions/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["Institution"],
    }),
    archiveInstitution: build.mutation<MessageResponse, number>({
      query: (id) => ({
        url: `academics-mod/institutions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Institution"],
    }),
    getInternalEvaluation: build.query<InternalEvaluation, EvaluationOptions>({
      query: ({ allocation, ...params }) => ({
        url: urlFor(allocation),
        params,
      }),
      // Reopening a dialog always fetches fresh evidence; the server recalculates
      // again for the actual download to cover edits made after this preview.
      keepUnusedDataFor: 0,
      providesTags: [
        "Institution",
        "Subject",
        "Program",
        "PerformanceWeights",
        "Roster",
        "ExamMarks",
        "AssignmentSubmissions",
        "ClassPerformance",
        "AttendanceSession",
      ],
    }),
  }),
})
export const {
  useGetInstitutionsQuery,
  useCreateInstitutionMutation,
  useUpdateInstitutionMutation,
  useArchiveInstitutionMutation,
  useGetInternalEvaluationQuery,
} = api

export async function downloadInternalEvaluation(
  options: EvaluationOptions,
  mode: "blank" | "calculated"
) {
  const { allocation, ...params } = options
  let blob: Blob
  try {
    const response = await axiosInstance.get<Blob>(
      `${urlFor(allocation)}/pdf`,
      { params: { ...params, mode }, responseType: "blob" }
    )
    blob = response.data
    if (!blob.type.includes("application/pdf"))
      throw new Error("The server did not return a PDF sheet.")
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      let data: Record<string, unknown>
      try {
        data = JSON.parse(await error.response.data.text())
      } catch (parseError) {
        throw new Error(
          "Could not download this sheet. Refresh the preview and try again.",
          { cause: parseError }
        )
      }
      const messages = Object.values(data)
        .flat()
        .filter((value): value is string => typeof value === "string")
      throw new Error(messages.join(" ") || "Could not download this sheet.", {
        cause: error,
      })
    }
    throw error
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `internal-evaluation-${allocation}-${mode}-${options.sheetDate}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
