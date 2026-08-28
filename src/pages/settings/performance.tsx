import { useState } from "react"
import { Save } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useGetPerformanceWeightsQuery,
  useUpdatePerformanceWeightsMutation,
} from "@/lib/api/teaching.api"
import { notifier } from "@/lib/utils/notifier"

const DEFAULTS = {
  attendanceWeight: 20,
  classPerformanceWeight: 10,
  assignmentWeight: 30,
  assessmentWeight: 40,
}

const FIELDS = [
  [
    "attendanceWeight",
    "Attendance",
    "Attendance consistency across held classes.",
  ],
  [
    "classPerformanceWeight",
    "Class performance",
    "Teacher's overall classroom rating.",
  ],
  ["assignmentWeight", "Assignments", "Completion and submission performance."],
  ["assessmentWeight", "Assessments", "Marks earned in internal assessments."],
] as const

export default function PerformanceSettings() {
  const { data, isLoading, isError } = useGetPerformanceWeightsQuery()
  const [update, { isLoading: isSaving }] =
    useUpdatePerformanceWeightsMutation()
  const [changes, setChanges] = useState<Partial<typeof DEFAULTS>>({})
  const values = {
    attendanceWeight: data?.attendanceWeight ?? DEFAULTS.attendanceWeight,
    classPerformanceWeight:
      data?.classPerformanceWeight ?? DEFAULTS.classPerformanceWeight,
    assignmentWeight: data?.assignmentWeight ?? DEFAULTS.assignmentWeight,
    assessmentWeight: data?.assessmentWeight ?? DEFAULTS.assessmentWeight,
    ...changes,
  }

  const total = Object.values(values).reduce((sum, value) => sum + value, 0)
  const valid =
    total === 100 && Object.values(values).every((value) => value >= 0)

  async function save() {
    if (!valid) return
    try {
      await update(values).unwrap()
      notifier.success("Performance weights saved.")
    } catch {
      notifier.error("Could not save performance weights.")
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-3 md:p-4">
      <PageHeader
        title="Performance Settings"
        actions={
          <Button onClick={save} disabled={!valid || isLoading || isSaving}>
            <Save className="size-4" aria-hidden />
            {isSaving ? "Saving…" : "Save weights"}
          </Button>
        }
      />

      <section
        className="border bg-white dark:bg-slate-950"
        aria-labelledby="weight-heading"
      >
        <div className="border-b bg-blue-50 px-4 py-3 dark:bg-blue-950/40">
          <h1
            id="weight-heading"
            className="text-base font-bold text-blue-950 dark:text-blue-100"
          >
            Performance weightage
          </h1>
          <p className="mt-1 text-sm text-blue-900/70 dark:text-blue-200/70">
            Set how much each metric contributes to the overall student
            performance score.
          </p>
        </div>

        {isError ? (
          <p className="px-4 py-6 text-sm text-destructive">
            Could not load performance settings.
          </p>
        ) : (
          <div className="divide-y bg-white dark:bg-slate-950">
            {FIELDS.map(([key, label, description]) => (
              <div
                key={key}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_140px] sm:items-center"
              >
                <div>
                  <Label htmlFor={key} className="font-semibold">
                    {label}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </p>
                </div>
                <div className="relative">
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    value={values[key]}
                    disabled={isLoading}
                    onChange={(event) =>
                      setChanges((current) => ({
                        ...current,
                        [key]: Math.min(
                          100,
                          Math.max(0, Number(event.target.value))
                        ),
                      }))
                    }
                    className="pr-8 text-right font-semibold tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className={`flex items-center justify-between border-t px-4 py-3 text-sm font-bold ${valid ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
        >
          <span>
            {valid ? "Ready to save" : "Weights must total exactly 100%"}
          </span>
          <span className="tabular-nums">Total: {total}%</span>
        </div>
      </section>
    </div>
  )
}
