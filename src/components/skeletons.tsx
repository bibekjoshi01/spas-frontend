import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * The shapes a screen wears while it is still on its way.
 *
 * A skeleton beats a spinner only when it stands where the real thing will
 * stand, so each of these mirrors the layout it waits for — the same tiles,
 * the same table, the same panels. The screen then fills in rather than
 * jumping, and the reader can already see what they are waiting for.
 *
 * They live together, away from the screens themselves, because a lazily
 * loaded screen cannot supply its own skeleton: whoever waits for the chunk
 * has to draw it.
 */

/** Cell widths cycle so a skeleton row reads like text, not like a bar chart. */
const CELL_WIDTHS = ["w-full", "w-4/5", "w-2/3", "w-3/4", "w-1/2"]

/** A bordered table with its header band, matching `ResourceList`. */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white dark:bg-slate-950",
        className
      )}
    >
      <div className="flex gap-4 border-b-2 border-slate-300 bg-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
        {Array.from({ length: columns }).map((_, column) => (
          <Skeleton
            key={column}
            className="h-3 flex-1 bg-slate-300 dark:bg-slate-700"
          />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-3 py-3.5">
            {Array.from({ length: columns }).map((_, column) => (
              <div key={column} className="flex-1">
                <Skeleton
                  className={cn(
                    "h-3.5",
                    CELL_WIDTHS[(row + column) % CELL_WIDTHS.length]
                  )}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** A row of bordered metric tiles, as the reports carry above their tables. */
export function MetricRowSkeleton({
  count = 3,
  className = "sm:grid-cols-3",
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border bg-white p-3 dark:bg-slate-950">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-14" />
        </div>
      ))}
    </div>
  )
}

/** A panel with its heading band — the block the reports are built from. */
export function PanelSkeleton({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cn("border bg-white dark:bg-slate-950", className)}>
      <div className="border-b bg-slate-100 px-3 py-2.5 dark:bg-slate-900">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
      </div>
      {children ?? <LinesSkeleton />}
    </section>
  )
}

/** A few lines of body text. */
function LinesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", CELL_WIDTHS[index % CELL_WIDTHS.length])}
        />
      ))}
    </div>
  )
}

/** Rows in a bordered list — the shape the enrolment and marking dialogs use. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="divide-y rounded-md border bg-white dark:bg-slate-950">
      {Array.from({ length: rows }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-4 shrink-0" />
          <Skeleton
            className={cn("h-3.5", CELL_WIDTHS[index % CELL_WIDTHS.length])}
          />
        </li>
      ))}
    </ul>
  )
}

/** The search-and-filters bar every management list opens with. */
export function ToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border bg-card p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-8 w-28" />
    </div>
  )
}

/** The dashboard: four stat tiles over two columns of panels. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-l-4 bg-card px-6 py-4"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-7 rounded-none" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="mt-2 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton>
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="mt-1.5 h-3 w-3/5" />
                </div>
                <Skeleton className="h-8 w-28 shrink-0" />
              </div>
            ))}
          </div>
        </PanelSkeleton>

        <PanelSkeleton>
          <div className="space-y-3 p-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="space-y-1.5 border-b pb-3 last:border-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </PanelSkeleton>
      </div>
    </div>
  )
}

/**
 * A whole screen, for the wait between a route's chunk and its first paint.
 *
 * Each route says which shape it lands in, so the skeleton the router shows and
 * the one the screen shows while its data loads are the same drawing — the
 * reader sees one wait, not two.
 */
export function PageSkeleton({
  variant = "list",
}: {
  variant?: "list" | "dashboard"
}) {
  return (
    <div
      className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading page…</span>
      {variant === "dashboard" ? (
        <DashboardSkeleton />
      ) : (
        <>
          <ToolbarSkeleton />
          <TableSkeleton />
        </>
      )}
    </div>
  )
}

/** Metrics, a toolbar and a table: the shape of a class performance report. */
export function ClassReportSkeleton() {
  return (
    <div className="space-y-3">
      <MetricRowSkeleton count={3} />
      <div className="flex flex-wrap items-center justify-between gap-2 border bg-white p-2 dark:bg-slate-950">
        <Skeleton className="h-9 w-full sm:w-80" />
        <Skeleton className="h-8 w-44" />
      </div>
      <TableSkeleton rows={8} columns={8} />
    </div>
  )
}

/** One student's whole record: semesters, profile, then subject panels. */
export function StudentReportSkeleton() {
  return (
    <div className="space-y-4">
      <PanelSkeleton>
        <div className="flex gap-2 overflow-hidden p-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-36 shrink-0" />
          ))}
        </div>
      </PanelSkeleton>

      <PanelSkeleton>
        <div className="grid gap-x-8 gap-y-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1.5 h-4 w-32" />
            </div>
          ))}
        </div>
      </PanelSkeleton>

      <PanelSkeleton>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="border-b p-3 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-6 w-14" />
            </div>
          ))}
        </div>
      </PanelSkeleton>

      {Array.from({ length: 2 }).map((_, index) => (
        <PanelSkeleton key={index}>
          <div className="space-y-3 p-3">
            <MetricRowSkeleton count={3} />
            <TableSkeleton rows={3} columns={5} />
          </div>
        </PanelSkeleton>
      ))}
    </div>
  )
}

/** One student inside one subject: contact, attendance, then record tables. */
export function SubjectRecordSkeleton() {
  return (
    <div className="space-y-4">
      <PanelSkeleton>
        <div className="grid gap-x-8 gap-y-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1.5 h-4 w-32" />
            </div>
          ))}
        </div>
      </PanelSkeleton>
      <MetricRowSkeleton count={4} className="sm:grid-cols-2 lg:grid-cols-4" />
      <TableSkeleton rows={4} columns={5} />
      <TableSkeleton rows={3} columns={5} />
    </div>
  )
}
