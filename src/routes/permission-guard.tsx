import { Navigate } from "react-router-dom"

import {
  useHasPermission,
  useHasRole,
  useIsSuperUser,
} from "@/hooks/use-has-permissions"
import { useAppSelector } from "@/lib/redux/hooks"

interface PermissionGuardProps {
  permission?: string
  role?: string
  allowedRoles?: string[]
  deniedRoles?: string[]
  superuserOnly?: boolean
  children: React.ReactNode
}

export default function PermissionGuard({
  permission,
  role,
  allowedRoles,
  deniedRoles,
  superuserOnly = false,
  children,
}: PermissionGuardProps) {
  const hasPermission = useHasPermission(permission)
  const hasRole = useHasRole(role)
  const isSuperuser = useIsSuperUser()
  const roles = useAppSelector((state) => state.auth.profile?.roles ?? [])
  const hasAllowedRole =
    !allowedRoles ||
    isSuperuser ||
    roles.some((item) => allowedRoles.includes(item.codename))
  const hasDeniedRole = deniedRoles?.some((codename) =>
    roles.some((item) => item.codename === codename)
  )

  if (
    !hasPermission ||
    !hasRole ||
    !hasAllowedRole ||
    hasDeniedRole ||
    (superuserOnly && !isSuperuser)
  ) {
    return <Navigate to="/401" replace />
  }

  return <>{children}</>
}
