import { rootAPI } from "@/lib/redux/api-slice"

import type { ListParams, Paginated } from "./types"

const AUDIT = "audit-mod"

export type AuditAction = "CREATED" | "UPDATED" | "DELETED"

/** One trail the signed-in user may open. */
export interface AuditResource {
  slug: string
  label: string
}

/** One field that moved, already rendered as words by the API. */
export interface AuditChange {
  field: string
  label: string
  /** Null where the field was empty on that side — not the same as "". */
  from: string | null
  to: string | null
}

/** One recorded change to one record. */
export interface AuditEntry {
  id: string
  resource: string
  resourceLabel: string
  objectId: number
  objectLabel: string
  action: AuditAction
  at: string
  /** Null for a change made outside a request — a migration or a shell. */
  actor: { id: number; fullName: string } | null
  changes: AuditChange[]
}

export interface AuditTrailParams extends ListParams {
  resource: string
  /** Narrow to one record's trail. */
  object?: number
  actor?: number
  action?: AuditAction
  from?: string
  to?: string
}

/**
 * The audit trail: read-only by construction.
 *
 * There is no mutation here and no cache tag to invalidate, because nothing in
 * the app writes to a trail. Entries appear as a side effect of ordinary work,
 * so the list is refetched on mount rather than on any write.
 */
export const auditApi = rootAPI.injectEndpoints({
  endpoints: (build) => ({
    getAuditResources: build.query<AuditResource[], void>({
      query: () => ({ url: `${AUDIT}/resources` }),
    }),
    getAuditTrail: build.query<Paginated<AuditEntry>, AuditTrailParams>({
      query: (params) => ({ url: `${AUDIT}/trail`, params }),
    }),
  }),
})

export const { useGetAuditResourcesQuery, useGetAuditTrailQuery } = auditApi
