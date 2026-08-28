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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { notifier } from "@/lib/utils/notifier"
import { updateProfileRequest } from "@/pages/auth/redux/auth.api"
import { setProfile } from "@/pages/auth/redux/auth.slice"
import type { IUserProfile } from "@/pages/auth/redux/auth.types"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProfileDialog({
  open,
  onOpenChange,
}: EditProfileDialogProps) {
  const profile = useAppSelector((state) => state.auth.profile)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your contact details. Your username, email, and roles are
            managed by an administrator.
          </DialogDescription>
        </DialogHeader>

        {profile ? (
          // Remounted each time the dialog opens (via `key`) so its form
          // state always starts fresh from the latest saved profile,
          // without needing an effect to re-sync it.
          <EditProfileForm
            key={open ? "open" : "closed"}
            profile={profile}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface EditProfileFormProps {
  profile: IUserProfile
  onDone: () => void
}

function EditProfileForm({ profile, onDone }: EditProfileFormProps) {
  const dispatch = useAppDispatch()

  const [firstName, setFirstName] = useState(profile.firstName)
  const [middleName, setMiddleName] = useState(profile.middleName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [phoneNo, setPhoneNo] = useState(profile.phoneNo)
  const [alternatePhoneNo, setAlternatePhoneNo] = useState(
    profile.alternatePhoneNo
  )
  const [isSaving, setIsSaving] = useState(false)

  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && !isSaving

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSaving(true)

    try {
      // Persists to PostgreSQL for the authenticated user (PATCH /auth/me)
      const updated = await updateProfileRequest({
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        phoneNo: phoneNo.trim(),
        alternatePhoneNo: alternatePhoneNo.trim(),
      })

      // Keep the store (and therefore every screen that reads the
      // profile, including the Dashboard greeting) in sync immediately.
      dispatch(
        setProfile({
          ...updated,
        })
      )

      notifier.success("Profile updated successfully.")
      onDone()
    } catch {
      notifier.error("Couldn't update your profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-[5px]">
          <Label htmlFor="profile-first-name">First name</Label>
          <Input
            id="profile-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="space-y-[5px]">
          <Label htmlFor="profile-middle-name">
            Middle name{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="profile-middle-name"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
        </div>
        <div className="space-y-[5px]">
          <Label htmlFor="profile-last-name">Last name</Label>
          <Input
            id="profile-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="space-y-[5px]">
          <Label htmlFor="profile-phone">Primary phone number</Label>
          <Input
            id="profile-phone"
            value={phoneNo}
            onChange={(e) => setPhoneNo(e.target.value)}
            inputMode="tel"
          />
        </div>
        <div className="space-y-[5px]">
          <Label htmlFor="profile-alternate-phone">
            Alternate phone number{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="profile-alternate-phone"
            value={alternatePhoneNo}
            onChange={(e) => setAlternatePhoneNo(e.target.value)}
            inputMode="tel"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  )
}
