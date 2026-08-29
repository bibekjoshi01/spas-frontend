import { useRef, useState, type ComponentProps } from "react"
import { CalendarDays, Clock3 } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"

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
  const [open, setOpen] = useState(false)
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
      <PopoverPrimitive.Root open={open && !disabled} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex h-8 w-9 shrink-0 items-center justify-center rounded-r-sm border border-l-0 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label={`Open ${ariaLabel.toLowerCase()} calendar`}
          >
            <CalendarDays className="size-4" aria-hidden />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className="z-[120] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto border bg-white outline-none dark:bg-slate-950"
          >
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
                setOpen(false)
              }}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
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
        className="flex h-8 w-9 shrink-0 items-center justify-center rounded-r-sm border border-l-0 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
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
