import { useState } from "react"

import { ConfirmDialog } from "@/components/confirm-dialog"

/**
 * Ask before an entry dialog closes over unsaved edits.
 *
 * A class's worth of marks is one stray Escape or overlay click from being
 * thrown away, so every way out of the dialog goes through `requestClose`.
 */
export function useDiscardConfirm(dirty: boolean, onClose: () => void) {
  const [asking, setAsking] = useState(false)

  const requestClose = () => (dirty ? setAsking(true) : onClose())

  const confirm = (
    <ConfirmDialog
      open={asking}
      onOpenChange={setAsking}
      title="Discard unsaved changes?"
      description="What you entered here has not been saved. Closing now will discard it."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      onConfirm={() => {
        setAsking(false)
        onClose()
      }}
    />
  )

  return { requestClose, confirm }
}
