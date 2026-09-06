import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { apiErrorMessage } from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"
import { auth } from "@/lib/redux/auth"
import { changePasswordRequest } from "@/pages/auth/redux/auth.api"

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b bg-muted/20 p-5 pr-12">
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Confirm your current password, then choose a strong new password.
          </DialogDescription>
        </DialogHeader>
        <div className="p-5">
          <ChangePasswordForm
            key={open ? "open" : "closed"}
            onCancel={() => onOpenChange(false)}
            onDone={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChangePasswordForm({
  onCancel,
  onDone,
}: {
  onCancel: () => void
  onDone: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const mismatch = Boolean(confirmPassword && newPassword !== confirmPassword)
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !isSaving

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setIsSaving(true)
    try {
      auth.setTokens(
        await changePasswordRequest({ currentPassword, newPassword })
      )
      notifier.success("Password changed successfully.")
      onDone()
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not change your password."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-[5px]">
          <Label htmlFor="current-password">Current password</Label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="space-y-[5px]">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            aria-describedby="password-help"
          />
          <p id="password-help" className="text-xs text-muted-foreground">
            Use at least 8 characters. Avoid common passwords and personal
            information.
          </p>
        </div>
        <div className="space-y-[5px]">
          <Label htmlFor="confirm-new-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-new-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={mismatch}
          />
          {mismatch && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter className="mt-5 border-t pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {isSaving ? "Changing…" : "Change password"}
        </Button>
      </DialogFooter>
    </>
  )
}
