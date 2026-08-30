import { eligibilityFor } from "@/lib/api"
import { useEligibilityThreshold } from "@/hooks/use-eligibility-threshold"
import { cn } from "@/lib/utils"

const TONE = {
  eligible: "bg-emerald-500",
  borderline: "bg-amber-500",
  "at-risk": "bg-rose-500",
} as const

const TEXT_TONE = {
  eligible: "text-emerald-600 dark:text-emerald-400",
  borderline: "text-amber-600 dark:text-amber-400",
  "at-risk": "text-rose-600 dark:text-rose-400",
} as const

interface AttendanceMeterProps {
  percentage: number
  /** Renders the number beside the bar. */
  showValue?: boolean
  className?: string
}

/**
 * Attendance as a bar with the eligibility line marked on it.
 *
 * The college's requirement is drawn, not implied, so a teacher can see who is
 * close to losing eligibility without reading the number.
 */
export function AttendanceMeter({
  percentage,
  showValue = true,
  className,
}: AttendanceMeterProps) {
  const threshold = useEligibilityThreshold()
  const tone = eligibilityFor(percentage, threshold)
  const clamped = Math.max(0, Math.min(100, percentage))

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative h-2 w-full min-w-16 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${percentage}% attendance, ${threshold}% required`}
      >
        <div
          className={cn("h-full rounded-full transition-all", TONE[tone])}
          style={{ width: `${clamped}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${threshold}%` }}
          aria-hidden
        />
      </div>

      {showValue && (
        <span
          className={cn(
            "w-11 shrink-0 text-right text-xs font-medium tabular-nums",
            TEXT_TONE[tone]
          )}
        >
          {percentage}%
        </span>
      )}
    </div>
  )
}
