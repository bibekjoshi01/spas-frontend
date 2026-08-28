import { useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  Star,
  GraduationCap,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppSelector } from "@/lib/redux/hooks"
import { useHasRole } from "@/hooks/use-has-permissions"
import {
  type DashboardOverview,
  semesterLabel,
  useGetDashboardOverviewQuery,
} from "@/lib/api"
import { localDateKey } from "@/lib/utils/date"

export default function OverviewPage() {
  const { data, isLoading, error, refetch } = useGetDashboardOverviewQuery()
  const profile = useAppSelector((state) => state.auth.profile)
  const hasTeacherRole = useHasRole("TEACHER")
  const isTeacher = data ? data.experience === "TEACHER" : hasTeacherRole

  const today = useMemo(() => localDateKey(), [])
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    []
  )

  const firstName =
    profile?.firstName || profile?.fullName?.split(" ")[0] || "there"

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description={dateLabel}
        meta={
          data && (
            <span>
              {data.stats.totalClasses}{" "}
              {data.stats.totalClasses === 1
                ? "active class"
                : "active classes"}
            </span>
          )
        }
      />

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeleton="stats"
      >
        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                icon={<GraduationCap className="size-4" aria-hidden />}
                label="Classes"
                value={data.stats.totalClasses}
                hint={isTeacher ? "allocated to you" : "in your academic scope"}
                accent="blue"
              />
              <StatTile
                icon={<Users className="size-4" aria-hidden />}
                label="Students"
                value={data.stats.totalStudents}
                hint={isTeacher ? "across your classes" : "within your scope"}
                accent="violet"
              />
              <StatTile
                icon={<TrendingUp className="size-4" aria-hidden />}
                label="Average attendance"
                value={`${data.stats.avgAttendancePercentage}%`}
                hint={isTeacher ? "your classes held" : "scoped classes held"}
                accent="emerald"
              />
              <StatTile
                icon={<AlertTriangle className="size-4" aria-hidden />}
                label="Below 75%"
                value={data.stats.studentsBelowEligibility}
                hint="need attention"
                accent="amber"
                tone={
                  data.stats.studentsBelowEligibility > 0
                    ? "warning"
                    : "default"
                }
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                {isTeacher ? (
                  <Card className="border-blue-200 dark:border-blue-900">
                    <CardHeader className="grid-cols-[minmax(0,1fr)_auto] !grid-rows-1 items-center">
                      <CardTitle className="text-base">
                        {isTeacher
                          ? "Active teaching schedule"
                          : "Active classes in your scope"}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="shrink-0 justify-self-end tabular-nums"
                      >
                        {data.stats.classesRecordedToday} recorded today
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {data.todaysClasses.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          {isTeacher
                            ? "No running classes are allocated to you."
                            : "No running classes are available in your academic scope."}
                        </p>
                      )}

                      {data.todaysClasses.map((item) => (
                        <div
                          key={item.allocation}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.code} · {semesterLabel(item.semester)} ·{" "}
                              {item.studentCount} students
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.recorded ? (
                              <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                                <CheckCircle2 className="size-3" aria-hidden />
                                Recorded
                              </Badge>
                            ) : isTeacher ? (
                              <Button asChild size="sm">
                                <Link
                                  to={`/attendance/${item.allocation}/${today}`}
                                >
                                  <CalendarCheck
                                    className="size-4"
                                    aria-hidden
                                  />
                                  Open attendance
                                </Link>
                              </Button>
                            ) : (
                              <Badge variant="outline">
                                Not recorded today
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <ManagementTodayPanel
                    data={data.todayAttendance}
                    level={data.managementLevel}
                  />
                )}

                {isTeacher && <TeacherWorkQueue items={data.workQueue} />}
              </div>

              <div className="space-y-6">
                <Card
                  className={
                    isTeacher
                      ? "border-blue-200 dark:border-blue-900"
                      : "border-violet-200 dark:border-violet-900"
                  }
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        Needs attention
                      </CardTitle>
                      <Badge variant="outline" className="tabular-nums">
                        {data.stats.studentsBelowEligibility}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {data.studentsNeedingAttention.length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Everyone is above the attendance requirement.
                      </p>
                    )}

                    <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-2">
                      {data.studentsNeedingAttention.map((student) => (
                        <div
                          key={`${student.enrollment}`}
                          className="space-y-1.5 border-b pb-3 last:border-0 last:pb-0"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {student.fullName}
                            </p>
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                              {student.rollNumber}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {student.subjectCode} ·{" "}
                            {semesterLabel(student.semester)}
                          </p>
                          <AttendanceMeter
                            percentage={student.attendancePercentage}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {data.recentActivity.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Recent activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {data.recentActivity.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle2
                              className="mt-0.5 size-4 shrink-0 text-emerald-600"
                              aria-hidden
                            />
                            <span>{item.message}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  )
}

type WorkItem = DashboardOverview["workQueue"][number]
type TodayAttendance = DashboardOverview["todayAttendance"]

function ManagementTodayPanel({
  data,
  level,
}: {
  data: TodayAttendance
  level: DashboardOverview["managementLevel"]
}) {
  const levelLabel =
    level === "CAMPUS"
      ? "Campus"
      : level === "DEPARTMENT"
        ? "Department"
        : "Program"

  return (
    <section className="border bg-background">
      <div className="flex items-center justify-between gap-3 border-b bg-violet-50 px-3 py-2.5 dark:bg-violet-950/40">
        <div>
          <h2 className="font-semibold">Today’s attendance</h2>
          <p className="text-xs text-muted-foreground">
            {levelLabel}-scoped records entered today.
          </p>
        </div>
        <Badge variant="outline">{data.sessionsRecorded} sessions</Badge>
      </div>

      <div className="grid grid-cols-2 border-b bg-white sm:grid-cols-3 dark:bg-slate-950">
        <DailyMetric
          icon={Activity}
          label="Attendance rate"
          value={`${data.attendancePercentage}%`}
        />
        <DailyMetric icon={Users} label="Students marked" value={data.marked} />
        <DailyMetric
          icon={CalendarCheck}
          label="Classes recorded"
          value={`${data.classesRecorded}/${data.activeClasses}`}
        />
        <DailyMetric icon={UserCheck} label="Present" value={data.present} />
        <DailyMetric
          icon={UserX}
          label="Absent"
          value={data.absent}
          tone="risk"
        />
        <DailyMetric
          icon={Clock3}
          label="Late / excused"
          value={`${data.late} / ${data.excused}`}
        />
      </div>

      <div className="mt-3 border-t">
        <div className="flex items-center justify-between gap-3 border-b bg-amber-50 px-3 py-2.5 dark:bg-amber-950/30">
          <div>
            <h3 className="text-sm font-semibold">Classes to review</h3>
            <p className="text-xs text-muted-foreground">
              Active classes without a record today; this does not necessarily
              mean a class was scheduled.
            </p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 bg-background tabular-nums"
          >
            {data.classesToReview.length}
          </Badge>
        </div>
        <div className="bg-white p-3 dark:bg-slate-950">
          {data.classesToReview.length ? (
            <div className="max-h-52 divide-y overflow-y-auto border">
              {data.classesToReview.map((item) => (
                <div
                  key={item.allocation}
                  className="flex items-center justify-between gap-3 px-2.5 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.code} · {item.programCode} {item.batchYear} ·
                      Semester {item.semester}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.teacher.fullName}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
              Every active class has at least one attendance record today.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function DailyMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: string | number
  tone?: "risk"
}) {
  return (
    <div className="border-r border-b p-2.5 last:border-r-0 sm:[&:nth-child(n+4)]:border-b-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p
        className={
          tone === "risk"
            ? "mt-1 text-xl font-bold text-red-600 tabular-nums"
            : "mt-1 text-xl font-bold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  )
}

function TeacherWorkQueue({ items }: { items: WorkItem[] }) {
  const visible = items.slice(0, 8)

  return (
    <section className="border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-primary px-3 py-2.5 text-primary-foreground">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ListChecks className="size-4" aria-hidden />
            Work to complete
          </h2>
          <p className="text-xs text-primary-foreground/75">
            Open records across your active classes that still need attention.
          </p>
        </div>
        <Badge variant={items.length ? "secondary" : "outline"}>
          {items.length} open
        </Badge>
      </div>

      {visible.length ? (
        <div className="divide-y">
          {visible.map((item) => {
            const Icon = workIcon(item.kind)
            return (
              <Link
                key={item.key}
                to={workHref(item)}
                className="grid gap-2 px-3 py-2.5 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="hidden size-6 items-center justify-center bg-muted text-muted-foreground sm:flex">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {item.subjectCode}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.classLabel} · {item.detail}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs font-medium text-primary">
                  Open
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-5 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
          Your active class records are complete.
        </div>
      )}

      {items.length > visible.length && (
        <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Showing the first {visible.length} of {items.length} tasks. Open a
          class workspace for its full completion checklist.
        </div>
      )}
    </section>
  )
}

function workHref(item: WorkItem) {
  switch (item.kind) {
    case "ATTENDANCE":
      return `/attendance?class=${item.allocation}`
    case "ASSESSMENT":
      return `/assessments?class=${item.allocation}`
    case "ASSIGNMENT":
      return `/assignments?class=${item.allocation}`
    case "PERFORMANCE":
      return `/class-performance?class=${item.allocation}`
  }
}

function workIcon(kind: WorkItem["kind"]) {
  switch (kind) {
    case "ATTENDANCE":
      return CalendarCheck
    case "ASSESSMENT":
      return ClipboardList
    case "ASSIGNMENT":
      return ClipboardCheck
    case "PERFORMANCE":
      return Star
  }
}

function StatTile({
  icon,
  label,
  value,
  hint,
  tone = "default",
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  hint?: string
  tone?: "default" | "warning"
  accent: "blue" | "violet" | "emerald" | "amber"
}) {
  const accents = {
    blue: {
      card: "border-l-blue-600",
      icon: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      value: "text-blue-700 dark:text-blue-300",
    },
    violet: {
      card: "border-l-violet-600",
      icon: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
      value: "text-violet-700 dark:text-violet-300",
    },
    emerald: {
      card: "border-l-emerald-600",
      icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    amber: {
      card: "border-l-amber-500",
      icon: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      value: "text-amber-700 dark:text-amber-300",
    },
  }[accent]

  return (
    // Card already brings py-6; a stat tile is a label and a number, so it does
    // not need a second helping of vertical padding stacked on top of that.
    <Card className={`gap-0 border-l-4 py-4 ${accents.card}`}>
      <CardContent className="space-y-0.5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span
            className={`flex size-7 items-center justify-center ${accents.icon}`}
          >
            {icon}
          </span>
          <span className="text-xs font-bold tracking-wide uppercase">
            {label}
          </span>
        </div>
        <p
          className={
            tone === "warning"
              ? "text-2xl font-semibold text-amber-700 tabular-nums dark:text-amber-300"
              : `text-2xl font-semibold tabular-nums ${accents.value}`
          }
        >
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
