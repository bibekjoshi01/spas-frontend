import { useEffect } from "react"
import { useBlocker } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when)

  useEffect(() => {
    if (!when) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [when])

  return (
    <Dialog open={blocker.state === "blocked"}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
          <DialogDescription>
            Your attendance changes have not been saved. Leaving now will
            discard them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => blocker.reset?.()}>
            Continue editing
          </Button>
          <Button variant="destructive" onClick={() => blocker.proceed?.()}>
            Discard and leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
