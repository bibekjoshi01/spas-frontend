import { FilePlus2, Pencil, Trash2 } from "lucide-react"

import { Pagination } from "@/components/pagination"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import type { AuditAction, AuditEntry } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatDisplayDate } from "@/lib/utils/date"

const ACTION: Record<
  AuditAction,
  { label: string; icon: typeof Pencil; className: string }
> = {
  CREATED: {
    label: "Created",
    icon: FilePlus2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  UPDATED: {
    label: "Edited",
    icon: Pencil,
    className: "text-sky-600 dark:text-sky-400",
  },
  DELETED: {
    label: "Archived",
    icon: Trash2,
    className: "text-rose-600 dark:text-rose-400",
  },
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Groups a page of entries under the day they happened on. */
function byDay(entries: AuditEntry[]) {
  const days: { day: string; entries: AuditEntry[] }[] = []
  for (const entry of entries) {
    const day = entry.at.slice(0, 10)
    const last = days.at(-1)
    if (last?.day === day) last.entries.push(entry)
    else days.push({ day, entries: [entry] })
  }
  return days
}

/**
 * What changed, when, and who changed it.
 *
 * Entries sit on a spine under the day they happened, because "when" is the
 * axis an audit reads along. Each one states the change in full rather than
 * hiding it behind an expander: a trail whose contents need a second click is
 * a trail nobody reads, and the whole point is that the answer is visible.
 */
export function AuditTrail({
  entries,
  isLoading,
  isFetching,
  error,
  refetch,
  count,
  offset,
  onOffsetChange,
  /** Hide the record's name when every entry is about the same one. */
  showRecord = true,
  emptyMessage = "No changes have been recorded yet.",
}: {
  entries: AuditEntry[] | undefined
  isLoading: boolean
  isFetching?: boolean
  error?: unknown
  refetch?: () => void
  count?: number
  offset?: number
  onOffsetChange?: (offset: number) => void
  showRecord?: boolean
  emptyMessage?: string
}) {
  return (
    <div className="space-y-3">
      <QueryState
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error}
        isEmpty={entries?.length === 0}
        onRetry={refetch}
        skeleton="table"
        emptyTitle="Nothing recorded"
        emptyMessage={emptyMessage}
      >
        <div className="space-y-5">
          {byDay(entries ?? []).map(({ day, entries: rows }) => (
            <section key={day}>
              <h3 className="sticky top-0 z-10 bg-background/95 pb-2 text-xs font-semibold text-muted-foreground backdrop-blur">
                {formatDisplayDate(day)}
              </h3>

              <ol className="space-y-0 border-l pl-4">
                {rows.map((entry) => {
                  const action = ACTION[entry.action]
                  const Icon = action.icon
                  return (
                    <li key={entry.id} className="relative py-3">
                      <span
                        className={cn(
                          "absolute top-4 -left-[1.4rem] grid size-5 place-items-center rounded-full border bg-background",
                          action.className
                        )}
                        aria-hidden
                      >
                        <Icon className="size-3" />
                      </span>

                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            action.className
                          )}
                        >
                          {action.label}
                        </span>
                        {showRecord && (
                          <span className="text-sm">{entry.objectLabel}</span>
                        )}
                        <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                          {timeOf(entry.at)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.actor?.fullName ?? "System"}
                        {showRecord ? "" : ` · ${entry.resourceLabel}`}
                      </p>

                      {entry.changes.length > 0 && (
                        <dl className="mt-2 space-y-1 rounded-md border bg-muted/40 p-2">
                          {entry.changes.map((change) => (
                            <div
                              key={change.field}
                              className="grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[9rem_1fr]"
                            >
                              <dt className="font-medium">{change.label}</dt>
                              <dd className="m-0 flex flex-wrap items-baseline gap-1.5">
                                <Value value={change.from} muted />
                                <span
                                  aria-label="changed to"
                                  className="text-muted-foreground"
                                >
                                  &rarr;
                                </span>
                                <Value value={change.to} />
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      </QueryState>

      {onOffsetChange && count !== undefined && (entries?.length ?? 0) > 0 && (
        <Pagination
          count={count}
          offset={offset ?? 0}
          onOffsetChange={onOffsetChange}
          isFetching={isFetching}
        />
      )}
    </div>
  )
}

/** An empty field reads as "empty", not as a blank gap the eye skips. */
function Value({ value, muted }: { value: string | null; muted?: boolean }) {
  if (value === null) {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        empty
      </Badge>
    )
  }
  return (
    <span
      className={cn(
        "break-all",
        muted
          ? "text-muted-foreground line-through decoration-1"
          : "font-medium"
      )}
    >
      {value}
    </span>
  )
}
