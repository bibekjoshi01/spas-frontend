export type StudentNameSortDirection = "default" | "asc" | "desc"

export function nextStudentNameSort(
  current: StudentNameSortDirection
): StudentNameSortDirection {
  if (current === "default") return "desc"
  if (current === "desc") return "asc"
  return "default"
}

export function studentNameOrdering(
  direction: StudentNameSortDirection,
  field = "full_name"
) {
  if (direction === "desc") return `-${field}`
  if (direction === "asc") return field
  return ""
}

export function sortStudentsByName<T extends { fullName: string }>(
  rows: readonly T[],
  direction: StudentNameSortDirection
) {
  const factor = direction === "desc" ? -1 : 1
  return [...rows].sort(
    (left, right) =>
      factor *
      left.fullName.localeCompare(right.fullName, undefined, {
        sensitivity: "base",
        numeric: true,
      })
  )
}
