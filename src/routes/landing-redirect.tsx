import { Navigate } from "react-router-dom"

import { useAppSelector } from "@/lib/redux/hooks"

import { landingPathFor } from "./route-config"

/**
 * Sends each role to a screen it can actually open.
 *
 * A head of department has no workspace, so landing them on /dashboard would
 * bounce straight to Unauthorized.
 */
export default function LandingRedirect() {
  const profile = useAppSelector((state) => state.auth.profile)

  return (
    <Navigate
      to={landingPathFor(
        profile?.permissions ?? [],
        profile?.isSuperuser ?? false
      )}
      replace
    />
  )
}
