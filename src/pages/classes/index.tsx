import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Input } from "@/components/ui/input"
import { useGetClassesQuery } from "@/lib/api"
import { cn } from "@/lib/utils"
import { localDateKey } from "@/lib/utils/date"

import { ClassCard } from "./components/class-card"

/**
 * My Classes — every subject the signed-in teacher is allocated.
 *
 * The list arrives already scoped by the backend, so there is no teacher
 * filter here: a teacher sees theirs, a coordinator sees the department's.
 */
export default function ClassesPage() {
  const { data, isLoading, isFetching, error, refetch } = useGetClassesQuery()
  const [search, setSearch] = useState("")

  const today = useMemo(() => localDateKey(), [])

  const filtered = useMemo(() => {
    if (!data) return []
    const term = search.trim().toLowerCase()
    if (!term) return data

    return data.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.programCode.toLowerCase().includes(term)
    )
  }, [data, search])

  const totalStudents =
    data?.reduce((sum, item) => sum + item.studentCount, 0) ?? 0

  const sections = [
    {
      status: "RUNNING",
      title: "Current classes",
      description: "Active classes where teaching records can be updated.",
    },
    {
      status: "UPCOMING",
      title: "Upcoming classes",
      description:
        "Visible for preparation; records remain read-only until the semester starts.",
    },
    {
      status: "COMPLETED",
      title: "Previous classes",
      description:
        "Historical attendance and assessments are available in read-only mode.",
    },
  ] as const

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="My Classes"
        description="Every subject allocated to you this semester."
        meta={
          data && (
            <>
              <span>
                {data.length} {data.length === 1 ? "class" : "classes"}
              </span>
              <span>{totalStudents} students</span>
              {isFetching && <span>Refreshing…</span>}
            </>
          )
        }
        actions={
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search classes"
              className="bg-card pl-8 dark:bg-input/30"
              aria-label="Search classes"
            />
          </div>
        }
      />

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={filtered.length === 0}
        onRetry={refetch}
        skeleton="cards"
        emptyTitle={
          search ? "No classes match that" : "No classes allocated yet"
        }
        emptyMessage={
          search
            ? "Try a different subject name or code."
            : "Once a coordinator allocates a subject to you, it will show up here."
        }
      >
        <div className="space-y-5">
          {sections.map((section) => {
            const items = filtered.filter(
              (item) => item.semesterStatus === section.status
            )
            if (!items.length) return null

            return (
              <section key={section.status} className="space-y-2">
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 border border-l-4 bg-band px-3 py-2.5",
                    section.status === "RUNNING" && "border-l-emerald-600",
                    section.status === "UPCOMING" && "border-l-sky-600",
                    section.status === "COMPLETED" && "border-l-slate-500"
                  )}
                >
                  <div>
                    <h2 className="text-base font-bold tracking-tight">
                      {section.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <span className="border bg-card px-2 py-0.5 text-sm font-semibold tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <ClassCard
                      key={item.allocation}
                      item={item}
                      today={today}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </QueryState>
    </div>
  )
}
