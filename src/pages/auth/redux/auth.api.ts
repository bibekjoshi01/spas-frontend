import { axiosInstance } from "@/lib/redux/axios"
import type { ITokens, IUserProfile } from "./auth.types"

const USER_ROOT = "user-mod"

export interface LoginPayload {
  persona: string
  password: string
}

export interface LoginResponse extends IUserProfile {
  message: string
  tokens: ITokens
}

export interface UpdateProfilePayload {
  firstName?: string
  middleName?: string
  lastName?: string
  phoneNo?: string
  alternatePhoneNo?: string
  photo?: File | null
}

export async function loginRequest(
  payload: LoginPayload
): Promise<LoginResponse> {
  const { data } = await axiosInstance.post<LoginResponse>(
    `${USER_ROOT}/account/login`,
    payload
  )
  return data
}

export async function fetchMe(): Promise<IUserProfile> {
  const { data } = await axiosInstance.get<IUserProfile>(
    `${USER_ROOT}/account/me`
  )
  return data
}

export async function logoutRequest(refresh: string): Promise<void> {
  await axiosInstance.post(`${USER_ROOT}/account/logout`, { refresh })
}

export async function updateProfileRequest(
  payload: UpdateProfilePayload
): Promise<IUserProfile> {
  const body = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.append(key, value)
  })
  await axiosInstance.patch(`${USER_ROOT}/account/me`, body)
  return fetchMe()
}

export async function changePasswordRequest(payload: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  await axiosInstance.post(`${USER_ROOT}/account/change-password`, payload)
}

export async function requestPasswordReset(persona: string): Promise<string> {
  const { data } = await axiosInstance.post<{ message: string }>(
    `${USER_ROOT}/account/password-reset/request`,
    { persona }
  )
  return data.message
}

export async function verifyPasswordResetCode(
  persona: string,
  code: string
): Promise<string> {
  const { data } = await axiosInstance.post<{ resetToken: string }>(
    `${USER_ROOT}/account/password-reset/verify`,
    { persona, code }
  )
  return data.resetToken
}

export async function confirmPasswordReset(
  resetToken: string,
  newPassword: string
): Promise<string> {
  const { data } = await axiosInstance.post<{ message: string }>(
    `${USER_ROOT}/account/password-reset/confirm`,
    { resetToken, newPassword }
  )
  return data.message
}
