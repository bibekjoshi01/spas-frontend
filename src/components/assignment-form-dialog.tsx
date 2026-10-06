import { useState } from "react"
import { Paperclip, X } from "lucide-react"

import { AssignmentDescriptionEditor } from "@/components/assignment-description-editor"
import { EMPTY_ASSIGNMENT_DESCRIPTION } from "@/lib/utils/assignment"
import { InlineSpinner, QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { DatePickerInput } from "@/components/ui/date-time-picker"
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
import {
  apiErrorMessage,
  fieldErrorsFrom,
  type AssignmentDetail,
  type AssignmentWrite,
  useCreateAssignmentMutation,
  useGetAssignmentQuery,
  useUpdateAssignmentMutation,
} from "@/lib/api"
import { localDateKey } from "@/lib/utils/date"
import { notifier } from "@/lib/utils/notifier"

const acceptedExtensions =
  ".pdf,.doc,.docx,.odt,.xls,.xlsx,.ods,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp"

export function AssignmentFormDialog({
  allocation,
  assignmentId,
  onClose,
}: {
  allocation: number
  assignmentId?: number
  onClose: () => void
}) {
  const query = useGetAssignmentQuery(assignmentId ?? 0, {
    skip: !assignmentId,
  })
  const [saving, setSaving] = useState(false)
  const close = () => {
    if (!saving) onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {assignmentId ? "Edit Assignment" : "New Assignment"}
          </DialogTitle>
          <DialogDescription>
            Describe the task and attach resources your students need.
          </DialogDescription>
        </DialogHeader>
        <QueryState
          isLoading={Boolean(assignmentId && query.isLoading)}
          error={query.error}
          onRetry={query.refetch}
        >
          {(!assignmentId || query.currentData) && (
            <AssignmentForm
              allocation={allocation}
              assignment={query.currentData}
              onClose={onClose}
              onSavingChange={setSaving}
            />
          )}
        </QueryState>
      </DialogContent>
    </Dialog>
  )
}

function AssignmentForm({
  allocation,
  assignment,
  onClose,
  onSavingChange,
}: {
  allocation: number
  assignment?: AssignmentDetail
  onClose: () => void
  onSavingChange: (saving: boolean) => void
}) {
  const [create, createState] = useCreateAssignmentMutation()
  const [update, updateState] = useUpdateAssignmentMutation()
  const saving = createState.isLoading || updateState.isLoading
  const [form, setForm] = useState<AssignmentWrite>({
    title: assignment?.title ?? "",
    assignedDate: assignment?.assignedDate ?? localDateKey(),
    dueDate: assignment?.dueDate ?? "",
    description: assignment?.description ?? EMPTY_ASSIGNMENT_DESCRIPTION,
    newFiles: [],
    removeAttachments: [],
  })
  const [error, setError] = useState<unknown>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const errors = fieldErrorsFrom(error)
  const prefix = assignment ? "edit-assignment" : "assignment"
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    onSavingChange(true)
    try {
      const body = {
        ...form,
        title: form.title.trim(),
        dueDate: form.dueDate || null,
      }
      if (assignment) await update({ id: assignment.id, body }).unwrap()
      else await create({ ...body, allocation }).unwrap()
      notifier.success(
        assignment ? "Assignment updated." : "Assignment created."
      )
      // The request has finished; let the dialog close before clearing its busy state.
      onSavingChange(false)
      onClose()
    } catch (requestError) {
      setError(requestError)
    } finally {
      onSavingChange(false)
    }
  }
  function chooseFiles(files: File[]) {
    const retained =
      (assignment?.attachments.length ?? 0) - form.removeAttachments.length
    if (retained + form.newFiles.length + files.length > 5) {
      setFileError("Attach up to five files per assignment.")
      return
    }
    if (files.some((file) => file.size === 0 || file.size > 10 * 1024 * 1024)) {
      setFileError("Each file must contain content and be 10 MB or smaller.")
      return
    }
    if (
      files.some(
        (file) =>
          !acceptedExtensions
            .split(",")
            .includes(`.${file.name.split(".").pop()?.toLowerCase()}`)
      )
    ) {
      setFileError(
        "Choose a document, image, spreadsheet, presentation, text or ZIP file."
      )
      return
    }
    setFileError(null)
    setForm({ ...form, newFiles: [...form.newFiles, ...files] })
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={saving} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor={`${prefix}-title`}>Title</Label>
          <Input
            id={`${prefix}-title`}
            maxLength={150}
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="Linked lists exercise"
          />
          {errors.title && (
            <p role="alert" className="text-xs text-destructive">
              {errors.title}
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-given`}>Given</Label>
            <DatePickerInput
              id={`${prefix}-given`}
              value={form.assignedDate}
              onValueChange={(assignedDate) =>
                setForm({ ...form, assignedDate })
              }
              aria-label="Given date"
            />
            {errors.assignedDate && (
              <p role="alert" className="text-xs text-destructive">
                {errors.assignedDate}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}-due`}>Due</Label>
            <DatePickerInput
              id={`${prefix}-due`}
              min={form.assignedDate}
              value={form.dueDate ?? ""}
              onValueChange={(dueDate) => setForm({ ...form, dueDate })}
              aria-label="Due date"
            />
            {errors.dueDate && (
              <p role="alert" className="text-xs text-destructive">
                {errors.dueDate}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Task description</p>
          <AssignmentDescriptionEditor
            value={form.description}
            onChange={(description) =>
              setForm((current) => ({ ...current, description }))
            }
            disabled={saving}
          />
          {errors.description && (
            <p role="alert" className="text-xs text-destructive">
              {errors.description}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-files`}>
            <Paperclip className="size-4" aria-hidden />
            Attachments
          </Label>
          <Input
            id={`${prefix}-files`}
            type="file"
            multiple
            accept={acceptedExtensions}
            onChange={(event) => {
              chooseFiles(Array.from(event.target.files ?? []))
              event.target.value = ""
            }}
          />
          <p className="text-xs text-muted-foreground">
            Documents, images, spreadsheets, presentations, text or ZIP. Up to 5
            files, 10 MB each.
          </p>
          {assignment?.attachments.map((file) => {
            const removed = form.removeAttachments.includes(file.id)
            return (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
              >
                <span
                  className={`min-w-0 break-all ${removed ? "text-muted-foreground line-through" : ""}`}
                >
                  {file.name}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={
                    removed ? `Keep ${file.name}` : `Remove ${file.name}`
                  }
                  onClick={() => {
                    setFileError(null)
                    setForm({
                      ...form,
                      removeAttachments: removed
                        ? form.removeAttachments.filter((id) => id !== file.id)
                        : [...form.removeAttachments, file.id],
                    })
                  }}
                >
                  {removed ? (
                    "Undo removal"
                  ) : (
                    <X className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
            )
          })}
          {form.newFiles.map((file, index) => (
            <div
              key={`${index}-${file.name}`}
              className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
            >
              <span className="min-w-0 break-all">{file.name}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${file.name}`}
                onClick={() => {
                  setFileError(null)
                  setForm({
                    ...form,
                    newFiles: form.newFiles.filter((_, i) => i !== index),
                  })
                }}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          {(fileError || errors.newFiles || errors.removeAttachments) && (
            <p role="alert" className="text-xs text-destructive">
              {fileError || errors.newFiles || errors.removeAttachments}
            </p>
          )}
        </div>
      </fieldset>
      {error != null && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(
            error,
            "Could not save the assignment. Please try again."
          )}
        </p>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            !form.title.trim() ||
            !form.assignedDate ||
            Boolean(form.dueDate && form.dueDate < form.assignedDate) ||
            saving
          }
        >
          {saving && <InlineSpinner />}
          {assignment ? "Save changes" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}
