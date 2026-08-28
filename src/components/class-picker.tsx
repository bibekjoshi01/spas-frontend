import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ClassSummary, semesterLabel } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ClassPickerProps {
  classes: ClassSummary[]
  value: number | null
  onChange: (allocation: number) => void
  label?: string
  className?: string
  showBatchFilter?: boolean
}

/**
 * The class selector every teaching screen opens with.
 *
 * Marks, assignments and rosters all belong to one class, so choosing it is
 * the first thing each of those screens asks.
 */
export function ClassPicker({
  classes,
  value,
  onChange,
  label = "Class",
  className,
  showBatchFilter = true,
}: ClassPickerProps) {
  const [batch, setBatch] = useState("all")
  const batches = useMemo(() => {
    const unique = new Map<string, string>()
    for (const item of classes) {
      const key = `${item.programCode}:${item.batchYear}`
      unique.set(key, `${item.programCode} — ${item.batchYear}`)
    }
    return [...unique.entries()].sort((left, right) =>
      left[1].localeCompare(right[1])
    )
  }, [classes])
  const visibleClasses =
    batch === "all"
      ? classes
      : classes.filter(
          (item) => `${item.programCode}:${item.batchYear}` === batch
        )

  const chooseBatch = (next: string) => {
    setBatch(next)
    if (next === "all") return
    const currentMatches = classes.some(
      (item) =>
        item.allocation === value &&
        `${item.programCode}:${item.batchYear}` === next
    )
    if (!currentMatches) {
      const first = classes.find(
        (item) => `${item.programCode}:${item.batchYear}` === next
      )
      if (first) onChange(first.allocation)
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      {showBatchFilter && (
        <Select value={batch} onValueChange={chooseBatch}>
          <SelectTrigger
            className="w-full sm:w-52"
            aria-label="Filter classes by batch"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value="all">All batches</SelectItem>
            {batches.map(([key, text]) => (
              <SelectItem key={key} value={key}>
                {text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={value ? String(value) : undefined}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger
          className={cn("w-full sm:w-[32rem]", className)}
          aria-label={label}
        >
          <SelectValue placeholder="Choose a class" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          className="max-h-[min(28rem,var(--radix-select-content-available-height))] w-[min(36rem,calc(100vw-2rem))]"
        >
          {visibleClasses.map((item) => (
            <SelectItem key={item.allocation} value={String(item.allocation)}>
              {item.code} — {item.name} · {item.programCode} {item.batchYear} ·{" "}
              {semesterLabel(item.semester)} ·{" "}
              {item.semesterStatus === "RUNNING"
                ? "Running"
                : item.semesterStatus === "COMPLETED"
                  ? "Previous"
                  : "Upcoming"}
              {item.startTime && item.endTime
                ? ` · ${formatTime(item.startTime)}–${formatTime(item.endTime)}`
                : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function formatTime(value: string) {
  return new Date(`2000-01-01T${value}`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
import { useMemo, useState } from "react"
