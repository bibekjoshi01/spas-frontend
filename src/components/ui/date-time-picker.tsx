import { useRef, type ComponentProps } from "react"
import { CalendarDays, Clock3 } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { localDateKey } from "@/lib/utils/date"

type PickerInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: string
  onValueChange: (value: string) => void
}

export function DatePickerInput({
  value,
  min,
  max,
  className,
  disabled,
  "aria-label": ariaLabel = "Date",
  onValueChange,
  ...props
}: PickerInputProps) {
  const picker = useRef<HTMLDetailsElement>(null)
  const selected = parseLocalDate(value)
  const minimumDate = typeof min === "string" ? parseLocalDate(min) : null
  const maximumDate = typeof max === "string" ? parseLocalDate(max) : null

  return (
    <div className={cn("flex w-full items-center", className)}>
      <Input
        {...props}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-w-0 flex-1 rounded-r-none [&::-webkit-calendar-picker-indicator]:hidden"
        aria-label={ariaLabel}
      />
      <details
        ref={picker}
        className="group relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            event.currentTarget.open = false
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.open = false
        }}
      >
        <summary
          className={cn(
            "flex h-8 w-9 list-none items-center justify-center rounded-r-sm border border-l-0 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden",
            disabled && "pointer-events-none opacity-50"
          )}
          aria-label={`Open ${ariaLabel.toLowerCase()} calendar`}
          aria-disabled={disabled || undefined}
        >
          <CalendarDays className="size-4" aria-hidden />
        </summary>
        <div className="absolute top-10 right-0 z-[80] border bg-popover">
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            defaultMonth={clampDate(
              selected ?? new Date(),
              minimumDate,
              maximumDate
            )}
            disabled={[
              ...(minimumDate ? [{ before: minimumDate }] : []),
              ...(maximumDate ? [{ after: maximumDate }] : []),
            ]}
            onSelect={(date) => {
              if (!date) return
              onValueChange(localDateKey(date))
              if (picker.current) picker.current.open = false
            }}
          />
        </div>
      </details>
    </div>
  )
}

export function TimePickerInput({
  value,
  className,
  disabled,
  "aria-label": ariaLabel = "Time",
  onValueChange,
  ...props
}: PickerInputProps) {
  const input = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    if (!input.current || disabled) return
    try {
      input.current.showPicker()
    } catch {
      input.current.focus()
    }
  }

  return (
    <div className={cn("flex w-full items-center", className)}>
      <Input
        {...props}
        ref={input}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-w-0 flex-1 rounded-r-none [&::-webkit-calendar-picker-indicator]:hidden"
        aria-label={ariaLabel}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="flex h-8 w-9 items-center justify-center rounded-r-sm border border-l-0 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        aria-label={`Open ${ariaLabel.toLowerCase()} picker`}
      >
        <Clock3 className="size-4" aria-hidden />
      </button>
    </div>
  )
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null
}

function clampDate(date: Date, minimum: Date | null, maximum: Date | null) {
  if (minimum && date < minimum) return minimum
  if (maximum && date > maximum) return maximum
  return date
}
