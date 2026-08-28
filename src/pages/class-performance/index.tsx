import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, Save, Search, X } from "lucide-react"

import { ClassPicker } from "@/components/class-picker"
import { ClassWorkspaceNav } from "@/components/class-workspace-nav"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useHasPermission } from "@/hooks/use-has-permissions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useRememberedClass } from "@/hooks/use-remembered-class"
import {
  apiErrorMessage,
  useGetClassesQuery,
  useGetClassPerformanceQuery,
  useSaveClassPerformanceMutation,
} from "@/lib/api"
import { notifier } from "@/lib/utils/notifier"

type Draft = { score: string; remarks: string }

export default function ClassPerformancePage() {
  const canEditPerformance = useHasPermission("edit_class_performance")
  const [params, setParams] = useSearchParams()
  const classes = useGetClassesQuery()
  const { initial, remember } = useRememberedClass(classes.data)
  const [chosenId, setChosenId] = useState<number | null>(
    Number(params.get("class")) || null
  )
  const [search, setSearch] = useState("")
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const allocation = chosenId ?? initial
  const ratings = useGetClassPerformanceQuery(allocation as number, {
    skip: !allocation,
  })
  const [save, saving] = useSaveClassPerformanceMutation()
  const chosen = classes.data?.find((item) => item.allocation === allocation)
  const isReadOnly = chosen?.semesterStatus !== "RUNNING"
  const canChange = !isReadOnly && canEditPerformance

  const focusEnrollment = Number(params.get("student")) || null
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (ratings.data ?? [])
      .filter(
        (row) =>
          !term ||
          row.fullName.toLowerCase().includes(term) ||
          row.rollNumber.toLowerCase().includes(term)
      )
      .sort((left, right) => {
        if (left.enrollment === focusEnrollment) return -1
        if (right.enrollment === focusEnrollment) return 1
        return 0
      })
  }, [focusEnrollment, ratings.data, search])

  const dirty = (ratings.data ?? []).filter((row) => {
    const draft = drafts[row.enrollment]
    return (
      draft &&
      (draft.score !== (row.score === null ? "" : String(row.score)) ||
        draft.remarks !== row.remarks)
    )
  })

  const update = (
    enrollment: number,
    original: Draft,
    field: keyof Draft,
    value: string
  ) => {
    setDrafts((current) => ({
      ...current,
      [enrollment]: { ...original, ...current[enrollment], [field]: value },
    }))
  }

  const submit = async () => {
    if (!allocation || !dirty.length) return
    try {
      const result = await save({
        allocation,
        entries: dirty.map((row) => ({
          enrollment: row.enrollment,
          score: drafts[row.enrollment].score
            ? Number(drafts[row.enrollment].score)
            : null,
          remarks: drafts[row.enrollment].remarks.trim(),
        })),
      }).unwrap()
      notifier.success(result.message)
    } catch (error) {
      notifier.error(
        apiErrorMessage(error, "Could not save class performance.")
      )
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Class Performance"
        description={
          chosen
            ? `${chosen.code} — ${chosen.name} · ${chosen.programCode} ${chosen.batchYear} · Rate overall participation and performance from 1 to 10.`
            : "Choose a class to rate its students."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/classes">
              <ArrowLeft className="size-4" aria-hidden />
              My Classes
            </Link>
          </Button>
        }
      />

      {chosen && <ClassWorkspaceNav value={chosen} active="Performance" />}

      <div className="flex flex-col gap-2 rounded-sm border bg-card p-2 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student or roll number"
            className="pl-8"
          />
        </div>
        {classes.data && (
          <ClassPicker
            classes={classes.data}
            value={allocation}
            onChange={(next) => {
              setChosenId(next)
              remember(next)
              setParams({ class: String(next) })
            }}
            label="Select class"
            className="sm:w-[28rem]"
          />
        )}
        {isReadOnly && chosen && (
          <span className="text-sm text-muted-foreground">
            Previous and upcoming semesters are read-only.
          </span>
        )}
        <Button
          size="sm"
          className="lg:ml-auto"
          disabled={!canChange || !dirty.length || saving.isLoading}
          onClick={submit}
        >
          <Save className="size-4" aria-hidden />
          {saving.isLoading
            ? "Saving…"
            : dirty.length
              ? `Save ${dirty.length} changes`
              : "Saved"}
        </Button>
      </div>

      <QueryState
        isLoading={classes.isLoading || ratings.isLoading}
        error={classes.error ?? ratings.error}
        isEmpty={visible.length === 0}
        onRetry={ratings.refetch}
        skeleton="table"
        emptyTitle={
          search ? "No students match that" : "No students on this class"
        }
        emptyMessage={
          search
            ? "Try another name or roll number."
            : "Enroll students before rating class performance."
        }
      >
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-slate-300 bg-slate-200 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800">
                <TableHead className="w-14">#</TableHead>
                <TableHead className="w-28">Roll</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="w-44">Rating (1–10)</TableHead>
                <TableHead className="min-w-80">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => {
                const original = {
                  score: row.score === null ? "" : String(row.score),
                  remarks: row.remarks,
                }
                const draft = { ...original, ...drafts[row.enrollment] }
                return (
                  <TableRow
                    key={row.enrollment}
                    className={
                      row.enrollment === focusEnrollment
                        ? "bg-amber-50 hover:bg-amber-50 dark:bg-amber-950/30"
                        : undefined
                    }
                  >
                    <TableCell className="text-muted-foreground tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.rollNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.fullName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={draft.score}
                          disabled={!canChange}
                          onChange={(event) =>
                            update(
                              row.enrollment,
                              original,
                              "score",
                              event.target.value
                            )
                          }
                          aria-label={`Class performance for ${row.fullName}`}
                          className="w-24 tabular-nums"
                        />
                        {!isReadOnly && draft.score && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              update(row.enrollment, original, "score", "")
                            }
                            aria-label={`Clear rating for ${row.fullName}`}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={draft.remarks}
                        disabled={!canChange}
                        onChange={(event) =>
                          update(
                            row.enrollment,
                            original,
                            "remarks",
                            event.target.value
                          )
                        }
                        placeholder="Optional evidence or context"
                        aria-label={`Remarks for ${row.fullName}`}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </QueryState>
    </div>
  )
}
