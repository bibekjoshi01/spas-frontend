/**
 * Maps a 400 response onto the form that caused it.
 *
 * The backend answers validation failures with a field-keyed body, so binding
 * those keys to inputs puts each message beside the control the user has to
 * fix rather than in a toast they have to remember.
 */
export type FieldErrors = Record<string, string>

const NON_FIELD_KEYS = new Set([
  "detail",
  "error",
  "non_field_errors",
  "success",
])

export function fieldErrorsFrom(error: unknown): FieldErrors {
  if (!error || typeof error !== "object") return {}

  const data = (error as { data?: unknown }).data
  if (!data || typeof data !== "object") return {}

  const errors: FieldErrors = {}

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (NON_FIELD_KEYS.has(key)) continue

    if (typeof value === "string") errors[key] = value
    else if (Array.isArray(value) && typeof value[0] === "string") {
      errors[key] = value[0]
    }
  }

  return errors
}

/** The message for anything the form has no field to attach it to. */
export function formErrorFrom(error: unknown): string | null {
  if (!error || typeof error !== "object") return null

  const data = (error as { data?: unknown }).data
  if (!data || typeof data !== "object") return null

  const record = data as Record<string, unknown>

  for (const key of [
    "detail",
    "error",
    "non_field_errors",
    "nonFieldErrors",
    "__all__",
    "_All__",
  ]) {
    const value = record[key]
    if (typeof value === "string") return value
    if (Array.isArray(value) && typeof value[0] === "string") return value[0]
  }

  return null
}
