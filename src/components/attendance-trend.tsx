import { Minus, TrendingDown, TrendingUp } from "lucide-react"

import { useEligibilityThreshold } from "@/hooks/use-eligibility-threshold"
import {
  type AttendanceTrend,
  type TrendDirection,
  eligibilityFor,
} from "@/lib/api"
import { cn, formatPercentage } from "@/lib/utils"

/**
 * Direction is a state, not a measurement, so it wears the status palette and
 * always ships an icon and a word beside the colour — the colour alone would
 * carry the whole meaning otherwise.
 */
const DIRECTION: Record<
  TrendDirection,
  { label: string; icon: typeof TrendingUp; className: string }
> = {
  RISING: {
    label: "Recovering",
    icon: TrendingUp,
    className: "text-emerald-700 dark:text-emerald-400",
  },
  FALLING: {
    label: "Still falling",
    icon: TrendingDown,
    className: "text-rose-700 dark:text-rose-400",
  },
  STEADY: {
    label: "Steady",
    icon: Minus,
    className: "text-muted-foreground",
  },
}

/** The line colour follows the standing, matching the meter beside it. */
const TONE = {
  eligible: "text-emerald-600 dark:text-emerald-400",
  borderline: "text-amber-600 dark:text-amber-400",
  "at-risk": "text-rose-600 dark:text-rose-400",
} as const

/**
 * Which way a standing is moving.
 *
 * The number on its own cannot separate a student who stopped attending a month
 * ago from one who has been climbing back ever since; this is the half that can.
 */
export function TrendBadge({
  trend,
  className,
}: {
  trend: AttendanceTrend | null | undefined
  className?: string
}) {
  if (!trend?.direction) return null
  const { label, icon: Icon, className: tone } = DIRECTION[trend.direction]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap",
        tone,
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  )
}

const WIDTH = 132
const HEIGHT = 40
const PAD = 4

/**
 * The standing week by week, drawn against the eligibility bar.
 *
 * Each point is the running figure as it stood that week, so the line can be
 * read against the threshold: it shows whether a student is heading toward the
 * bar or away from it, which a single lifetime number cannot. The scale is a
 * full 0–100 rather than fitted to the data — the distance to the bar is the
 * whole question, and a fitted axis would exaggerate a flat term into a cliff.
 */
export function AttendanceSparkline({
  trend,
  className,
}: {
  trend: AttendanceTrend
  className?: string
}) {
  const threshold = useEligibilityThreshold()
  const points = trend.points

  if (points.length < 2) return null

  const x = (index: number) =>
    PAD + (index / (points.length - 1)) * (WIDTH - PAD * 2)
  const y = (value: number) =>
    PAD + (1 - Math.max(0, Math.min(100, value)) / 100) * (HEIGHT - PAD * 2)

  const path = points
    .map(
      (point, index) => `${index ? "L" : "M"}${x(index)},${y(point.percentage)}`
    )
    .join(" ")
  const last = points[points.length - 1]
  const tone = TONE[eligibilityFor(last.percentage, threshold)]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={`Attendance over the last ${points.length} weeks, ending at ${formatPercentage(last.percentage)} against a ${formatPercentage(threshold)} requirement.`}
      className={cn("overflow-visible", tone, className)}
    >
      {/* The bar the line is read against, drawn rather than implied. */}
      <line
        x1={0}
        x2={WIDTH}
        y1={y(threshold)}
        y2={y(threshold)}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="3 3"
        className="text-muted-foreground/50"
        vectorEffect="non-scaling-stroke"
      />

      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Where the student stands now, which is the point being asked about. */}
      <circle
        cx={x(points.length - 1)}
        cy={y(last.percentage)}
        r={3.5}
        fill="currentColor"
      />

      {points.map((point, index) => (
        <circle
          key={point.week}
          cx={x(index)}
          cy={y(point.percentage)}
          r={6}
          fill="transparent"
        >
          <title>
            {`Week of ${point.week}: ${formatPercentage(point.percentage)} · ${point.attended} of ${point.held} attended`}
          </title>
        </circle>
      ))}
    </svg>
  )
}

/**
 * The whole story in one block: where they stand, how they have been lately,
 * and which way that is going.
 *
 * The figures are stated in words beside the drawing, so nothing here depends
 * on reading the line — or on telling its colour apart.
 */
export function AttendanceTrendSummary({
  trend,
  className,
}: {
  trend: AttendanceTrend | null | undefined
  className?: string
}) {
  if (!trend?.points.length) return null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3",
        className
      )}
    >
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <dt className="text-xs text-muted-foreground">Standing</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatPercentage(trend.overallPercentage)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            Last {trend.recentWeeks} weeks
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatPercentage(trend.recentPercentage)}
          </dd>
        </div>
        <TrendBadge trend={trend} className="text-sm" />
      </dl>

      <AttendanceSparkline trend={trend} />
    </div>
  )
}
