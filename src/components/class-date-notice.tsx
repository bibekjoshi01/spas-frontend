import { useGetClassCalendarDayQuery } from "@/lib/api"

export function ClassDateNotice({
  allocation,
  date,
}: {
  allocation: number
  date: string
}) {
  const query = useGetClassCalendarDayQuery(
    { allocation, date },
    { skip: !allocation || !date }
  )
  if (query.isError)
    return (
      <p className="text-xs text-muted-foreground">
        Calendar unavailable.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => query.refetch()}
        >
          Retry
        </button>
      </p>
    )
  const day = query.currentData
  if (
    !day ||
    (!day.isWeekend &&
      !day.holidayTitles.length &&
      !day.outsideSemester &&
      !day.isCancelled)
  )
    return null
  return (
    <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
      {day.label}
    </p>
  )
}
