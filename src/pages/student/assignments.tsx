import { useState } from "react"

import { AssignmentDetailsDialog } from "@/components/assignment-details-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ASSIGNMENT_LABELS, type StudentPortalOverview } from "@/lib/api"

import { displayDate } from "./format"

export function StudentAssignments({
  overview,
}: {
  overview: StudentPortalOverview
}) {
  const [filter, setFilter] = useState<"ongoing" | "all">("ongoing")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<number | null>(null)
  const tasks = overview.subjects
    .flatMap((subject) =>
      subject.assignments.map((assignment) => ({ subject, assignment }))
    )
    .filter(
      ({ subject, assignment }) =>
        (filter === "all" ||
          (subject.semesterStatus === "RUNNING" &&
            subject.isActive &&
            assignment.status !== "DONE")) &&
        `${assignment.title} ${subject.class.code} ${subject.class.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
    )
    .sort(
      (left, right) =>
        (left.assignment.dueDate ?? "9999").localeCompare(
          right.assignment.dueDate ?? "9999"
        ) ||
        right.assignment.assignedDate.localeCompare(
          left.assignment.assignedDate
        )
    )
  return (
    <section className="space-y-4" aria-label="My assignments">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "ongoing" ? "default" : "outline"}
          aria-pressed={filter === "ongoing"}
          onClick={() => setFilter("ongoing")}
        >
          Ongoing assignments
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All assignments
        </Button>
        <Input
          className="w-full sm:ml-auto sm:w-72"
          aria-label="Search assignments"
          placeholder="Search tasks or subjects"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {tasks.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {tasks.map(({ subject, assignment }) => (
            <Card key={`${subject.enrollment}-${assignment.assignmentId}`}>
              <CardHeader className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {subject.class.code} · {subject.class.name}
                </p>
                <CardTitle className="text-base">{assignment.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Semester {subject.semester}</Badge>
                  <Badge variant="secondary">
                    {subject.semesterStatus === "RUNNING"
                      ? "Current"
                      : subject.semesterStatus === "COMPLETED"
                        ? "Completed semester"
                        : "Upcoming semester"}
                  </Badge>
                  {assignment.dueDate &&
                    assignment.dueDate < overview.asOfDate &&
                    assignment.status !== "DONE" && (
                      <Badge variant="destructive">Past due date</Badge>
                    )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Assigned {displayDate(assignment.assignedDate)} ·{" "}
                  {assignment.dueDate
                    ? `Due ${displayDate(assignment.dueDate)}`
                    : "No due date"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Teacher evaluation:{" "}
                  {assignment.status
                    ? ASSIGNMENT_LABELS[assignment.status]
                    : "Not recorded"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSelected(assignment.assignmentId)}
                >
                  View assignment details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="font-medium">
            {search
              ? "No assignments match your search"
              : filter === "ongoing"
                ? "No ongoing assignments"
                : "No assignments published"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tasks from your enrolled subjects will appear here when your teacher
            assigns them.
          </p>
        </div>
      )}
      {selected && (
        <AssignmentDetailsDialog
          assignmentId={selected}
          student
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
