import { NavLink } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { NavItem } from "@/lib/constants/nav-items"

interface Props {
  items: NavItem[]
}

export default function NavMain({ items }: Props) {
  const { isMobile, setOpenMobile } = useSidebar()
  const sections = [
    "Workspace",
    "Academics",
    "People",
    "Administration",
  ] as const

  return (
    <>
      {sections.map((section) => {
        const sectionItems = items.filter((item) => item.section === section)
        if (sectionItems.length === 0) return null

        return (
          <SidebarGroup key={section} className="py-2">
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.08em] capitalize">
              {section}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sectionItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false)
                    }}
                  >
                    {({ isActive }) => (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className="h-8 rounded-sm"
                        >
                          <span>
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </NavLink>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )
      })}
    </>
  )
}
