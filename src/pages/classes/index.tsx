import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"

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
  const [status, setStatus] = useState<
    "ALL" | "RUNNING" | "UPCOMING" | "COMPLETED"
  >("ALL")

  const today = useMemo(() => localDateKey(), [])

  const filtered = useMemo(() => {
    if (!data) return []
    const term = search.trim().toLowerCase()
    return data.filter((item) => {
      const matchesStatus = status === "ALL" || item.semesterStatus === status
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.programCode.toLowerCase().includes(term)
      return matchesStatus && matchesSearch
    })
  }, [data, search, status])

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
    <div className="mx-auto max-w-6xl space-y-3 p-3 md:p-4">
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
      />

      <div className="border bg-card">
        <div className="flex justify-end p-2">
          <div className="relative w-full lg:w-72">
            <Search
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject or program"
              className="bg-background pr-9 pl-8"
              aria-label="Search classes"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Clear class search"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
        <div
          className="flex min-w-0 gap-1 overflow-x-auto border-t px-2"
          aria-label="Filter classes by status"
        >
          {(
            [
              ["ALL", "All"],
              ["RUNNING", "Current"],
              ["UPCOMING", "Upcoming"],
              ["COMPLETED", "Previous"],
            ] as const
          ).map(([value, label]) => {
            const count =
              value === "ALL"
                ? (data?.length ?? 0)
                : (data?.filter((item) => item.semesterStatus === value)
                    .length ?? 0)
            return (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  status === value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                <span className="text-xs tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={filtered.length === 0}
        onRetry={refetch}
        skeleton="cards"
        emptyTitle={
          search || status !== "ALL"
            ? "No classes match that"
            : "No classes allocated yet"
        }
        emptyMessage={
          search || status !== "ALL"
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
                    <h2 className="text-sm font-bold tracking-tight sm:text-base">
                      {section.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <span className="min-w-7 border bg-card px-2 py-0.5 text-center text-sm font-semibold tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
