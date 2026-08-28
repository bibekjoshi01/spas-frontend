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
}: {
  value: ClassSummary
  active: (typeof ITEMS)[number][0]
}) {
  const permissions = usePermissions()
  const isSuperUser = useIsSuperUser()
  const visibleItems = ITEMS.filter(
    ([, , , permission]) => isSuperUser || permissions.includes(permission)
  )

  return (
    <section
      className="border border-slate-300 bg-background dark:border-slate-700"
      aria-label="Class workspace"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-sky-500 bg-slate-900 px-4 py-3 text-white dark:bg-slate-950">
        <div className="min-w-0">
          <p className="mb-0.5 text-[10px] font-bold tracking-[0.14em] text-sky-300 uppercase">
            Class workspace
          </p>
          <p className="truncate text-base font-bold tracking-tight">
            {value.code} — {value.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-300">
            {value.programCode} · Batch {value.batchYear} · Semester{" "}
            {value.semester}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border-slate-500 bg-slate-800 text-slate-100",
            value.semesterStatus === "RUNNING" &&
              "border-emerald-400/60 bg-emerald-950 text-emerald-200"
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
        className="flex overflow-x-auto border-t border-slate-700 bg-slate-100 dark:bg-slate-900"
        aria-label="Class sections"
      >
        {visibleItems.map(([label, Icon, href]) => (
          <NavLink
            key={label}
            to={href(value.allocation)}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 border-r border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
              active === label &&
                "border-b-2 border-b-sky-600 bg-white text-slate-950 dark:bg-slate-800 dark:text-white"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </section>
  )
}
