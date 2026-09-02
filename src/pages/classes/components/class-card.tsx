import { Link } from "react-router-dom"
import {
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Clock3,
  Users,
} from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { type ClassSummary, semesterLabel } from "@/lib/api"

interface ClassCardProps {
  item: ClassSummary
  today: string
}

/**
 * One class, with the two things a teacher decides from: how many students
 * are on it and whether attendance is holding up.
 */
export function ClassCard({ item, today }: ClassCardProps) {
  const isRunning = item.semesterStatus === "RUNNING"
  const isCompleted = item.semesterStatus === "COMPLETED"

  return (
    <Card>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1 basis-40 space-y-1">
            <p className="font-mono text-xs text-muted-foreground">
              {item.code}
            </p>
            <h3
              className="truncate text-lg leading-tight font-semibold"
              title={item.name}
            >
              {item.name}
            </h3>
          </div>
          <Badge variant="secondary" className="ml-auto max-w-full shrink-0">
            {semesterLabel(item.semester)} ·{" "}
            {isRunning ? "Running" : isCompleted ? "Completed" : "Upcoming"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <p className="flex min-w-0 items-center gap-1.5">
            <GraduationCap className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {item.programCode} · Batch {item.batchYear}
            </span>
          </p>
          <p className="flex min-w-0 items-center justify-end gap-1.5 text-right">
            <Clock3 className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {item.startTime && item.endTime
                ? `${formatTime(item.startTime)}–${formatTime(item.endTime)}`
                : "Class time not set"}
            </span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-4" aria-hidden />
            {item.studentCount}{" "}
            {item.studentCount === 1 ? "student" : "students"}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {item.classesHeld} {item.classesHeld === 1 ? "class" : "classes"}{" "}
            held
          </span>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Attendance</p>
          <AttendanceMeter percentage={item.attendancePercentage} />
        </div>

        <div className="flex gap-2 pt-1">
          {isRunning ? (
            <Button asChild size="sm" className="flex-1">
              <Link to={`/attendance/${item.allocation}/${today}`}>
                <CalendarCheck className="size-4" aria-hidden />
                Take attendance
              </Link>
            </Button>
          ) : isCompleted ? (
            <Button asChild size="sm" variant="outline" className="flex-1">
              <Link to={`/attendance?class=${item.allocation}`}>
                <CalendarDays className="size-4" aria-hidden />
                View history
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1" disabled>
              <CalendarDays className="size-4" aria-hidden />
              Not started
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to={`/classes/${item.allocation}`}>
              <LayoutDashboard className="size-4" aria-hidden />
              Workspace
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatTime(value: string) {
  return new Date(`2000-01-01T${value}`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
