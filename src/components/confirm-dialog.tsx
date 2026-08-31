import { AlertCircle } from "lucide-react"

import { InlineSpinner } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiErrorMessage } from "@/lib/api"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  isPending?: boolean
  /**
   * A refusal from the server, shown in place rather than as a toast.
   *
   * Archiving is refused while live children depend on the row, and the reply
   * names them and says what to do instead — which is worth reading here, where
   * the decision is being made, not in a notification that slides away.
   */
  error?: unknown
  onConfirm: () => void
}

/**
 * Confirmation before archiving.
 *
 * Nothing here is destroyed — rows are archived — so the wording says what
 * actually happens rather than warning about permanence that does not apply.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Archive",
  isPending,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  const message = error ? apiErrorMessage(error) : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {message && (
          <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {message}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <InlineSpinner />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
