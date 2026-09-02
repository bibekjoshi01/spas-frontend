import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  nextStudentNameSort,
  type StudentNameSortDirection,
} from "@/lib/utils/student-sort"

export function StudentNameSortButton({
  direction,
  onChange,
  label = "Full name",
  className,
}: {
  direction: StudentNameSortDirection
  onChange: (direction: StudentNameSortDirection) => void
  label?: string
  className?: string
}) {
  const Icon =
    direction === "asc"
      ? ArrowUp
      : direction === "desc"
        ? ArrowDown
        : ArrowUpDown
  const next = nextStudentNameSort(direction)
  const currentLabel =
    direction === "default"
      ? "default ascending"
      : direction === "asc"
        ? "ascending"
        : "descending"
  const nextLabel =
    next === "default"
      ? "default ascending"
      : next === "asc"
        ? "ascending"
        : "descending"

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-sm text-left hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
      onClick={() => onChange(next)}
      aria-label={`${label}: ${currentLabel} order. Activate for ${nextLabel} order.`}
    >
      {label}
      <Icon className="size-3.5" aria-hidden />
    </button>
  )
}
