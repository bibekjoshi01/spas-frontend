import { matchPath, useLocation } from "react-router-dom"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { privateRoutes } from "@/routes/route-config"

interface AppHeaderProps {
  onActionsSlotChange: (element: HTMLDivElement | null) => void
}

export default function AppHeader({ onActionsSlotChange }: AppHeaderProps) {
  const { pathname } = useLocation()
  const route = privateRoutes.find((item) => matchPath(item.path, pathname))
  const fallbackTitle = pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())

  return (
    <header className="sticky top-0 z-20 flex min-h-14 min-w-0 flex-wrap items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4 lg:flex-nowrap">
      <SidebarTrigger />
      <div className="h-5 w-px bg-border" aria-hidden="true" />
      <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
        {route?.title ?? fallbackTitle ?? "SPAS"}
      </h1>
      <div
        ref={onActionsSlotChange}
        className="order-3 flex w-full min-w-0 items-center justify-end gap-2 empty:hidden lg:order-none lg:ml-auto lg:w-auto"
      />
    </header>
  )
}
