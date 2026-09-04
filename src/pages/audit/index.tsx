import { useEffect, useMemo } from "react"

import { AuditTrail } from "@/components/audit-trail"
import { FilterBar } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { DatePickerInput } from "@/components/ui/date-time-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePagedQuery } from "@/hooks/use-paged-query"
import {
  ALL,
  type AuditAction,
  useGetAuditResourcesQuery,
  useGetAuditTrailQuery,
  useGetUsersQuery,
} from "@/lib/api"
import { localDateKey } from "@/lib/utils/date"

const ACTIONS: { value: AuditAction; label: string }[] = [
  { value: "CREATED", label: "Created" },
  { value: "UPDATED", label: "Edited" },
  { value: "DELETED", label: "Archived" },
]

/**
 * The record of who changed what.
 *
 * A trail is always about one kind of record: an audit asks "who edited this
 * mark", not "what happened everywhere". Choosing the kind first keeps the
 * question — and the query behind it — answerable.
 */
export default function AuditPage() {
  const resources = useGetAuditResourcesQuery()
  const staff = useGetUsersQuery(ALL)
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    resource: "",
    actor: "all",
    action: "all",
    from: "",
    to: "",
  })

  const options = useMemo(() => resources.data ?? [], [resources.data])

  // Land on the first trail this account may open, rather than an empty screen
  // asking a question the reader has no context to answer yet.
  useEffect(() => {
    if (!filters.resource && options.length) {
      setFilters({ resource: options[0].slug })
    }
  }, [filters.resource, options, setFilters])

  const trail = useGetAuditTrailQuery(
    { ...params, resource: filters.resource },
    { skip: !filters.resource }
  )
  const data = trail.data
  const chosen = options.find((row) => row.slug === filters.resource)

  return (
    <div className="mx-auto max-w-[1100px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Audit trail"
        description="Every change to a record, with who made it and what it was before."
        meta={
          data && (
            <span className="tabular-nums">
              {data.count} {data.count === 1 ? "change" : "changes"} recorded
            </span>
          )
        }
      />

      <QueryState
        isLoading={resources.isLoading}
        error={resources.error}
        isEmpty={options.length === 0}
        onRetry={resources.refetch}
        skeleton="table"
        emptyTitle="No trails available"
        emptyMessage="Your account has no permissions that open an audit trail."
      >
        <div className="space-y-3">
          {/* FilterBar renders a fragment and takes its layout from the parent,
              which is the row ResourceList gives it on every other screen. */}
          <div className="flex flex-wrap items-stretch gap-3 rounded-sm border bg-card p-2 sm:items-center">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 [&_[data-slot=select-trigger]]:max-w-full">
              <FilterBar
                pageKey="audit"
                filters={[
                  {
                    id: "resource",
                    label: "Record type",
                    // The trail is *of* one kind of record; without one there is
                    // nothing to show, so it never leaves the toolbar.
                    pinned: true,
                    control: (
                      <Select
                        value={filters.resource}
                        onValueChange={(resource) => setFilters({ resource })}
                      >
                        <SelectTrigger
                          className="w-56"
                          aria-label="Choose a record type"
                        >
                          <SelectValue placeholder="Choose a record type" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((row) => (
                            <SelectItem key={row.slug} value={row.slug}>
                              {row.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ),
                  },
                  {
                    id: "actor",
                    label: "Changed by",
                    isActive: filters.actor !== "all",
                    onReset: () => setFilters({ actor: "all" }),
                    control: (
                      <Select
                        value={filters.actor}
                        onValueChange={(actor) => setFilters({ actor })}
                      >
                        <SelectTrigger
                          className="w-52"
                          aria-label="Filter by who made the change"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Anyone</SelectItem>
                          {staff.data?.results.map((row) => (
                            <SelectItem key={row.id} value={String(row.id)}>
                              {row.fullName || row.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ),
                  },
                  {
                    id: "action",
                    label: "Change type",
                    isActive: filters.action !== "all",
                    onReset: () => setFilters({ action: "all" }),
                    control: (
                      <Select
                        value={filters.action}
                        onValueChange={(action) => setFilters({ action })}
                      >
                        <SelectTrigger
                          className="w-40"
                          aria-label="Filter by change type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All changes</SelectItem>
                          {ACTIONS.map((row) => (
                            <SelectItem key={row.value} value={row.value}>
                              {row.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ),
                  },
                  {
                    id: "range",
                    label: "Date range",
                    isActive: Boolean(filters.from || filters.to),
                    onReset: () => setFilters({ from: "", to: "" }),
                    control: (
                      <>
                        <DatePickerInput
                          className="w-44"
                          value={filters.from}
                          max={filters.to || localDateKey()}
                          onValueChange={(from) => setFilters({ from })}
                          aria-label="Changes from"
                        />
                        <DatePickerInput
                          className="w-44"
                          value={filters.to}
                          min={filters.from || undefined}
                          max={localDateKey()}
                          onValueChange={(to) => setFilters({ to })}
                          aria-label="Changes up to"
                        />
                      </>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          <AuditTrail
            entries={data?.results}
            isLoading={trail.isLoading}
            isFetching={trail.isFetching}
            error={trail.error}
            refetch={trail.refetch}
            count={data?.count}
            offset={offset}
            onOffsetChange={setOffset}
            emptyMessage={
              chosen
                ? `No changes to any ${chosen.label.toLowerCase()} match these filters.`
                : "Choose a record type to see its history."
            }
          />
        </div>
      </QueryState>
    </div>
  )
}
