/** Shapes the Django backend returns on every module. */

/** Every list endpoint is limit/offset paginated. */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Every write endpoint answers with a message; creates and updates add an id. */
export interface MessageResponse {
  message: string
}

export interface MessageWithIdResponse extends MessageResponse {
  id: number
}

/** Bulk enrolment endpoints report what they did rather than failing on repeats. */
export interface BulkResponse extends MessageResponse {
  created: number
  skipped: number
}

/** Standard list query parameters accepted by every collection. */
export interface ListParams {
  limit?: number
  offset?: number
  search?: string
  ordering?: string
  [key: string]: string | number | boolean | undefined
}

/** Asking for everything: the backend treats limit=0 as "no page". */
export const ALL: ListParams = { limit: 0 }

/** Pulls a human-readable message out of an RTK Query error. */
export function apiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!error || typeof error !== "object") return fallback

  const candidate = error as {
    data?: unknown
    response?: { data?: unknown }
  }
  const data = candidate.data ?? candidate.response?.data

  if (typeof data === "string") return safeServerMessage(data, fallback)

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>

    for (const key of ["detail", "message", "error"]) {
      const value = record[key]
      if (typeof value === "string") return safeServerMessage(value, fallback)
      if (Array.isArray(value) && typeof value[0] === "string") {
        return safeServerMessage(value[0], fallback)
      }
    }

    // Field errors: surface the first one so the user sees something specific.
    for (const [field, value] of Object.entries(record)) {
      if (field === "success") continue
      if (Array.isArray(value) && typeof value[0] === "string") {
        return safeServerMessage(value[0], fallback)
      }
    }
  }

  return fallback
}

/** Never put an HTML error page, stack trace, or unbounded server output in UI. */
function safeServerMessage(value: string, fallback: string): string {
  const message = value.trim()
  if (!message) return fallback

  const looksLikeDocument =
    /<(?:!doctype|html|head|body|script|style|div|pre)\b/i.test(message)
  const looksLikeStack =
    /(?:\n|^)(?:Traceback|Error:|\s+at\s+|[A-Za-z]+Error\b)/.test(message)

  if (looksLikeDocument || looksLikeStack || message.length > 300) {
    return fallback
  }

  return message
}
