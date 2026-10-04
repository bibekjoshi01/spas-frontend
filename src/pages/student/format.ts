export function displayDate(value: string | null) {
  if (!value) return "Not set"
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
