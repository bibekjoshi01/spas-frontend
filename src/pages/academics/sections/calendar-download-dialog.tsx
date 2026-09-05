import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { FormDialog } from "@/components/form-dialog"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  type CalendarYear,
  useGetCalendarYearQuery,
  useGetStudentCalendarYearQuery,
} from "@/lib/api"
import type { CalendarExportMonth } from "@/lib/calendar-pdf"

const digits = (value: number) =>
  String(value).replace(/\d/g, (digit) => "०१२३४५६७८९"[Number(digit)])

export function CalendarDownloadDialog({
  initialYear,
  isStudent,
  onClose,
}: {
  initialYear: CalendarYear
  isStudent: boolean
  onClose: () => void
}) {
  const [year, setYear] = useState(initialYear.year)
  const [selected, setSelected] = useState<Record<string, CalendarExportMonth>>(
    () =>
      Object.fromEntries(
        initialYear.months.map((month) => [
          `${initialYear.year}-${month.index}`,
          { year: initialYear.year, month },
        ])
      )
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const staff = useGetCalendarYearQuery(
    { system: "BS", year },
    { skip: isStudent }
  )
  const portal = useGetStudentCalendarYearQuery(
    { system: "BS", year },
    { skip: !isStudent }
  )
  const query = isStudent ? portal : staff
  const data = query.currentData
  const count = Object.keys(selected).length

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title="Download calendar"
      submitLabel={`Download PDF (${count} ${count === 1 ? "month" : "months"})`}
      canSubmit={count > 0}
      isSubmitting={pending}
      formError={error}
      onSubmit={async () => {
        setError(null)
        setPending(true)
        try {
          const { downloadCalendarPdf } = await import("@/lib/calendar-pdf")
          await downloadCalendarPdf(Object.values(selected))
          onClose()
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not create the PDF. Please try again."
          )
        } finally {
          setPending(false)
        }
      }}
    >
      <fieldset disabled={pending} className="space-y-3">
        <legend className="sr-only">Months to include</legend>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous selection year"
            disabled={year <= initialYear.minYear || query.isFetching}
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="text-xl font-semibold">
            {digits(year)} / {year} BS
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next selection year"
            disabled={year >= initialYear.maxYear || query.isFetching}
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!data || query.isError || query.isFetching}
            onClick={() =>
              data &&
              setSelected((previous) => ({
                ...previous,
                ...Object.fromEntries(
                  data.months.map((month) => [
                    `${year}-${month.index}`,
                    { year, month },
                  ])
                ),
              }))
            }
          >
            Select this year
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!count}
            onClick={() => setSelected({})}
          >
            Clear all
          </Button>
        </div>
        <QueryState
          isLoading={query.isLoading || (query.isFetching && !data)}
          error={query.error}
          onRetry={query.refetch}
        >
          <div className="grid grid-cols-2 gap-2">
            {data?.months.map((month) => {
              const key = `${year}-${month.index}`
              return (
                <Label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-sm border bg-white p-3 text-slate-900"
                >
                  <Checkbox
                    className="data-[state=checked]:text-slate-900"
                    checked={Boolean(selected[key])}
                    onCheckedChange={(checked) =>
                      setSelected((previous) => {
                        const next = { ...previous }
                        if (checked === true) next[key] = { year, month }
                        else delete next[key]
                        return next
                      })
                    }
                  />
                  <span>
                    {month.nameNepali}{" "}
                    <span className="block text-xs font-normal text-slate-600">
                      {month.name}
                    </span>
                  </span>
                </Label>
              )
            })}
          </div>
        </QueryState>
      </fieldset>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {count === 0
          ? "Select at least one month to download."
          : `${count} months selected: ${[...new Set(Object.values(selected).map((item) => item.year))].sort().join(", ")} BS.`}
      </p>
    </FormDialog>
  )
}
