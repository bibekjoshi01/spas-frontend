import type { Key, ReactNode } from "react"
import { Search, X } from "lucide-react"

import { Pagination } from "@/components/pagination"
import { QueryState } from "@/components/query-state"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface Column<T> {
  /** Header text. Empty renders a blank header, for an actions column. */
  header: string
  className?: string
  cell: (row: T, rowIndex: number) => ReactNode
}

interface ResourceListProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => Key

  isLoading: boolean
  isFetching?: boolean
  error?: unknown
  refetch?: () => void

  count?: number
  offset?: number
  onOffsetChange?: (offset: number) => void

  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  /** Selects and other narrowing controls, left of the action button. */
  filters?: ReactNode
  clearFilters?: {
    visible: boolean
    onClear: () => void
  }
  action?: ReactNode

  emptyTitle: string
  emptyMessage: string
  emptyAction?: ReactNode
}

/**
 * A table with its toolbar, states and paging.
 *
 * Every management table goes through this, so search sits in the same place,
 * an empty result reads the same way, and no screen forgets to paginate.
 */
export function ResourceList<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isFetching,
  error,
  refetch,
  count,
  offset = 0,
  onOffsetChange,
  search,
  filters,
  clearFilters,
  action,
  emptyTitle,
  emptyMessage,
  emptyAction,
}: ResourceListProps<T>) {
  const hasToolbar = Boolean(search || filters || action)

  return (
    <div className="space-y-3">
      {hasToolbar && (
        <div className="flex flex-wrap items-stretch justify-between gap-3 rounded-sm border bg-card p-2 sm:items-center">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 [&_[data-slot=select-trigger]]:max-w-full">
            {search && (
              <div className="relative w-full sm:w-72">
                <Search
                  className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                  placeholder={search.placeholder ?? "Search"}
                  className="pl-8"
                  aria-label={search.placeholder ?? "Search"}
                />
              </div>
            )}
            {filters}
            {clearFilters?.visible && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters.onClear}
                className="text-muted-foreground"
              >
                <X className="size-4" aria-hidden />
                Clear filters
              </Button>
            )}
          </div>

          {action && (
            <div className="flex w-full items-center justify-end sm:w-auto">
              {action}
            </div>
          )}
        </div>
      )}

      <QueryState
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error}
        isEmpty={rows?.length === 0}
        onRetry={refetch}
        skeleton="table"
        emptyTitle={emptyTitle}
        emptyMessage={emptyMessage}
        emptyAction={emptyAction}
      >
        <div
          className={cn(
            "overflow-x-auto rounded-lg border bg-table-surface transition-opacity",
            isFetching && !isLoading && "opacity-60"
          )}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-table-header-border bg-table-header hover:bg-table-header">
                {columns.map((column, index) => (
                  <TableHead
                    key={index}
                    className={cn(
                      "text-xs whitespace-nowrap",
                      column.className
                    )}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows?.map((row, rowIndex) => (
                <TableRow key={rowKey(row)} className="group">
                  {columns.map((column, index) => (
                    <TableCell key={index} className={column.className}>
                      {column.cell(row, rowIndex)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </QueryState>

      {onOffsetChange && count !== undefined && rows && rows.length > 0 && (
        <Pagination
          count={count}
          offset={offset}
          onOffsetChange={onOffsetChange}
          isFetching={isFetching}
        />
      )}
    </div>
  )
}

/** The action buttons at the end of a row, revealed on hover or focus. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-0.5 opacity-100 transition-opacity focus-within:opacity-100 md:opacity-60 md:group-hover:opacity-100">
      {children}
    </div>
  )
}
