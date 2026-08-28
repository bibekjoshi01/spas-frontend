import { useCallback, useState } from "react"
import { Outlet } from "react-router-dom"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { setSidebar } from "@/lib/common/redux/common.slice"
import { HeaderActionsSlotContext } from "@/components/header-actions-context"

import AppHeader from "./app-header"
import AppSidebar from "./app-sidebar"
import { AppFooter } from "./app-footer"

export default function MainLayout() {
  const dispatch = useAppDispatch()
  const sidebarOpen = useAppSelector((state) => state.common.sidebarOpen)
  const [headerActionsSlot, setHeaderActionsSlot] =
    useState<HTMLDivElement | null>(null)
  const handleActionsSlotChange = useCallback(
    (element: HTMLDivElement | null) => setHeaderActionsSlot(element),
    []
  )

  return (
    <HeaderActionsSlotContext.Provider value={headerActionsSlot}>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={(open) => dispatch(setSidebar(open))}
      >
        <AppSidebar />

        <SidebarInset>
          <AppHeader onActionsSlotChange={handleActionsSlotChange} />

          <main
            className="flex-1 pb-16 md:pb-0"
            onClick={() => {
              if (sidebarOpen) dispatch(setSidebar(false))
            }}
          >
            <Outlet />
          </main>

          <AppFooter />
        </SidebarInset>
      </SidebarProvider>
    </HeaderActionsSlotContext.Provider>
  )
}
