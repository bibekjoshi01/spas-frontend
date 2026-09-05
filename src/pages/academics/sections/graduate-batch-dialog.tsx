import { AlertCircle, GraduationCap } from "lucide-react"

import { InlineSpinner, QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type Batch,
  apiErrorMessage,
  useGetBatchGraduationPreviewQuery,
  useGraduateBatchMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

/**
 * Graduating a cohort, shown before it happens.
 *
 * This is the one action that rewrites hundreds of rows at once, so it opens on
 * a count of exactly what it will change rather than a yes/no. Students who
 * dropped out or transferred are named separately and left alone — recording
 * them as graduates would be a claim the college would have to defend later.
 */
export function GraduateBatchDialog({
  batch,
  onClose,
}: {
  batch: Batch
  onClose: () => void
}) {
  const preview = useGetBatchGraduationPreviewQuery(batch.id)
  const [graduate, state] = useGraduateBatchMutation()
  const facts = preview.data

  const submit = async () => {
    try {
      const result = await graduate(batch.id).unwrap()
      notifier.success(result.message)
      onClose()
    } catch (error) {
      notifier.error(apiErrorMessage(error, "Could not graduate that batch."))
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Graduate {batch.program.code} {batch.year}?
          </DialogTitle>
          <DialogDescription>
            Students still studying are marked graduated. Records remain
            available, and you can undo this action.
          </DialogDescription>
        </DialogHeader>

        <QueryState
          isLoading={preview.isLoading}
          error={preview.error}
          onRetry={preview.refetch}
          skeleton="table"
        >
          {facts && (
            <div className="space-y-3">
              <dl className="divide-y rounded-md border text-sm">
                <Row label="Semesters completed">
                  {facts.semestersCompleted} of {facts.semestersTotal}
                </Row>
                <Row label="Students to graduate">
                  <span className="font-semibold">
                    {facts.studentsToGraduate}
                  </span>{" "}
                  of {facts.studentsTotal}
                </Row>
                {facts.studentsAlreadyLeft > 0 && (
                  <Row label="Already left or graduated">
                    {facts.studentsAlreadyLeft} unchanged
                  </Row>
                )}
              </dl>

              {facts.blocker && (
                <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {facts.blocker}
                </p>
              )}
            </div>
          )}
        </QueryState>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!facts?.canGraduate || state.isLoading}
            onClick={() => void submit()}
          >
            {state.isLoading ? (
              <InlineSpinner />
            ) : (
              <GraduationCap className="size-4" aria-hidden />
            )}
            Graduate batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  )
}
