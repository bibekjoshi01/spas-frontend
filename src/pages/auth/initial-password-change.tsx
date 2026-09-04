import { useState } from "react"
import { LockKeyhole, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiErrorMessage } from "@/lib/api"
import { useAppDispatch } from "@/lib/redux/hooks"
import { auth } from "@/lib/redux/auth"
import { notifier } from "@/lib/utils/notifier"
import { changePasswordRequest, fetchMe } from "@/pages/auth/redux/auth.api"
import { logoutSuccess, setProfile } from "@/pages/auth/redux/auth.slice"

export default function InitialPasswordChange() {
  const dispatch = useAppDispatch()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const valid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const tokens = await changePasswordRequest({
        currentPassword,
        newPassword,
      })
      auth.setTokens(tokens)
      dispatch(setProfile(await fetchMe()))
      notifier.success("Password changed. Welcome to your student portal.")
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not change your password."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2 text-center">
          <LockKeyhole className="mx-auto size-9 text-primary" aria-hidden />
          <h1 className="font-heading text-xl font-bold">
            Create your private password
          </h1>
          <p className="text-sm text-muted-foreground">
            Your roll number was only a temporary password. Change it before
            opening your records.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="initial-current">Current password</Label>
          <Input
            id="initial-current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="initial-new">New password</Label>
          <Input
            id="initial-new"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use at least 8 characters and avoid personal information.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="initial-confirm">Confirm new password</Label>
          <Input
            id="initial-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(
              confirmPassword && newPassword !== confirmPassword
            )}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={!valid || saving}>
          {saving ? "Changing password…" : "Continue"}
        </Button>
        <Button
          className="w-full"
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => dispatch(logoutSuccess())}
        >
          <LogOut className="size-4" aria-hidden />
          Sign in with another account
        </Button>
      </form>
    </main>
  )
}
