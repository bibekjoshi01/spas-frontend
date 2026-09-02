import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { auth } from "@/lib/redux/auth"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchMe } from "@/pages/auth/redux/auth.api"
import {
  sessionCheckStarted,
  sessionInvalidated,
  setProfile,
} from "@/pages/auth/redux/auth.slice"

let validationRequest: {
  accessToken: string
  promise: ReturnType<typeof fetchMe>
} | null = null

export default function AuthGuard() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { isAuthenticated, sessionStatus } = useAppSelector(
    (state) => state.auth
  )
  const accessToken = auth.getAccess()
  const hasAccessToken = Boolean(accessToken)

  useEffect(() => {
    if (!accessToken) return

    let cancelled = false

    dispatch(sessionCheckStarted())
    if (!validationRequest || validationRequest.accessToken !== accessToken) {
      const promise = fetchMe().finally(() => {
        if (validationRequest?.promise === promise) validationRequest = null
      })
      validationRequest = { accessToken, promise }
    }

    const request = validationRequest.promise
    request
      .then((profile) => {
        if (!cancelled && auth.getAccess() === accessToken) {
          dispatch(setProfile(profile))
        }
      })
      .catch(() => {
        if (!cancelled && auth.getAccess() === accessToken) {
          dispatch(sessionInvalidated())
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, dispatch])

  if (!hasAccessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (sessionStatus !== "ready") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">Opening your workspace…</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Checking access and permissions
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
