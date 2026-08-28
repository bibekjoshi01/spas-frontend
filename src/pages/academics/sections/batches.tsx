import { useState } from "react"
import { ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Field, FormDialog } from "@/components/form-dialog"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePickerInput } from "@/components/ui/date-time-picker"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useHasPermission } from "@/hooks/use-has-permissions"
import {
  ALL,
  type Batch,
  type BatchSemester,
  type SemesterStatus,
  fieldErrorsFrom,
  formErrorFrom,
  semesterLabel,
  useCreateBatchMutation,
  useCreateBatchSemesterMutation,
  useGetBatchSemestersQuery,
  useGetBatchesQuery,
  useGetProgramsQuery,
  useDeleteBatchMutation,
  useUpdateBatchMutation,
  useUpdateBatchSemesterMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

const STATUS_TONE: Record<SemesterStatus, string> = {
  RUNNING: "bg-emerald-600 hover:bg-emerald-600",
  COMPLETED: "",
  UPCOMING: "",
}

/**
 * Batches and the semesters they have sat.
 *
 * Promoting a batch happens here: close the running semester and open the next
 * one. A batch can only have one semester running at a time, which the backend
 * enforces.
 */
export function BatchesSection() {
  const programs = useGetProgramsQuery(ALL)
  const [program, setProgram] = useState("all")
  const onlyProgram =
    programs.data?.results.length === 1
      ? String(programs.data.results[0].id)
      : null
  const effectiveProgram =
    program === "all" && onlyProgram ? onlyProgram : program
  const batches = useGetBatchesQuery({
    ...ALL,
    ...(effectiveProgram === "all" ? {} : { program: effectiveProgram }),
  })
  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<Batch | null>(null)
  const [archiving, setArchiving] = useState<Batch | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [archive, archiveState] = useDeleteBatchMutation()

  const canAdd = useHasPermission("add_batch")
  const canEdit = useHasPermission("edit_batch")
  const canDelete = useHasPermission("delete_batch")

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2">
        {programs.data && programs.data.results.length > 1 ? (
          <div className="flex items-center gap-2">
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger
                className="w-72 max-w-full"
                aria-label="Filter by program"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {programs.data.results.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.code} — {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {program !== "all" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setProgram("all")}
                className="text-muted-foreground"
              >
                <X className="size-4" aria-hidden />
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <span />
        )}
        {canAdd && (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="size-4" aria-hidden />
            New batch
          </Button>
        )}
      </div>

      <QueryState
        isLoading={batches.isLoading}
        error={batches.error}
        isEmpty={batches.data?.results.length === 0}
        onRetry={batches.refetch}
        skeleton="table"
        emptyTitle="No batches yet"
        emptyMessage="A batch is one intake year of one program."
      >
        <div className="space-y-[5px]">
          {batches.data?.results.map((batch) => (
            <BatchRow
              key={batch.id}
              batch={batch}
              isOpen={expanded === batch.id}
              onToggle={() =>
                setExpanded(expanded === batch.id ? null : batch.id)
              }
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => setEditing(batch)}
              onArchive={() => setArchiving(batch)}
            />
          ))}
        </div>
      </QueryState>

      {isCreating && <BatchForm onClose={() => setIsCreating(false)} />}
      {editing && (
        <BatchForm batch={editing} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.program.code} ${archiving?.year}?`}
        description="The batch will leave active listings. Its students, semesters, classes, and historical records are preserved."
        isPending={archiveState.isLoading}
        onConfirm={async () => {
          if (!archiving) return
          try {
            await archive(archiving.id).unwrap()
            notifier.success("Batch archived.")
            setArchiving(null)
          } catch {
            notifier.error("Could not archive that batch.")
          }
        }}
      />
    </div>
  )
}

function BatchRow({
  batch,
  isOpen,
  onToggle,
  canEdit,
  canDelete,
  onEdit,
  onArchive,
}: {
  batch: Batch
  isOpen: boolean
  onToggle: () => void
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onArchive: () => void
}) {
  const semesters = useGetBatchSemestersQuery(
    { batch: batch.id, limit: 0 },
    { skip: !isOpen }
  )
  const [addingSemester, setAddingSemester] = useState(false)
  const [editingSemester, setEditingSemester] = useState<BatchSemester | null>(
    null
  )
  const [update] = useUpdateBatchSemesterMutation()

  const canAddSemester = useHasPermission("add_batch_semester")
  const canEditSemester = useHasPermission("edit_batch_semester")

  const setStatus = async (id: number, status: SemesterStatus) => {
    try {
      await update({ id, body: { status } }).unwrap()
      notifier.success(`Semester marked ${status.toLowerCase()}.`)
    } catch {
      notifier.error(
        "Could not change that. A batch can only have one semester running."
      )
    }
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center hover:bg-muted/50">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 p-3 text-left"
        >
          <div className="flex items-center gap-2">
            <ChevronRight
              className={`size-4 text-muted-foreground transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
              aria-hidden
            />
            <span className="font-medium">
              {batch.program.code} · {batch.year}
            </span>
            <span className="text-sm text-muted-foreground">
              {batch.program.name}
            </span>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {batch.studentCount} students
          </span>
        </button>
        {(canEdit || canDelete) && (
          <div className="flex shrink-0 items-center gap-1 pr-2">
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${batch.program.code} ${batch.year}`}
                onClick={onEdit}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            )}
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Archive ${batch.program.code} ${batch.year}`}
                onClick={onArchive}
              >
                <Trash2 className="size-4 text-destructive" aria-hidden />
              </Button>
            )}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="space-y-3 border-t p-3">
          <QueryState
            isLoading={semesters.isLoading}
            error={semesters.error}
            isEmpty={semesters.data?.results.length === 0}
            skeleton="table"
            emptyTitle="No semesters yet"
            emptyMessage="Open the first semester to start enrolling students."
          >
            <ul className="space-y-2">
              {semesters.data?.results.map((semester) => (
                <li
                  key={semester.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {semesterLabel(semester.semester)}
                      </span>
                      <Badge
                        variant={
                          semester.status === "RUNNING" ? "default" : "outline"
                        }
                        className={STATUS_TONE[semester.status]}
                      >
                        {semester.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatSemesterRange(semester)}
                    </p>
                  </div>

                  {canEditSemester && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label={`Edit ${semesterLabel(semester.semester)}`}
                        onClick={() => setEditingSemester(semester)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                      {semester.status !== "RUNNING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setStatus(semester.id, "RUNNING")}
                        >
                          Mark running
                        </Button>
                      )}
                      {semester.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setStatus(semester.id, "COMPLETED")}
                        >
                          Mark completed
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </QueryState>

          {canAddSemester && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingSemester(true)}
            >
              <Plus className="size-4" aria-hidden />
              Open a semester
            </Button>
          )}
        </div>
      )}

      {addingSemester && (
        <SemesterForm batch={batch} onClose={() => setAddingSemester(false)} />
      )}
      {editingSemester && (
        <SemesterForm
          batch={batch}
          semester={editingSemester}
          onClose={() => setEditingSemester(null)}
        />
      )}
    </div>
  )
}

function BatchForm({ batch, onClose }: { batch?: Batch; onClose: () => void }) {
  const programs = useGetProgramsQuery(ALL)
  const [create, createState] = useCreateBatchMutation()
  const [update, updateState] = useUpdateBatchMutation()
  const [form, setForm] = useState({
    program: batch ? String(batch.program.id) : "",
    year: String(batch?.year ?? new Date().getFullYear() + 57),
  })
  const onlyProgram =
    programs.data?.results.length === 1
      ? String(programs.data.results[0].id)
      : null
  const effectiveProgram = form.program || onlyProgram || ""
  const state = batch ? updateState : createState

  const errors = fieldErrorsFrom(state.error)

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={batch ? "Edit Batch" : "New Batch"}
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean((batch || effectiveProgram) && form.year)}
      submitLabel={batch ? "Save changes" : "Create"}
      onSubmit={async () => {
        try {
          if (batch) {
            await update({
              id: batch.id,
              body: { year: Number(form.year) },
            }).unwrap()
            notifier.success("Batch updated.")
          } else {
            await create({
              program: Number(effectiveProgram),
              year: Number(form.year),
            }).unwrap()
            notifier.success("Batch created.")
          }
          onClose()
        } catch {
          /* the form shows the error */
        }
      }}
    >
      {!batch && programs.data && programs.data.results.length > 1 && (
        <Field label="Program" error={errors.program}>
          <Select
            value={form.program}
            onValueChange={(value) => setForm({ ...form, program: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a program" />
            </SelectTrigger>
            <SelectContent>
              {programs.data?.results.map((row) => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.code} — {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field
        label="Entry year"
        htmlFor="batch-year"
        error={errors.year}
        hint="The year this batch was admitted, in the calendar your college uses."
      >
        <Input
          id="batch-year"
          type="number"
          value={form.year}
          onChange={(event) => setForm({ ...form, year: event.target.value })}
        />
      </Field>
    </FormDialog>
  )
}

function SemesterForm({
  batch,
  semester,
  onClose,
}: {
  batch: Batch
  semester?: BatchSemester
  onClose: () => void
}) {
  const [create, state] = useCreateBatchSemesterMutation()
  const [update, updateState] = useUpdateBatchSemesterMutation()
  const [form, setForm] = useState({
    semester: String(semester?.semester ?? 1),
    status: semester?.status ?? "UPCOMING",
    startDate: semester?.startDate ?? "",
    endDate: semester?.endDate ?? "",
  })

  const requestState = semester ? updateState : state

  const errors = fieldErrorsFrom(requestState.error)

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${semester ? "Edit" : "Open"} A Semester For ${batch.program.code} ${batch.year}`}
      formError={formErrorFrom(requestState.error)}
      isSubmitting={requestState.isLoading}
      submitLabel={semester ? "Save semester" : "Open semester"}
      onSubmit={async () => {
        try {
          const dates = {
            status: form.status as SemesterStatus,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
          }
          if (semester) {
            await update({ id: semester.id, body: dates }).unwrap()
          } else {
            await create({
              batch: batch.id,
              semester: Number(form.semester),
              ...dates,
            }).unwrap()
          }
          notifier.success(semester ? "Semester updated." : "Semester opened.")
          onClose()
        } catch {
          /* the form shows the error */
        }
      }}
    >
      <Field label="Semester" error={errors.semester}>
        <Select
          value={form.semester}
          disabled={Boolean(semester)}
          onValueChange={(value) => setForm({ ...form, semester: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 8 }, (_, index) => index + 1).map(
              (number) => (
                <SelectItem key={number} value={String(number)}>
                  {semesterLabel(number)}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Start date"
          htmlFor="semester-start-date"
          error={errors.startDate}
          hint="Optional"
        >
          <DatePickerInput
            id="semester-start-date"
            value={form.startDate}
            max={form.endDate || undefined}
            onValueChange={(startDate) => setForm({ ...form, startDate })}
            aria-label="Start date"
          />
        </Field>
        <Field
          label="End date"
          htmlFor="semester-end-date"
          error={errors.endDate}
          hint="Optional"
        >
          <DatePickerInput
            id="semester-end-date"
            value={form.endDate}
            min={form.startDate || undefined}
            onValueChange={(endDate) => setForm({ ...form, endDate })}
            aria-label="End date"
          />
        </Field>
      </div>

      <Field
        label="Status"
        error={errors.status}
        hint="Only one semester per batch can be running at a time."
      >
        <Select
          value={form.status}
          onValueChange={(value) =>
            setForm({ ...form, status: value as SemesterStatus })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </FormDialog>
  )
}

function formatSemesterRange(semester: BatchSemester) {
  if (!semester.startDate && !semester.endDate) return "Dates not set"
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  if (semester.startDate && semester.endDate) {
    return `${format(semester.startDate)} – ${format(semester.endDate)}`
  }
  if (semester.startDate) return `Starts ${format(semester.startDate)}`
  return `Ends ${format(semester.endDate!)}`
}
