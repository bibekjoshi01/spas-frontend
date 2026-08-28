import type { ReactNode } from "react"
import { AlertCircle, Inbox, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

interface QueryStateProps {
  isLoading: boolean
  error?: unknown
  isEmpty?: boolean
  onRetry?: () => void
  /** What the skeleton should imitate while loading. */
  skeleton?: "cards" | "table" | "stats"
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
  error,
  isEmpty,
  onRetry,
  skeleton = "cards",
  emptyTitle = "Nothing here yet",
  emptyMessage = "Once there is something to show, it will appear here.",
  emptyAction,
  children,
}: QueryStateProps) {
  if (isLoading) return <LoadingSkeleton variant={skeleton} />

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

  return <>{children}</>
}

function LoadingSkeleton({
  variant,
}: {
  variant: "cards" | "table" | "stats"
}) {
  if (variant === "stats") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  if (variant === "table") {
    return (
      <div className="space-y-2 rounded-lg border p-4">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    )
  }

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
