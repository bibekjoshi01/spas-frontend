import axios, {
  type AxiosRequestConfig,
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

let tokenRefreshSubscribers: ((token: string) => void)[] = []

const subscribeToTokenRefresh = (callback: (token: string) => void) => {
  tokenRefreshSubscribers.push(callback)
}

const notifyTokenRefreshed = (token: string) => {
  tokenRefreshSubscribers.forEach((callback) => callback(token))
  tokenRefreshSubscribers = []
}

const logout = () => {
  auth.clear()
  localStorage.removeItem("persist:root")
  window.location.replace("/login")
}

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!navigator.onLine) {
      notifier.error("No internet connection available.")
    }

    config.headers = config.headers ?? {}

    const accessToken = auth.getAccess()

    const isExemptRoute = noAuthRoutes.some((path) =>
      config.url?.endsWith(path)
    )

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
  (response: AxiosResponse) => response,

  async (error) => {
    const errorConfig = error.config as AxiosRequestConfig & {
      _retry?: boolean
    }

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

      if (!isAuthExemptRoute && !errorConfig._retry) {
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

            const newToken = response.data.access

            auth.setAccess(newToken)

            notifyTokenRefreshed(newToken)

            isTokenRefreshInProgress = false

            errorConfig.headers = {
              ...errorConfig.headers,
              Authorization: `Bearer ${newToken}`,
            }

            return axiosInstance(errorConfig)
          } catch (refreshError) {
            isTokenRefreshInProgress = false

            notifier.error("Session expired. Please login again.")

            logout()

            throw refreshError
          }
        }

        return new Promise<AxiosResponse>((resolve) => {
          subscribeToTokenRefresh((newToken) => {
            errorConfig.headers = {
              ...errorConfig.headers,
              Authorization: `Bearer ${newToken}`,
            }

            resolve(axiosInstance(errorConfig))
          })
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
