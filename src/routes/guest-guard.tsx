import { Navigate, Outlet } from "react-router-dom"

import { auth } from "@/lib/redux/auth"
import { useAppSelector } from "@/lib/redux/hooks"

export default function GuestGuard() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const hasAccessToken = Boolean(auth.getAccess())

  if (isAuthenticated && hasAccessToken) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
