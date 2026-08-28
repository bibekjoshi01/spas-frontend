import { useAppSelector } from "@/lib/redux/hooks"

export function usePermissions() {
  return useAppSelector((state) => state.auth.profile?.permissions ?? [])
}

export function useIsSuperUser() {
  return useAppSelector((state) => state.auth.isSuperUser ?? false)
}

export function useHasRole(codename?: string) {
  return useAppSelector((state) =>
    codename
      ? (state.auth.profile?.roles.some((role) => role.codename === codename) ??
        false)
      : true
  )
}

export function useHasPermission(
  permission?: string | string[],
  requireAll = false
) {
  const permissions = usePermissions()
  const isSuperUser = useIsSuperUser()

  if (isSuperUser) return true

  // If no permission is provided, we assume the user has access
  if (!permission) return true

  if (typeof permission === "string") {
    return permissions.includes(permission)
  }

  return requireAll
    ? permission.every((p) => permissions.includes(p))
    : permission.some((p) => permissions.includes(p))
}
