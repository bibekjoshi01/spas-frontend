import { useState } from "react"
import { CalendarOff, PartyPopper, Pencil, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Field, FormDialog } from "@/components/form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type CalendarDay,
  type CalendarEntry,
  type CalendarEntryKind,
  fieldErrorsFrom,
  formErrorFrom,
  useCreateCalendarEntryMutation,
  useDeleteCalendarEntryMutation,
  useUpdateCalendarEntryMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

const KIND_LABEL: Record<CalendarEntryKind, string> = {
  HOLIDAY: "Holiday",
  EVENT: "Event",
}

/** What one date carries, and — for an administrator — how to change it. */
export function CalendarDayDialog({
  day,
  heading,
  subheading,
  canManage,
  onClose,
}: {
  day: CalendarDay
  heading: string
  subheading: string
  canManage: boolean
  onClose: () => void
}) {
  const [editing, setEditing] = useState<CalendarEntry | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [removing, setRemoving] = useState<CalendarEntry | null>(null)
  const [remove, removeState] = useDeleteCalendarEntryMutation()

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>{subheading}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {day.entries.length === 0 && !day.milestones?.length && (
              <p className="border bg-card p-4 text-center text-sm text-muted-foreground">
                Nothing is marked on this date.
              </p>
            )}

            {day.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 border bg-card p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        entry.kind === "HOLIDAY" ? "destructive" : "secondary"
                      }
                      className="gap-1"
                    >
                      {entry.kind === "HOLIDAY" ? (
                        <CalendarOff className="size-3" aria-hidden />
                      ) : (
                        <PartyPopper className="size-3" aria-hidden />
                      )}
                      {KIND_LABEL[entry.kind]}
                    </Badge>
                    <span className="font-medium break-words">
                      {entry.title}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="text-sm break-words whitespace-pre-wrap text-muted-foreground">
                      {entry.note}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${entry.title}`}
                      onClick={() => setEditing(entry)}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${entry.title}`}
                      onClick={() => setRemoving(entry)}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {(day.milestones ?? []).map((item) => (
              <div key={item.key} className="border bg-card p-3 text-sm">
                {item.title}
              </div>
            ))}

            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="size-4" aria-hidden />
                Mark this date
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isAdding && (
        <EntryForm date={day.date} onClose={() => setIsAdding(false)} />
      )}
      {editing && (
        <EntryForm
          date={day.date}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove “${removing?.title}”?`}
        description="It leaves the calendar. The record is archived rather than deleted."
        error={removeState.error}
        isPending={removeState.isLoading}
        onConfirm={async () => {
          if (!removing) return
          try {
            await remove(removing.id).unwrap()
            notifier.success("Calendar entry removed.")
            setRemoving(null)
          } catch {
            /* the dialog shows the refusal */
          }
        }}
      />
    </>
  )
}

function EntryForm({
  date,
  entry,
  onClose,
}: {
  date: string
  entry?: CalendarEntry
  onClose: () => void
}) {
  const [create, createState] = useCreateCalendarEntryMutation()
  const [update, updateState] = useUpdateCalendarEntryMutation()
  const [kind, setKind] = useState<CalendarEntryKind>(entry?.kind ?? "HOLIDAY")
  const [title, setTitle] = useState(entry?.title ?? "")
  const [note, setNote] = useState(entry?.note ?? "")

  const state = entry ? updateState : createState
  const errors = fieldErrorsFrom(state.error)

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={entry ? "Edit Entry" : "Mark This Date"}
      description={
        entry
          ? undefined
          : "A holiday closes the campus; an event happens on a working day."
      }
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean(title.trim())}
      submitLabel={entry ? "Save changes" : "Add entry"}
      onSubmit={async () => {
        try {
          if (entry) {
            await update({ id: entry.id, body: { kind, title, note } }).unwrap()
            notifier.success("Calendar entry updated.")
          } else {
            await create({ date, kind, title, note }).unwrap()
            notifier.success("Date marked.")
          }
          onClose()
        } catch {
          /* the form shows the error */
        }
      }}
    >
      <Field label="Type" error={errors.kind}>
        <Select
          value={kind}
          onValueChange={(value) => setKind(value as CalendarEntryKind)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HOLIDAY">Holiday — campus closed</SelectItem>
            <SelectItem value="EVENT">Event — a working day</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Title" htmlFor="entry-title" error={errors.title}>
        <Input
          id="entry-title"
          maxLength={150}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Dashain — Ghatasthapana"
        />
      </Field>

      <Field
        label="Note"
        htmlFor="entry-note"
        error={errors.note}
        hint="Optional. What is happening, in a line."
      >
        <Label htmlFor="entry-note" className="sr-only">
          Note
        </Label>
        <textarea
          id="entry-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full rounded-sm border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          placeholder="Campus closed for the festival."
        />
      </Field>
    </FormDialog>
  )
}
