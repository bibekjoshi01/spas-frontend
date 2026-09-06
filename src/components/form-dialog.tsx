import type { ReactNode } from "react"
import { AlertCircle } from "lucide-react"

import { InlineSpinner } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Anything the form has no field to attach to. */
  formError?: string | null
  isSubmitting?: boolean
  submitLabel?: string
  canSubmit?: boolean
  onSubmit: () => void
  children: ReactNode
  contentClassName?: string
}

/** The shell every create and edit form shares, so they behave identically. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  formError,
  isSubmitting,
  submitLabel = "Save",
  canSubmit = true,
  onSubmit,
  children,
  contentClassName,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-h-[85vh] overflow-y-auto", contentClassName)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSubmit && !isSubmitting) onSubmit()
          }}
        >
          {formError && (
            <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {formError}
            </p>
          )}

          {children}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting && <InlineSpinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The active switch shared by every form that can retire a record.
 *
 * Retiring is not deleting: the record keeps everything hanging off it and only
 * stops being offered for new work, so the caption says so rather than leaving
 * the reader to guess what a bare checkbox costs them.
 */
export function ActiveField({
  checked,
  onChange,
  noun,
  error,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  /** What is being retired — "department", "program", "subject". */
  noun: string
  error?: string
}) {
  return (
    <Field
      label="Availability"
      error={error}
      hint={
        checked
          ? `Offered when creating anything under this ${noun}.`
          : `Hidden from new work. Existing records keep this ${noun}.`
      }
    >
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={checked}
          onCheckedChange={(next) => onChange(next === true)}
        />
        Active
      </label>
    </Field>
  )
}

interface FieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
}

/** A labelled control with its validation message underneath. */
export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-[5px] [&_[data-slot=select-trigger]]:w-full">
      <label
        htmlFor={htmlFor}
        className="block text-sm leading-5 font-semibold text-foreground peer-disabled:opacity-70"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs leading-4 text-destructive">{error}</p>
      ) : (
        hint && (
          <p className="text-xs leading-4 text-muted-foreground">{hint}</p>
        )
      )}
    </div>
  )
}
