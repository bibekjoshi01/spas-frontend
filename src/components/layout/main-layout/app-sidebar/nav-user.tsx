import {
  ChevronsUpDown,
  KeyRound,
  LogOut,
  Moon,
  Sun,
  UserPen,
} from "lucide-react"
import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useTheme } from "@/components/theme-provider"
import { logoutSuccess } from "@/pages/auth/redux/auth.slice"
import { logoutRequest } from "@/pages/auth/redux/auth.api"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { auth } from "@/lib/redux/auth"
import { EditProfileDialog } from "./edit-profile-dialog"
import { ChangePasswordDialog } from "./change-password-dialog"

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"

  const initials =
    words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words.at(-1)![0]

  return initials.toUpperCase()
}

export default function NavUser() {
  const dispatch = useAppDispatch()
  const { theme, toggleTheme } = useTheme()
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)

  const profile = useAppSelector((state) => state.auth.profile)
  const isSuperUser = useAppSelector((state) => state.auth.isSuperUser)

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const fullName = profile?.fullName ?? "Profile"
  const role = isSuperUser
    ? "System administrator"
    : (profile?.roles.map((item) => item.name).join(", ") ?? "Member")

  async function handleLogout() {
    try {
      const refreshToken = auth.getRefresh()
      if (refreshToken) await logoutRequest(refreshToken)
    } finally {
      dispatch(logoutSuccess())
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar>
                <AvatarFallback className="bg-primary font-medium text-primary-foreground">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>

              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{fullName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {role}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {profile?.email ?? fullName}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={toggleTheme}>
              {isDark ? <Sun className="text-amber-500" /> : <Moon />}
              {isDark ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)}>
              <UserPen />
              Edit profile
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
              <KeyRound />
              Change password
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <EditProfileDialog
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
      />
      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />
    </SidebarMenu>
  )
}
