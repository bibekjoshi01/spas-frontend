import { Fragment, type ReactNode } from "react"
import { EllipsisVertical, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFilterVisibility } from "@/hooks/use-filter-visibility"

/** At or below this many filters a toolbar is short enough to show whole. */
const MENU_THRESHOLD = 3

export interface FilterSpec {
  /** Stable key for the saved layout. Renaming one forgets its saved choice. */
  id: string
  /** What the menu calls this filter. */
  label: string
  /** The select, date picker or button group itself. */
  control: ReactNode
  /**
   * Always on the toolbar, with no checkbox. For a filter the screen cannot
   * answer without — the semester a performance report is *of*, not a way of
   * narrowing it.
   */
  pinned?: boolean
  /** Whether it starts on the toolbar. Secondary filters should pass false. */
  defaultVisible?: boolean
  /** True while this filter is narrowing the list. */
  isActive?: boolean
  /**
   * Puts the filter back to its default. Called when the reader hides it, so a
   * filter can never narrow the list from off-screen where nothing explains it.
   */
  onReset?: () => void
}

interface FilterBarProps {
  /** Identifies this toolbar's saved layout. Unique across screens. */
  pageKey: string
  filters: FilterSpec[]
}

/**
 * A toolbar's filters, with the long tail folded into a menu.
 *
 * Screens like allocations and the attendance report grew past the point where
 * every filter fits on one line, and most readers use two or three of them.
 * So a screen declares all of its filters, says which ones matter on arrival,
 * and each reader keeps the set they actually work with.
 *
 * Renders a fragment, so it drops straight into `ResourceList`'s `filters`.
 */
export function FilterBar({ pageKey, filters }: FilterBarProps) {
  const { preference, setPreference, clearPreferences, hasPreferences } =
    useFilterVisibility(pageKey)

  const hideable = filters.filter((filter) => !filter.pinned)
  // Short toolbars keep every filter and skip the menu entirely.
  const hasMenu = filters.length > MENU_THRESHOLD && hideable.length > 0

  const isShown = (filter: FilterSpec) =>
    filter.pinned ||
    !hasMenu ||
    (preference(filter.id) ?? filter.defaultVisible ?? true)

  const shown = filters.filter(isShown)
  const hiddenCount = hideable.length - shown.filter((f) => !f.pinned).length

  const toggle = (filter: FilterSpec, visible: boolean) => {
    setPreference(filter.id, visible)
    // Hiding a filter drops its effect too, so what the toolbar shows is always
    // the whole of what the list is filtered by.
    if (!visible) filter.onReset?.()
  }

  const resetLayout = () => {
    for (const filter of hideable) {
      if (!(filter.defaultVisible ?? true) && isShown(filter))
        filter.onReset?.()
    }
    clearPreferences()
  }

  return (
    <>
      {shown.map((filter) => (
        <Fragment key={filter.id}>{filter.control}</Fragment>
      ))}

      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              title="Choose filters"
              aria-label={
                hiddenCount > 0
                  ? `Choose filters, ${hiddenCount} hidden`
                  : "Choose filters"
              }
            >
              <EllipsisVertical className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {filters.map((filter) => (
              <DropdownMenuCheckboxItem
                key={filter.id}
                checked={isShown(filter)}
                disabled={filter.pinned}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => toggle(filter, checked)}
              >
                <span className="flex-1">{filter.label}</span>
                {filter.isActive && (
                  <>
                    <span className="sr-only">in use</span>
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  </>
                )}
              </DropdownMenuCheckboxItem>
            ))}
            {hasPreferences && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={resetLayout}>
                  <RotateCcw className="size-4" aria-hidden />
                  Reset to default
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}
