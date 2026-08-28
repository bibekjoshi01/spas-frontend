import { useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { FOOTER_NAV_ITEMS } from "@/lib/constants/nav-items"
import { useAppSelector } from "@/lib/redux/hooks"
import { cn } from "@/lib/utils"

export function AppFooter() {
  const navigate = useNavigate()
  const location = useLocation()
  const roles = useAppSelector((state) => state.auth.profile?.roles ?? [])
  const items = FOOTER_NAV_ITEMS.filter(
    (item) =>
      item.showInSidebar !== false &&
      (!item.role || roles.some((role) => role.codename === item.role))
  )

  const handleClick = (href: string) => {
    navigate(href)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-2 py-1.5 backdrop-blur md:hidden">
      <nav aria-label="Primary mobile navigation">
        <div className="flex w-full items-center justify-around">
          {items.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(`${item.href}/`)

            return (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                onClick={() => handleClick(item.href)}
                className={cn(
                  "h-11 min-w-12 flex-col gap-0.5 rounded-md px-2 text-[10px] transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="max-w-16 truncate">{item.label}</span>
              </Button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
