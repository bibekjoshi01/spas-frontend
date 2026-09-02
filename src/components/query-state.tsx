import type { ReactElement, ReactNode } from "react"
import { AlertCircle, Inbox, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/skeletons"
import { apiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

interface QueryStateProps {
  isLoading: boolean
  /**
   * A refetch running over data that is already on screen.
   *
   * Left undefined the screen renders exactly as before; passed, the stale
   * content stays put behind a busy veil instead of sitting there looking
   * settled while a slow report is still on its way.
   */
  isFetching?: boolean
  error?: unknown
  isEmpty?: boolean
  onRetry?: () => void
  /**
   * What to draw while loading: one of the stock shapes, or a skeleton built
   * for this screen in particular. A report whose layout nothing stock
   * resembles should pass its own — see `@/components/skeletons`.
   */
  skeleton?: SkeletonVariant | ReactElement
  emptyTitle?: string
  emptyMessage?: string
  emptyAction?: ReactNode
  children: ReactNode
}

/**
 * One place that decides what a screen shows before its data arrives.
 *
 * Every list screen routes through this so loading, failure and emptiness look
 * the same everywhere and no screen forgets one of the three.
 */
export function QueryState({
  isLoading,
  isFetching,
  error,
  isEmpty,
  onRetry,
  skeleton = "cards",
  emptyTitle = "Nothing here yet",
  emptyMessage = "Once there is something to show, it will appear here.",
  emptyAction,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return typeof skeleton === "string" ? (
      <LoadingSkeleton variant={skeleton} />
    ) : (
      skeleton
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card px-4 py-12 text-center">
        <AlertCircle className="size-8 text-destructive" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">That didn’t load</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {apiErrorMessage(error)}
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card px-4 py-12 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">{emptyTitle}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        </div>
        {emptyAction}
      </div>
    )
  }

  if (isFetching === undefined) return <>{children}</>

  return (
    <div className="relative" aria-busy={isFetching || undefined}>
      {children}
      {isFetching && <BusyOverlay />}
    </div>
  )
}

/**
 * The veil laid over content that is being refreshed.
 *
 * It keeps the old figures readable underneath — a report reads better dimmed
 * than blanked — while making it unmistakable that they are on their way out.
 */
export function BusyOverlay({ label = "Loading" }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center rounded-lg bg-background/60 pt-10 backdrop-blur-[1px]">
      <span className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
        <InlineSpinner />
        {label}
      </span>
    </div>
  )
}

type SkeletonVariant = "cards" | "table" | "stats"

function LoadingSkeleton({ variant }: { variant: SkeletonVariant }) {
  if (variant === "stats") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  if (variant === "table") return <TableSkeleton />

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-40 rounded-lg" />
      ))}
    </div>
  )
}

/** A dense inline spinner for buttons and toolbars. */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <RefreshCw className={cn("size-4 animate-spin", className)} aria-hidden />
  )
}
