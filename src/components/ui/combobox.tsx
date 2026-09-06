import { useEffect, useMemo, useRef, useState } from "react"
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  /** A second line under the label — a code, a program, a count. */
  hint?: string
  /** Options sharing a group render under one sticky heading. */
  group?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  /** Shows a clear button once something is chosen. */
  clearable?: boolean
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

/**
 * A picker that stays usable as its list grows.
 *
 * A plain select is a scroll hunt past about a dozen options, and this system
 * accumulates them by design: a college running five programs holds twenty
 * batches at once and thousands of classes after a few years. Typing narrows
 * the list, and groups keep what survives in a readable order.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Choose one",
  searchPlaceholder = "Type to search",
  emptyMessage = "Nothing matches that.",
  clearable,
  disabled,
  className,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find((option) => option.value === value)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""} ${option.group ?? ""}`
        .toLowerCase()
        .includes(needle)
    )
  }, [options, query])

  // Groups render in the order the options arrive, so the caller controls it.
  const groups = useMemo(() => {
    const order: string[] = []
    const byGroup = new Map<string, ComboboxOption[]>()
    for (const option of matches) {
      const key = option.group ?? ""
      if (!byGroup.has(key)) {
        byGroup.set(key, [])
        order.push(key)
      }
      byGroup.get(key)!.push(option)
    }
    return order.map((key) => ({ key, options: byGroup.get(key)! }))
  }, [matches])

  // Reopening should not resume someone else's half-typed search.
  useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }
    const index = matches.findIndex((option) => option.value === value)
    setActive(index === -1 ? 0 : index)
    // Only on open: the highlight follows the keyboard once the list is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [active])

  const choose = (option: ComboboxOption) => {
    onValueChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!matches.length) return
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive((current) => (current + step + matches.length) % matches.length)
      return
    }
    if (event.key === "Enter" && matches[active]) {
      event.preventDefault()
      choose(matches[active])
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <PopoverPrimitive.Trigger
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          data-slot="select-trigger"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            clearable && selected && "pr-8"
          )}
        >
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </PopoverPrimitive.Trigger>

        {clearable && selected && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => onValueChange("")}
            className="absolute top-1/2 right-7 -translate-y-1/2 rounded-xs opacity-60 hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-[120] max-h-72 w-[var(--radix-popover-trigger-width)] min-w-56 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
          // Typing belongs in the search box, so focus goes there on open.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            ;(event.currentTarget as HTMLElement)
              .querySelector<HTMLInputElement>("input")
              ?.focus()
          }}
        >
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto p-1"
          >
            {matches.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            )}

            {groups.map(({ key, options: rows }) => (
              <div key={key || "ungrouped"}>
                {key && (
                  <p className="sticky top-0 bg-popover px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {key}
                  </p>
                )}
                {rows.map((option) => {
                  const index = matches.indexOf(option)
                  const isActive = index === active
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      data-active={isActive}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(option)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4 shrink-0",
                          option.value === value ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.hint && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {option.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
