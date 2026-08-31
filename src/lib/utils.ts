import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const percentageFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a percentage consistently without exposing backend decimal noise. */
export function formatPercentage(
  value: number | null | undefined,
  fallback = "—"
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback
  }

  return `${percentageFormatter.format(value)}%`
}

/**
 * The options a picker offers: everything still active, plus whatever the
 * record being edited already points at.
 *
 * A retired parent has to stay visible on the record that already uses it, or
 * the edit form would show a blank select and quietly swap the parent on the
 * next save. New records never hit this branch, so they only ever see active
 * options.
 */
export function withCurrentOption<
  T extends { id: number },
  C extends { id: number },
>(options: T[] | undefined, current: C | null | undefined): (T | C)[] {
  const rows: (T | C)[] = options ?? []
  if (!current || rows.some((row) => row.id === current.id)) return rows
  return [...rows, current]
}
