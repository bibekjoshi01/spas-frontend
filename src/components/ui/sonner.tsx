import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Toasts drawn from the app's own tokens rather than Sonner's palette.
 *
 * A neutral popover surface with a coloured edge and icon reads as part of the
 * product in both themes; Sonner's rich colours flood the whole card in a green
 * or red that matches nothing else on screen.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      closeButton
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!items-start !gap-3 !rounded-[var(--radius)] !border !border-l-4 !border-border !border-l-[var(--toast-accent)] [&_[data-icon]]:!text-[var(--toast-accent)] !bg-popover !py-3 !pr-10 !pl-3.5 !font-sans !text-popover-foreground !shadow-lg",
          title: "!text-sm !leading-snug !font-medium",
          description: "!text-xs !leading-snug !text-muted-foreground",
          icon: "!mt-0.5",
          success: "[--toast-accent:var(--success)]",
          error: "[--toast-accent:var(--destructive)]",
          warning: "[--toast-accent:var(--warning)]",
          info: "[--toast-accent:var(--info)]",
          closeButton:
            "!top-3 !right-2 !left-auto !size-6 !translate-x-0 !translate-y-0 !rounded-[var(--radius)] !border-0 !bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground [&>svg]:!size-3.5",
          actionButton:
            "!rounded-[var(--radius)] !bg-primary !text-primary-foreground",
          cancelButton: "!rounded-[var(--radius)] !bg-muted !text-foreground",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--toast-accent": "var(--primary)",
          "--width": "min(380px, calc(100vw - 2rem))",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
