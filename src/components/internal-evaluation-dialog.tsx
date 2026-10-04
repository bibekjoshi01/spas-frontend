import { useState } from "react"
import { Link } from "react-router-dom"
import { Download, FileText } from "lucide-react"
import { Field } from "@/components/form-dialog"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useHasPermission, useIsSuperUser } from "@/hooks/use-has-permissions"
import {
  downloadInternalEvaluation,
  useGetInternalEvaluationQuery,
} from "@/lib/api/internal-evaluation.api"
import { localDateKey } from "@/lib/utils/date"
import { notifier } from "@/lib/utils/notifier"

const PERMISSIONS = [
  "view_attendance",
  "view_internal_exam",
  "view_assignment",
  "view_class_performance",
]

export function InternalEvaluationButton({
  allocation,
}: {
  allocation: number
}) {
  const allowed = useHasPermission(PERMISSIONS, true)
  const [open, setOpen] = useState(false)
  if (!allowed) return null
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FileText className="size-4" aria-hidden />
        Internal evaluation sheet
      </Button>
      {open && (
        <InternalEvaluationDialog
          allocation={allocation}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export function InternalEvaluationDialog({
  allocation,
  onClose,
}: {
  allocation: number
  onClose: () => void
}) {
  const [sheetDate, setSheetDate] = useState(localDateKey())
  const [programmeSection, setProgrammeSection] = useState("")
  const [downloading, setDownloading] = useState<"blank" | "calculated" | null>(
    null
  )
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const options = { allocation, sheetDate, programmeSection }
  const query = useGetInternalEvaluationQuery(options, {
    skip: !sheetDate,
    refetchOnMountOrArgChange: true,
  })
  // currentData prevents downloading using a previous date/section's validity.
  const data = query.currentData
  const isAdmin = useIsSuperUser()
  async function download(mode: "blank" | "calculated") {
    setDownloading(mode)
    setDownloadError(null)
    try {
      await downloadInternalEvaluation(options, mode)
      notifier.success("Internal evaluation sheet downloaded.")
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Could not download the sheet."
      )
      void query.refetch()
    } finally {
      setDownloading(null)
    }
  }
  const blocked = data?.rows.filter((row) => row.issues.length) ?? []
  return (
    <Dialog open onOpenChange={(open) => !open && !downloading && onClose()}>
      <DialogContent
        overlayClassName="z-[100]"
        className="z-[110] max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Download internal evaluation sheet</DialogTitle>
          <DialogDescription>
            Print a blank register or download the completed internal marks
            sheet for the entire subject roster.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sheet date (AD)" htmlFor="evaluation-date">
            <Input
              id="evaluation-date"
              type="date"
              value={sheetDate}
              onChange={(event) => setSheetDate(event.target.value)}
              disabled={Boolean(downloading)}
            />
          </Field>
          <Field
            label="Programme section (optional)"
            htmlFor="evaluation-section"
            hint="For example A. Leave empty if the batch has no section."
          >
            <Input
              id="evaluation-section"
              maxLength={20}
              value={programmeSection}
              onChange={(event) => setProgrammeSection(event.target.value)}
              disabled={Boolean(downloading)}
            />
          </Field>
        </div>
        <QueryState
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
        >
          {data && (
            <div className="space-y-4">
              <div className="border bg-muted/30 p-3 text-sm">
                <p className="font-semibold">
                  {data.institution?.name ?? "Institution details required"}
                </p>
                <p>
                  {data.subject.code} — {data.subject.name}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {data.rows.length} students · Full marks:{" "}
                  {data.subject.fullMarks} · Pass marks:{" "}
                  {data.subject.passMarks} · Date (BS): {data.bsDate}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Attendance {data.weights.attendance}%, class performance{" "}
                {data.weights.classPerformance}%, assignments{" "}
                {data.weights.assignment}%, assessments{" "}
                {data.weights.assessment}%. The weighted result is scaled to{" "}
                {data.subject.fullMarks} and rounded up to a whole mark. All
                enabled components must be complete.
              </p>
              {data.setupIssues.length > 0 && (
                <div
                  role="alert"
                  className="space-y-2 border border-destructive/30 bg-destructive/5 p-3 text-sm"
                >
                  <ul className="list-disc space-y-1 pl-4">
                    {data.setupIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  {isAdmin && (
                    <Link className="underline" to="/settings/institution">
                      Edit institution details
                    </Link>
                  )}
                </div>
              )}
              {blocked.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    Complete entries for {blocked.length} student
                    {blocked.length === 1 ? "" : "s"} to download calculated
                    marks
                  </h3>
                  <ul className="max-h-48 space-y-2 overflow-y-auto border p-3 text-xs">
                    {blocked.map((row) => (
                      <li key={row.enrollment}>
                        <p className="font-semibold">
                          {row.rollNumber} — {row.fullName}
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          {row.issues.join(" ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                An explicit absence from every assessment is printed as A. A
                missed assessment contributes zero when other assessments are
                present. Dropout, transferred and withdrawn students retain
                their roster row with a status remark.
              </p>
            </div>
          )}
        </QueryState>
        {downloadError && (
          <p role="alert" className="text-sm text-destructive">
            {downloadError}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={
              !data?.canDownloadBlank ||
              query.isFetching ||
              Boolean(downloading)
            }
            onClick={() => void download("blank")}
          >
            <Download className="size-4" aria-hidden />
            {downloading === "blank" ? "Downloading…" : "Download blank sheet"}
          </Button>
          <Button
            disabled={
              !data?.canDownloadCalculated ||
              query.isFetching ||
              Boolean(downloading)
            }
            onClick={() => void download("calculated")}
          >
            <Download className="size-4" aria-hidden />
            {downloading === "calculated"
              ? "Downloading…"
              : "Download calculated sheet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
