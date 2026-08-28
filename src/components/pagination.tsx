import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export const PAGE_SIZE = 10

interface PaginationProps {
  /** Total rows on the server, not the number on this page. */
  count: number
  offset: number
  onOffsetChange: (offset: number) => void
  pageSize?: number
  /** Shown while a page is being fetched, so the row count stops flickering. */
  isFetching?: boolean
}

/**
 * Page controls for a server-paginated table.
 *
 * The backend pages on limit/offset, so this works in offsets and lets the
 * caller keep its query key simple.
 */
export function Pagination({
  count,
  offset,
  onOffsetChange,
  pageSize = PAGE_SIZE,
  isFetching,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize))
  const page = Math.floor(offset / pageSize) + 1

  const first = count === 0 ? 0 : offset + 1
  const last = Math.min(offset + pageSize, count)

  if (count <= pageSize) {
    return count > 0 ? (
      <p className="px-1 text-xs text-muted-foreground">
        {count} {count === 1 ? "row" : "rows"}
      </p>
    ) : null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-xs text-muted-foreground tabular-nums">
        {isFetching ? "Loading…" : `${first}–${last} of ${count}`}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </Button>

        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          Page {page} of {pageCount}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={last >= count}
          onClick={() => onOffsetChange(offset + pageSize)}
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
