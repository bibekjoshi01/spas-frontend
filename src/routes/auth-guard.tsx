import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { auth } from "@/lib/redux/auth"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchMe } from "@/pages/auth/redux/auth.api"
import {
  sessionCheckStarted,
  sessionInvalidated,
  setProfile,
} from "@/pages/auth/redux/auth.slice"
import InitialPasswordChange from "@/pages/auth/initial-password-change"

let validationRequest: {
  sessionKey: string
  promise: ReturnType<typeof fetchMe>
} | null = null

export default function AuthGuard() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { isAuthenticated, sessionStatus, profile } = useAppSelector(
    (state) => state.auth
  )
  // Refresh tokens identify the session while access tokens rotate/expire.
  const sessionKey = auth.getRefresh() || auth.getAccess()
  const [validation, setValidation] = useState<{
    key: string
    failed: boolean
  } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const recheck = () => setAttempt((value) => value + 1)
    window.addEventListener("focus", recheck)
    return () => window.removeEventListener("focus", recheck)
  }, [])

  useEffect(() => {
    if (!sessionKey) return

    let cancelled = false

    dispatch(sessionCheckStarted())
    if (!validationRequest || validationRequest.sessionKey !== sessionKey) {
      const promise = fetchMe().finally(() => {
        if (validationRequest?.promise === promise) validationRequest = null
      })
      validationRequest = { sessionKey, promise }
    }

    const request = validationRequest.promise
    request
      .then((profile) => {
        if (
          !cancelled &&
          (auth.getRefresh() || auth.getAccess()) === sessionKey
        ) {
          dispatch(setProfile(profile))
          setValidation({ key: sessionKey, failed: false })
        }
      })
      .catch((error) => {
        if (
          !cancelled &&
          (auth.getRefresh() || auth.getAccess()) === sessionKey
        ) {
          if (
            error.response?.status === 401 ||
            error.response?.status === 403
          ) {
            dispatch(sessionInvalidated())
          } else {
            setValidation({ key: sessionKey, failed: true })
          }
        }
      })

    return () => {
      cancelled = true
    }
  }, [sessionKey, dispatch, attempt])

  if (!sessionKey) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (validation?.key === sessionKey && validation.failed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="space-y-3 text-center">
          <p className="text-sm">
            Could not check your session. Please try again.
          </p>
          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => {
              setValidation(null)
              setAttempt((value) => value + 1)
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (sessionStatus !== "ready" || validation?.key !== sessionKey) {
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

  if (profile?.mustChangePassword) {
    return <InitialPasswordChange />
  }

  return <Outlet />
}
