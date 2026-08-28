import { useCallback, useMemo, useState } from "react"

import { PAGE_SIZE } from "@/components/pagination"
import type { ListParams } from "@/lib/api"

/**
 * Offset paging with filters that reset it.
 *
 * Changing a filter or a search term while on page 4 would otherwise ask the
 * server for rows that no longer exist, so any filter change sends the reader
 * back to the first page.
 */
export function usePagedQuery<F extends Record<string, unknown>>(
  initialFilters: F,
  pageSize = PAGE_SIZE
) {
  const [offset, setOffset] = useState(0)
  const [filters, setFiltersState] = useState<F>(initialFilters)

  const setFilters = useCallback((next: Partial<F>) => {
    setFiltersState((current) => ({ ...current, ...next }))
    setOffset(0)
  }, [])

  const params = useMemo<ListParams>(() => {
    const cleaned: ListParams = { limit: pageSize, offset }

    for (const [key, value] of Object.entries(filters)) {
      if (
        value === "" ||
        value === "all" ||
        value === undefined ||
        value === null
      ) {
        continue
      }
      cleaned[key] = value as ListParams[string]
    }

    return cleaned
  }, [filters, offset, pageSize])

  return { params, offset, setOffset, filters, setFilters, pageSize }
}
