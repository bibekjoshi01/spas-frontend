import { type ReactNode, useState } from "react"
import { MoreVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface RowAction {
  /** The caption on the button. Say what it does, not what it is. */
  label: string
  icon: ReactNode
  onSelect: () => void
  /** A line under the caption, for actions worth explaining before the click. */
  description?: string
  /** Archiving and the like: tinted, and pushed to the bottom of the list. */
  destructive?: boolean
}

/**
 * One row's actions behind a single control.
 *
 * A row of unlabelled icons makes every action a guess and eats the width a
 * table needs for its data. Collapsing them into a menu that opens a modal
 * gives each action a caption at the moment it is chosen, and keeps the column
 * the same narrow size no matter how many actions a role can see.
 */
export function RowActionsMenu({
  title,
  description,
  actions,
  triggerLabel,
}: {
  /** Names the row the actions apply to, so the modal is never ambiguous. */
  title: string
  description?: string
  actions: RowAction[]
  triggerLabel: string
}) {
  const [open, setOpen] = useState(false)
  // Radix hands focus back to the trigger on close. When the action opens a
  // dialog of its own that restore lands after the new dialog has mounted and
  // pulls focus back out of it, so it is suppressed for a chosen action.
  const [chose, setChose] = useState(false)

  if (!actions.length) return null

  const ordered = [
    ...actions.filter((action) => !action.destructive),
    ...actions.filter((action) => action.destructive),
  ]

  const choose = (action: RowAction) => {
    setChose(true)
    setOpen(false)
    action.onSelect()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <MoreVertical className="size-4" aria-hidden />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setChose(false)
        }}
      >
        <DialogContent
          className="sm:max-w-lg"
          onCloseAutoFocus={(event) => chose && event.preventDefault()}
        >
          <DialogHeader className="pr-10">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {description ?? "Choose an action for this record."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1">
            {ordered.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => choose(action)}
                className={cn(
                  "flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors",
                  "hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  action.destructive &&
                    "text-destructive hover:bg-destructive/10"
                )}
              >
                <span className="shrink-0" aria-hidden>
                  {action.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {action.label}
                  </span>
                  {action.description && (
                    <span
                      className={cn(
                        "block text-xs",
                        action.destructive
                          ? "text-destructive/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {action.description}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
