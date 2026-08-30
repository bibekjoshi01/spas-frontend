import { rootAPI } from "@/lib/redux/api-slice"

import type { ImportResult, Student } from "./domain"
import type {
  ListParams,
  MessageResponse,
  MessageWithIdResponse,
  Paginated,
} from "./types"

const STUDENTS = "students-mod"
const USERS = "user-mod"

export interface Role {
  id: number
  name: string
  codename: string
  isSystemManaged: boolean
  isActive: boolean
  permissions: Array<{ id: number; name: string; codename: string }>
}

export interface PermissionCategory {
  id: number
  name: string
  codename: string
  permissions: Array<{ id: number; name: string; codename: string }>
}

export interface AppUser {
  id: number
  uuid: string
  username: string
  fullName: string
  email: string
  phoneNo: string
  alternatePhoneNo: string
  photo: string | null
  isActive: boolean
  isSuperuser: boolean
  roles: Array<{ id: number; name: string; codename: string }>
  dateJoined: string
}

export interface NewStudent {
  batch: number
  rollNumber: string
  registrationNumber?: string
  firstName: string
  middleName?: string
  lastName: string
  gender?: string
  dateOfBirth?: string | null
  email?: string
  phoneNo?: string
  alternatePhoneNo?: string
}

/** Students, staff accounts and the role catalogue. */
export const peopleApi = rootAPI.injectEndpoints({
  endpoints: (build) => ({
    getStudents: build.query<Paginated<Student>, ListParams | void>({
      query: (params) => ({
        url: `${STUDENTS}/students`,
        params: params ?? {},
      }),
      providesTags: ["Student"],
    }),

    getStudent: build.query<Student, number>({
      query: (id) => ({ url: `${STUDENTS}/students/${id}` }),
      providesTags: (_result, _error, id) => [{ type: "Student", id }],
    }),

    importStudents: build.mutation<
      ImportResult,
      { file: File; batch: number; commit: boolean }
    >({
      query: ({ file, batch, commit }) => {
        const form = new FormData()
        form.append("file", file)
        form.append("batch", String(batch))
        form.append("commit", commit ? "true" : "false")
        return {
          url: `${STUDENTS}/students/import`,
          method: "POST",
          data: form,
        }
      },
      // A preview writes nothing, so it must not invalidate anything either.
      invalidatesTags: (_result, _error, arg) =>
        arg.commit ? ["Student", "Batch"] : [],
    }),

    createStudent: build.mutation<MessageWithIdResponse, NewStudent>({
      query: (data) => ({ url: `${STUDENTS}/students`, method: "POST", data }),
      invalidatesTags: ["Student", "Batch"],
    }),

    updateStudent: build.mutation<
      MessageWithIdResponse,
      {
        id: number
        body: Partial<NewStudent> & { status?: string; isActive?: boolean }
      }
    >({
      query: ({ id, body }) => ({
        url: `${STUDENTS}/students/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        "Student",
        { type: "Student", id: arg.id },
      ],
    }),

    deleteStudent: build.mutation<MessageResponse, number>({
      query: (id) => ({ url: `${STUDENTS}/students/${id}`, method: "DELETE" }),
      invalidatesTags: ["Student", "Batch", "ClassSummary"],
    }),

    // Staff accounts -------------------------------------------------------

    getUsers: build.query<Paginated<AppUser>, ListParams | void>({
      query: (params) => ({ url: `${USERS}/users`, params: params ?? {} }),
      providesTags: ["User"],
    }),

    createUser: build.mutation<
      MessageWithIdResponse,
      {
        username: string
        email: string
        password: string
        firstName?: string
        lastName?: string
        phoneNo?: string
        alternatePhoneNo?: string
        roles?: number[]
      }
    >({
      query: (data) => ({ url: `${USERS}/users`, method: "POST", data }),
      invalidatesTags: ["User"],
    }),

    updateUser: build.mutation<
      MessageWithIdResponse,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `${USERS}/users/${id}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["User"],
    }),

    deleteUser: build.mutation<MessageResponse, number>({
      query: (id) => ({ url: `${USERS}/users/${id}`, method: "DELETE" }),
      invalidatesTags: ["User"],
    }),

    /** Pass `assignable: true` to leave out the internal roles. */
    getRoles: build.query<
      Paginated<Role>,
      (ListParams & { assignable?: boolean }) | void
    >({
      query: (params) => ({ url: `${USERS}/roles`, params: params ?? {} }),
      providesTags: ["Role"],
    }),

    getPermissionCatalogue: build.query<PermissionCategory[], void>({
      query: () => ({ url: `${USERS}/permissions` }),
      providesTags: ["Permission"],
    }),
  }),
})

export const {
  useGetStudentsQuery,
  useGetStudentQuery,
  useCreateStudentMutation,
  useImportStudentsMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetPermissionCatalogueQuery,
} = peopleApi
