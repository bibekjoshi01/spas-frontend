import type { ClassSummary } from "@/lib/api"

const KEY = "classmates:class"

/**
 * Remembers the chosen class across screens within a session.
 *
 * A teacher moving from attendance to marks to assignments is working on the
 * same class, so each screen opens on it rather than asking again.
 */
export function useRememberedClass(classes: ClassSummary[] | undefined) {
  const stored = Number(sessionStorage.getItem(KEY) ?? "")
  const fallback = classes?.[0]?.allocation ?? null
  const isValid = classes?.some((item) => item.allocation === stored)

  return {
    initial: isValid ? stored : fallback,
    remember: (allocation: number) =>
      sessionStorage.setItem(KEY, String(allocation)),
  }
}
