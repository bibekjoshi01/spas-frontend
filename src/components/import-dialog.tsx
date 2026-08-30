import { type ReactNode, useRef, useState } from "react"
import { Download, FileSpreadsheet, Upload } from "lucide-react"

import { InlineSpinner } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ImportResult, ImportRow } from "@/lib/api"
import { apiErrorMessage } from "@/lib/api"
import { axiosInstance } from "@/lib/redux/axios"
import { notifier } from "@/lib/utils/notifier"
import { cn } from "@/lib/utils"

const ACCEPT = ".csv,.xlsx,.xlsm"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  /** API path of the template, fetched through axios so it carries the token. */
  templatePath: string
  templateFilename: string
  /** Validates and reports, writing nothing. */
  onPreview: (file: File) => Promise<ImportResult>
  /** Writes, and only ever called when the preview found no errors. */
  onCommit: (file: File) => Promise<ImportResult>
  /** What one imported record is called, for the summary line. */
  noun: { one: string; many: string }
  /** Where the rows will land — a batch, a program — chosen by the page. */
  preface?: ReactNode
  /**
   * False while that choice is still outstanding.
   *
   * A preview describes one file landing in one place, so when the
   * destination changes the caller should remount this with a new `key`
   * rather than leave a preview that is no longer about anything on screen.
   */
  ready?: boolean
}

/**
 * Bring a college's existing spreadsheet in, without trusting it.
 *
 * Nothing is written until the reader has seen what would happen: choosing a
 * file reports row by row, and only then does the import button appear. That
 * ordering is the whole point — an 800-row intake sheet is not something to
 * find the mistakes in afterwards.
 */
export function ImportDialog({
  open,
  onOpenChange,
  title,
  description,
  templatePath,
  templateFilename,
  onPreview,
  onCommit,
  noun,
  preface,
  ready = true,
}: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const close = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const choose = async (chosen: File | undefined) => {
    if (!chosen) return
    setFile(chosen)
    setResult(null)
    setError(null)
    setIsReading(true)
    try {
      setResult(await onPreview(chosen))
    } catch (cause) {
      setError(apiErrorMessage(cause))
    } finally {
      setIsReading(false)
    }
  }

  const commit = async () => {
    if (!file) return
    setIsImporting(true)
    try {
      const committed = await onCommit(file)
      notifier.success(
        `Imported ${committed.summary.create} new and updated ${committed.summary.update} ${
          committed.summary.create + committed.summary.update === 1
            ? noun.one
            : noun.many
        }.`
      )
      close(false)
    } catch (cause) {
      setError(apiErrorMessage(cause))
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await axiosInstance.get(templatePath, {
        responseType: "blob",
      })
      const url = URL.createObjectURL(response.data as Blob)
      const link = document.createElement("a")
      link.href = url
      link.download = templateFilename
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      notifier.error("Could not download the template.")
    }
  }

  const summary = result?.summary
  const canImport = Boolean(summary && summary.error === 0 && summary.total > 0)

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {preface}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={!ready || isReading || isImporting}
            >
              <FileSpreadsheet className="size-4" aria-hidden />
              {file ? "Choose another file" : "Choose a file"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void downloadTemplate()}
            >
              <Download className="size-4" aria-hidden />
              Download template
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(event) => void choose(event.target.files?.[0])}
            />
            {file && (
              <span className="text-sm text-muted-foreground">{file.name}</span>
            )}
          </div>

          {isReading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <InlineSpinner /> Checking every row…
            </p>
          )}

          {error && (
            <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {summary && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Tally label="Rows" value={summary.total} />
                <Tally label="To create" value={summary.create} tone="create" />
                <Tally label="To update" value={summary.update} tone="update" />
                <Tally label="Errors" value={summary.error} tone="error" />
              </div>

              {result?.columns.ignored.length ? (
                <p className="text-xs text-muted-foreground">
                  Ignored columns: {result.columns.ignored.join(", ")}
                </p>
              ) : null}

              <div className="max-h-72 overflow-y-auto rounded-sm border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left">
                      <th className="w-14 px-2 py-1.5 font-medium">Row</th>
                      <th className="px-2 py-1.5 font-medium">Record</th>
                      <th className="px-2 py-1.5 font-medium">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result?.rows.map((row) => (
                      <ResultRow key={row.row} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>

              {summary.error > 0 && (
                <p className="text-sm text-destructive">
                  Nothing will be imported until every row is fixed. Correct the
                  file and choose it again.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void commit()}
            disabled={!canImport || isImporting || isReading}
          >
            {isImporting ? (
              <InlineSpinner />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            {summary && canImport
              ? `Import ${summary.total} ${summary.total === 1 ? noun.one : noun.many}`
              : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "create" | "update" | "error"
}) {
  return (
    <div className="rounded-sm border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-bold tabular-nums",
          tone === "create" &&
            value > 0 &&
            "text-emerald-600 dark:text-emerald-400",
          tone === "update" &&
            value > 0 &&
            "text-amber-600 dark:text-amber-400",
          tone === "error" && value > 0 && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ResultRow({ row }: { row: ImportRow }) {
  return (
    <tr className={cn(row.action === "error" && "bg-destructive/5")}>
      <td className="px-2 py-1.5 text-muted-foreground tabular-nums">
        {row.row}
      </td>
      <td className="px-2 py-1.5">{row.identity || "—"}</td>
      <td className="px-2 py-1.5">
        {row.action === "error" ? (
          <span className="text-destructive">{messagesFor(row)}</span>
        ) : row.action === "update" ? (
          <span className="text-amber-700 dark:text-amber-400">
            {row.changes.length
              ? `Updates ${row.changes.join(", ")}`
              : "Already up to date"}
          </span>
        ) : (
          <span className="text-emerald-700 dark:text-emerald-400">New</span>
        )}
      </td>
    </tr>
  )
}

/** Field errors flattened into one readable line. */
function messagesFor(row: ImportRow): string {
  if (!row.errors) return "Could not be imported"
  return Object.entries(row.errors)
    .map(([field, messages]) => {
      const text = Array.isArray(messages)
        ? messages.join(" ")
        : String(messages)
      return field === "__all__" || field === "nonFieldErrors"
        ? text
        : `${field}: ${text}`
    })
    .join(" · ")
}
