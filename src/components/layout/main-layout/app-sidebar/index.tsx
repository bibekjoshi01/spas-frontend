import Logo from "@/assets/logo.png"
import { Link } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NAV_ITEMS } from "@/lib/constants/nav-items"
import { useIsSuperUser, usePermissions } from "@/hooks/use-has-permissions"
import { useAppSelector } from "@/lib/redux/hooks"

import NavMain from "./nav-main"
import NavUser from "./nav-user"

export default function AppSidebar() {
  const permissions = usePermissions()
  const isSuperUser = useIsSuperUser()
  const roles = useAppSelector((state) => state.auth.profile?.roles ?? [])

  const items = NAV_ITEMS.filter(
    (item) =>
      item.showInSidebar !== false &&
      (!item.permission ||
        permissions.includes(item.permission) ||
        isSuperUser) &&
      (!item.role || roles.some((role) => role.codename === item.role)) &&
      (!item.allowedRoles ||
        isSuperUser ||
        roles.some((role) => item.allowedRoles?.includes(role.codename))) &&
      (!item.superuserOnly || isSuperUser)
  )

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 border-b">
        <Link
          to="/dashboard"
          aria-label="Go to dashboard"
          className="flex items-center gap-3 rounded-sm px-4 transition-all duration-200 group-data-[collapsible=icon]:px-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <img src={Logo} alt="SPAS" className="size-8 shrink-0" />

          <div className="min-w-0 overflow-hidden transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <p className="truncate font-heading text-sm font-bold tracking-tight">
              SPAS
            </p>

            <p className="truncate text-xs text-muted-foreground">
              Academic operations
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
