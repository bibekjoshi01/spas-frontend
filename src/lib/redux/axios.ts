import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"

import { auth } from "@/lib/redux/auth"
import { baseURL } from "@/lib/utils/tenant"
import { notifier } from "@/lib/utils/notifier"

import { noAuthRoutes } from "../constants/routes"

// Axios Instances
export const axiosInstance = axios.create({
  baseURL,
})

const refreshInstance = axios.create({
  baseURL,
})

// Token Refresh Queue
let isTokenRefreshInProgress = false

let tokenRefreshSubscribers: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const subscribeToTokenRefresh = (
  resolve: (token: string) => void,
  reject: (error: unknown) => void
) => {
  tokenRefreshSubscribers.push({ resolve, reject })
}

const notifyTokenRefreshed = (token: string) => {
  tokenRefreshSubscribers.forEach((subscriber) => subscriber.resolve(token))
  tokenRefreshSubscribers = []
}

const notifyTokenRefreshFailed = (error: unknown) => {
  tokenRefreshSubscribers.forEach((subscriber) => subscriber.reject(error))
  tokenRefreshSubscribers = []
}

const logout = () => {
  auth.clear()
  localStorage.removeItem("persist:root")
  window.location.replace("/login")
}

type SessionRequestConfig = InternalAxiosRequestConfig & {
  _sessionKey?: string
  _sessionBound?: boolean
}
const currentSessionKey = () => auth.getRefresh() || auth.getAccess()
const sessionChanged = (config?: SessionRequestConfig) =>
  config?._sessionBound && config._sessionKey !== currentSessionKey()

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config: SessionRequestConfig) => {
    if (!navigator.onLine) {
      notifier.error("No internet connection available.")
    }

    config.headers = config.headers ?? {}

    const accessToken = auth.getAccess()

    const isExemptRoute = noAuthRoutes.some((path) =>
      config.url?.endsWith(path)
    )

    config._sessionBound = !isExemptRoute
    config._sessionKey = currentSessionKey()
    if (accessToken && !isExemptRoute) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    config.headers["Content-Type"] =
      config.data instanceof FormData
        ? "multipart/form-data"
        : "application/json"

    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (sessionChanged(response.config))
      throw new axios.CanceledError("Account changed.")
    return response
  },

  async (error) => {
    const errorConfig = error.config as SessionRequestConfig & {
      _retry?: boolean
    }

    if (sessionChanged(errorConfig))
      throw new axios.CanceledError("Account changed.")

    // Network Errors
    if (axios.isCancel(error)) {
      notifier.error(`Request cancelled: ${error.message}`)
      throw error
    }

    if (error.code === "ERR_NETWORK") {
      notifier.error("Network error.")
      throw error
    }

    // Unauthorized
    if (error.response?.status === 401) {
      const isAuthExemptRoute = noAuthRoutes.some((path) =>
        errorConfig.url?.endsWith(path)
      )

      // Invalid login/reset credentials belong on their form, not a global logout.
      if (isAuthExemptRoute) throw error

      if (!errorConfig._retry) {
        errorConfig._retry = true

        const refreshToken = auth.getRefresh()

        if (!refreshToken) {
          notifier.error("Session expired. Please login again.")
          logout()
          return Promise.reject(error)
        }

        if (!isTokenRefreshInProgress) {
          isTokenRefreshInProgress = true

          try {
            const response = await refreshInstance.post(
              "user-mod/account/token/refresh",
              { refresh: refreshToken }
            )

            if (auth.getRefresh() !== refreshToken) {
              throw new axios.CanceledError(
                "Account changed during session renewal."
              )
            }
            const newToken = response.data.access

            auth.setAccess(newToken)

            notifyTokenRefreshed(newToken)

            isTokenRefreshInProgress = false

            errorConfig.headers.set("Authorization", `Bearer ${newToken}`)

            return axiosInstance(errorConfig)
          } catch (refreshError) {
            isTokenRefreshInProgress = false
            notifyTokenRefreshFailed(refreshError)

            const status = axios.isAxiosError(refreshError)
              ? refreshError.response?.status
              : undefined
            if (status === 400 || status === 401 || status === 403) {
              notifier.error("Session expired. Please login again.")
              logout()
            }
            throw refreshError
          }
        }

        return new Promise<string>((resolve, reject) => {
          subscribeToTokenRefresh(resolve, reject)
        }).then((newToken) => {
          if (sessionChanged(errorConfig))
            throw new axios.CanceledError("Account changed.")
          errorConfig.headers.set("Authorization", `Bearer ${newToken}`)

          return axiosInstance(errorConfig)
        })
      }

      notifier.error("Session expired. Logging you out.")
      logout()

      return Promise.reject(error)
    }

    // Other Errors
    switch (error.response?.status) {
      case 403:
        notifier.error("Permission denied.")
        break

      case 404:
        notifier.error("Resource not found.")
        break

      case 405:
        notifier.error("Method not allowed.")
        break

      default:
        if (error.response?.status >= 500) {
          notifier.error("Server error. Please try again later.")
        }
    }

    throw error
  }
)
