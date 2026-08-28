import { type ReactNode, useContext } from "react"
import { createPortal } from "react-dom"
import { HeaderActionsSlotContext } from "@/components/header-actions-context"

interface PageHeaderProps {
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
}

/** Keep page-owned actions in the single application header. */
export function PageHeader({ actions }: PageHeaderProps) {
  const actionsSlot = useContext(HeaderActionsSlotContext)

  if (!actions || !actionsSlot) return null

  return createPortal(
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
      {actions}
    </div>,
    actionsSlot
  )
}
