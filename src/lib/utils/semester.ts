/**
 * The backend stores `semester` as a plain integer (1-8). The UI works
 * with human labels like "2nd Semester". These helpers convert between
 * the two so the rest of the app can keep using the label everywhere.
 */

const ORDINAL_SUFFIXES = ["th", "st", "nd", "rd"]

function ordinalSuffix(n: number): string {
  const remainder = n % 100
  return (
    ORDINAL_SUFFIXES[(remainder - 20) % 10] ??
    ORDINAL_SUFFIXES[remainder] ??
    ORDINAL_SUFFIXES[0]
  )
}

export function formatSemesterLabel(semester: number): string {
  return `${semester}${ordinalSuffix(semester)} Semester`
}

export function parseSemesterNumber(label: string): number {
  const match = label.match(/\d+/)
  const parsed = match ? Number(match[0]) : NaN

  if (Number.isNaN(parsed) || parsed < 1) return 1
  if (parsed > 8) return 8

  return parsed
}
