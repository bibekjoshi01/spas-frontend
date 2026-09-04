import { useState } from "react"
import { History } from "lucide-react"

import { AuditTrail } from "@/components/audit-trail"
import { Button } from "@/components/ui/button"
import { useGetAuditTrailQuery } from "@/lib/api"

/**
 * One record's own history, for dropping into a detail screen.
 *
 * Collapsed until asked for: the trail is a second question about a record, not
 * part of reading it, and fetching it on every open would put a query behind a
 * panel most readers never expand.
 */
export function RecordHistory({
  resource,
  objectId,
  label = "Change history",
}: {
  /** Registry slug, e.g. "attendance-session". */
  resource: string
  objectId: number
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState(0)

  const trail = useGetAuditTrailQuery(
    { resource, object: objectId, limit: 10, offset },
    { skip: !open }
  )

  return (
    <section className="rounded-md border">
      <Button
        variant="ghost"
        className="w-full justify-start rounded-md px-3 py-2 text-sm font-medium"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <History className="size-4" aria-hidden />
        {label}
        {trail.data && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {trail.data.count}
          </span>
        )}
      </Button>

      {open && (
        <div className="border-t p-3">
          <AuditTrail
            entries={trail.data?.results}
            isLoading={trail.isLoading}
            isFetching={trail.isFetching}
            error={trail.error}
            refetch={trail.refetch}
            count={trail.data?.count}
            offset={offset}
            onOffsetChange={setOffset}
            showRecord={false}
            emptyMessage="This record has not been changed since it was created."
          />
        </div>
      )}
    </section>
  )
}
