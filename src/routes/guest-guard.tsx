import { Navigate, Outlet } from "react-router-dom"

import { auth } from "@/lib/redux/auth"
import { useAppSelector } from "@/lib/redux/hooks"

import { landingPathFor } from "./route-config"

export default function GuestGuard() {
  const { isAuthenticated, profile } = useAppSelector((state) => state.auth)
  const hasAccessToken = Boolean(auth.getAccess())

  if (isAuthenticated && hasAccessToken) {
    return (
      <Navigate
        to={landingPathFor(
          profile?.permissions ?? [],
          profile?.isSuperuser ?? false,
          profile?.roles.map((role) => role.codename) ?? []
        )}
        replace
      />
    )
  }

  return <Outlet />
}
