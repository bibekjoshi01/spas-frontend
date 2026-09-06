import { useState } from "react"
import { Save } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DEFAULT_ELIGIBILITY_THRESHOLD,
  useGetPerformanceWeightsQuery,
  useUpdatePerformanceWeightsMutation,
  useGetStudentPortalSettingsQuery,
  useUpdateStudentPortalSettingsMutation,
} from "@/lib/api"
import { formatPercentage } from "@/lib/utils"
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

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

export default function PerformanceSettings() {
  const { data, isLoading, isError, refetch } = useGetPerformanceWeightsQuery()
  const [update, { isLoading: isSaving }] =
    useUpdatePerformanceWeightsMutation()
  const [changes, setChanges] = useState<Partial<typeof DEFAULTS>>({})
  const [threshold, setThreshold] = useState<number | null>(null)
  const portal = useGetStudentPortalSettingsQuery()
  const [updatePortal, { isLoading: isSavingPortal }] =
    useUpdateStudentPortalSettingsMutation()

  const values = {
    attendanceWeight: data?.attendanceWeight ?? DEFAULTS.attendanceWeight,
    classPerformanceWeight:
      data?.classPerformanceWeight ?? DEFAULTS.classPerformanceWeight,
    assignmentWeight: data?.assignmentWeight ?? DEFAULTS.assignmentWeight,
    assessmentWeight: data?.assessmentWeight ?? DEFAULTS.assessmentWeight,
    ...changes,
  }
  const savedThreshold = Number(data?.attendanceEligibilityThreshold)
  const eligibility =
    threshold ??
    (Number.isFinite(savedThreshold)
      ? savedThreshold
      : DEFAULT_ELIGIBILITY_THRESHOLD)

  const total = Object.values(values).reduce((sum, value) => sum + value, 0)
  const valid =
    total === 100 && Object.values(values).every((value) => value >= 0)

  async function save() {
    if (!valid) return
    try {
      await update({
        ...values,
        // Decimals cross the wire as strings, as exam marks do.
        attendanceEligibilityThreshold: eligibility.toFixed(2),
      }).unwrap()
      notifier.success("Performance settings saved.")
    } catch {
      notifier.error("Could not save performance settings.")
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-3 md:p-4">
      <PageHeader
        title="Performance Settings"
        actions={
          <Button
            onClick={save}
            disabled={!valid || isLoading || isError || isSaving}
          >
            <Save className="size-4" aria-hidden />
            {isSaving ? "Saving…" : "Save settings"}
          </Button>
        }
      />

      <section className="border bg-card" aria-labelledby="weight-heading">
        <div className="border-b bg-band-info px-4 py-3">
          <h1
            id="weight-heading"
            className="text-base font-bold text-band-info-foreground"
          >
            Performance weightage
          </h1>
          <p className="mt-1 text-sm text-band-info-foreground/70">
            Set how much each metric contributes to the overall student
            performance score.
          </p>
        </div>

        {isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-destructive">
            <p>
              Could not load performance settings. Nothing can be saved until
              they load.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={refetch}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="divide-y bg-card">
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
                {isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <div className="relative">
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      max={100}
                      value={values[key]}
                      disabled={isError}
                      onChange={(event) =>
                        setChanges((current) => ({
                          ...current,
                          [key]: clampPercent(Number(event.target.value)),
                        }))
                      }
                      className="pr-8 text-right font-semibold tabular-nums"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className={`flex items-center justify-between border-t px-4 py-3 text-sm font-bold ${
            isLoading
              ? "bg-muted text-muted-foreground"
              : valid
                ? "bg-success-soft text-success"
                : "bg-destructive-soft text-destructive"
          }`}
        >
          {isLoading ? (
            <span>Loading the saved settings…</span>
          ) : (
            <>
              <span>
                {valid ? "Ready to save" : "Weights must total exactly 100%"}
              </span>
              <span className="tabular-nums">
                Total: {formatPercentage(total)}
              </span>
            </>
          )}
        </div>
      </section>

      <section className="border bg-card" aria-labelledby="eligibility-heading">
        <div className="border-b bg-band-info px-4 py-3">
          <h2
            id="eligibility-heading"
            className="text-base font-bold text-band-info-foreground"
          >
            Attendance requirement
          </h2>
          <p className="mt-1 text-sm text-band-info-foreground/70">
            The attendance your university requires. Set it once and every
            eligibility badge, roster flag and attention queue measures against
            it.
          </p>
        </div>

        <div className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_140px] sm:items-center">
          <div>
            <Label htmlFor="eligibility" className="font-semibold">
              Minimum attendance
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              A student below this appears in the attendance attention queue.
              Most colleges apply 75%.
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <div className="relative">
              <Input
                id="eligibility"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={eligibility}
                disabled={isError}
                onChange={(event) =>
                  setThreshold(clampPercent(Number(event.target.value)))
                }
                className="pr-8 text-right font-semibold tabular-nums"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-muted-foreground">
                %
              </span>
            </div>
          )}
        </div>
      </section>

      <section
        className="border bg-card"
        aria-labelledby="student-login-heading"
      >
        <div className="border-b bg-band-info px-4 py-3">
          <h2
            id="student-login-heading"
            className="text-base font-bold text-band-info-foreground"
          >
            Student portal
          </h2>
          <p className="mt-1 text-sm text-band-info-foreground/70">
            Control whether students at this college can sign in and view their
            own academic record.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-5">
          <div>
            <Label htmlFor="student-login" className="font-semibold">
              Enable student login
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              When disabled, student credentials are rejected and portal data
              remains inaccessible.
            </p>
          </div>
          {portal.isLoading ? (
            <Skeleton className="h-6 w-11" />
          ) : portal.isError ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={portal.refetch}
            >
              Retry
            </Button>
          ) : (
            <Checkbox
              className="shrink-0"
              id="student-login"
              checked={portal.data?.loginEnabled ?? false}
              disabled={portal.isError || isSavingPortal}
              onCheckedChange={async (checked) => {
                const loginEnabled = checked === true
                try {
                  await updatePortal({ loginEnabled }).unwrap()
                  notifier.success(
                    loginEnabled
                      ? "Student login enabled."
                      : "Student login disabled."
                  )
                } catch {
                  notifier.error("Could not update student login.")
                }
              }}
            />
          )}
        </div>
      </section>
    </div>
  )
}
