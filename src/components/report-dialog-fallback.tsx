import type { ReactNode } from "react"

import { ClassReportSkeleton } from "@/components/skeletons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * The dialog shell a report wears while its own code is still downloading.
 *
 * The report screens are lazily loaded, so this stands in for the whole dialog
 * — shell included — for as long as the chunk takes. It draws the same body
 * the dialog itself draws while waiting on data, so the swap is invisible.
 */
export function ReportDialogFallback({
  title = "Loading report…",
  description = "Fetching the record and drawing the report.",
  overlayClassName,
  className,
  onClose,
  children,
}: {
  title?: string
  description?: string
  overlayClassName?: string
  className?: string
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        overlayClassName={overlayClassName}
        className={cn(
          "h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto sm:max-w-none",
          className
        )}
      >
        <DialogHeader className="pr-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="mt-1">{description}</DialogDescription>
        </DialogHeader>
        {children ?? <ClassReportSkeleton />}
      </DialogContent>
    </Dialog>
  )
}
