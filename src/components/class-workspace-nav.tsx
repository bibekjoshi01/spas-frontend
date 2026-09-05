import { NavLink } from "react-router-dom"
import {
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useIsSuperUser, usePermissions } from "@/hooks/use-has-permissions"
import type { ClassSummary } from "@/lib/api"
import { cn } from "@/lib/utils"

const ITEMS = [
  [
    "Overview",
    LayoutDashboard,
    (id: number) => `/classes/${id}`,
    "view_attendance",
  ],
  ["Roster", Users, (id: number) => `/roster?class=${id}`, "view_attendance"],
  [
    "Attendance",
    CalendarCheck,
    (id: number) => `/attendance?class=${id}`,
    "view_attendance",
  ],
  [
    "Assessments",
    ClipboardList,
    (id: number) => `/assessments?class=${id}`,
    "view_internal_exam",
  ],
  [
    "Assignments",
    ClipboardCheck,
    (id: number) => `/assignments?class=${id}`,
    "view_assignment",
  ],
  [
    "Performance",
    BarChart3,
    (id: number) => `/class-performance?class=${id}`,
    "view_class_performance",
  ],
] as const

export function ClassWorkspaceNav({
  value,
  active,
  compact = false,
}: {
  value: ClassSummary
  active: (typeof ITEMS)[number][0]
  compact?: boolean
}) {
  const permissions = usePermissions()
  const isSuperUser = useIsSuperUser()
  const visibleItems = ITEMS.filter(
    ([, , , permission]) => isSuperUser || permissions.includes(permission)
  )

  return (
    <section className="border bg-card" aria-label="Class workspace">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between border-l-sky-500 bg-banner text-banner-foreground",
          compact
            ? "gap-3 border-l-[3px] px-4 py-2.5"
            : "gap-3 border-l-4 px-4 py-3"
        )}
      >
        <div className="min-w-0">
          {!compact && (
            <p className="mb-0.5 text-[10px] font-bold tracking-[0.14em] text-sky-300 uppercase">
              Class workspace
            </p>
          )}
          <p className="truncate text-base font-bold tracking-tight">
            {value.code} — {value.name}
          </p>
          <p className="mt-0.5 text-xs text-banner-muted-foreground">
            {value.programCode} · Batch {value.batchYear} · Semester{" "}
            {value.semester}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border-white/25 bg-white/10 text-banner-foreground",
            compact && "px-2 py-0.5 text-xs",
            value.semesterStatus === "RUNNING" &&
              "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
          )}
        >
          {value.semesterStatus === "RUNNING"
            ? "Running"
            : value.semesterStatus === "COMPLETED"
              ? "Read only"
              : "Upcoming"}
        </Badge>
      </div>
      <nav
        className="flex overflow-x-auto border-t border-border bg-band"
        aria-label="Class sections"
      >
        {visibleItems.map(([label, Icon, href]) => (
          <NavLink
            key={label}
            to={href(value.allocation)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-r font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
              compact ? "h-10 px-3.5 text-sm" : "h-10 px-3 text-sm",
              active === label &&
                "border-b-2 border-b-sky-500 bg-card text-foreground"
            )}
          >
            <Icon className={cn(compact ? "size-4" : "size-3.5")} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </section>
  )
}
