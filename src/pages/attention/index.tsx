import { useState } from "react"
import { Mail } from "lucide-react"

import { AttendanceMeter } from "@/components/attendance-meter"
import { PageHeader } from "@/components/page-header"
import { ResourceList } from "@/components/resource-list"
import { StudentNameSortButton } from "@/components/student-name-sort"
import {
  studentNameOrdering,
  type StudentNameSortDirection,
} from "@/lib/utils/student-sort"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEligibilityThreshold } from "@/hooks/use-eligibility-threshold"
import { usePagedQuery } from "@/hooks/use-paged-query"
import {
  ALL,
  type AttendanceAttention,
  useGetAttendanceAttentionQuery,
  useGetBatchesQuery,
} from "@/lib/api"
import { formatPercentage } from "@/lib/utils"

export default function AttendanceAttentionPage() {
  const batches = useGetBatchesQuery(ALL)
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
    batch: "all",
    ordering: "full_name",
  })
  const [nameSort, setNameSort] = useState<StudentNameSortDirection>("default")
  const { data, isLoading, isFetching, error, refetch } =
    useGetAttendanceAttentionQuery(params)
  const threshold = useEligibilityThreshold()

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Attendance attention"
        description={`Active students below ${formatPercentage(threshold)} attendance in the classes you manage.`}
        meta={data ? `${data.count} need follow-up` : undefined}
      />

      <ResourceList<AttendanceAttention>
        rows={data?.results}
        rowKey={(row) => row.enrollment}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        refetch={refetch}
        count={data?.count}
        offset={offset}
        onOffsetChange={setOffset}
        search={{
          value: filters.search,
          onChange: (search) => setFilters({ search }),
          placeholder: "Search student, roll or subject",
        }}
        filters={
          <>
            <Select
              value={filters.batch}
              onValueChange={(batch) => setFilters({ batch })}
            >
              <SelectTrigger className="w-52" aria-label="Filter by batch">
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batches.data?.results.map((batch) => (
                  <SelectItem key={batch.id} value={String(batch.id)}>
                    {batch.program.code} · Batch {batch.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.ordering}
              onValueChange={(ordering) => {
                setNameSort(
                  ordering === "-full_name"
                    ? "desc"
                    : ordering === "full_name"
                      ? "default"
                      : "default"
                )
                setFilters({ ordering })
              }}
            >
              <SelectTrigger className="w-52" aria-label="Sort attendance">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_name">Student name</SelectItem>
                <SelectItem value="-full_name">
                  Student name descending
                </SelectItem>
                <SelectItem value="attendance_percentage">
                  Lowest attendance first
                </SelectItem>
                <SelectItem value="-attendance_percentage">
                  Highest attendance first
                </SelectItem>
                <SelectItem value="roll_number">Roll number</SelectItem>
                <SelectItem value="-last_attendance_date">
                  Most recently recorded
                </SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        clearFilters={{
          visible: filters.batch !== "all" || filters.ordering !== "full_name",
          onClear: () => {
            setNameSort("default")
            setFilters({ batch: "all", ordering: "full_name" })
          },
        }}
        emptyTitle="No students need attendance follow-up"
        emptyMessage={`No active student in your management scope is below ${formatPercentage(threshold)} attendance.`}
        columns={[
          {
            header: "#",
            className: "w-12 text-right tabular-nums text-muted-foreground",
            cell: (_row, index) => offset + index + 1,
          },
          {
            header: (
              <StudentNameSortButton
                direction={nameSort}
                onChange={(direction) => {
                  setNameSort(direction)
                  setFilters({
                    ordering: studentNameOrdering(direction) || "full_name",
                  })
                }}
              />
            ),
            cell: (row) => (
              <div>
                <div className="font-semibold">{row.fullName}</div>
                <div className="text-xs text-muted-foreground">
                  Roll {row.rollNumber}
                </div>
              </div>
            ),
          },
          {
            header: "Contact",
            cell: (row) => (
              <div className="space-y-0.5 text-xs">
                <div>{row.phoneNo || "No phone"}</div>
                {row.alternatePhoneNo && (
                  <div className="text-muted-foreground">
                    Alt: {row.alternatePhoneNo}
                  </div>
                )}
                {row.email && (
                  <div className="text-muted-foreground">{row.email}</div>
                )}
              </div>
            ),
          },
          {
            header: "Class",
            cell: (row) => (
              <div>
                <div className="font-medium">
                  {row.subjectCode} · {row.subjectName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.programCode} · Batch {row.batchYear} · Semester{" "}
                  {row.semester}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.teacherName || "Teacher not assigned"}
                </div>
              </div>
            ),
          },
          {
            header: "Attendance",
            className: "min-w-48",
            cell: (row) => (
              <div className="space-y-1">
                <AttendanceMeter percentage={row.attendancePercentage} />
                <div className="text-xs text-muted-foreground">
                  {row.presentCount + row.lateCount} attended of{" "}
                  {row.classesHeld}
                </div>
              </div>
            ),
          },
          {
            header: "Status counts",
            className: "whitespace-nowrap text-xs",
            cell: (row) =>
              `${row.absentCount} absent · ${row.lateCount} late · ${row.excusedCount} excused`,
          },
          {
            header: "Last record",
            className: "whitespace-nowrap text-sm text-muted-foreground",
            cell: (row) => row.lastAttendanceDate || "—",
          },
          {
            header: "",
            className: "w-16 text-right",
            cell: (row) =>
              row.email ? (
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={`mailto:${row.email}`}
                    aria-label={`Email ${row.fullName}`}
                  >
                    <Mail className="size-4" aria-hidden />
                  </a>
                </Button>
              ) : null,
          },
        ]}
      />
    </div>
  )
}
