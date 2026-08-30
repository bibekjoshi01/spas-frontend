import {
  DEFAULT_ELIGIBILITY_THRESHOLD,
  useGetPerformanceWeightsQuery,
} from "@/lib/api"

/**
 * The attendance percentage this college requires.
 *
 * Every eligibility badge, meter mark and at-risk row measures against this, so
 * it comes from the college's saved policy rather than a constant — affiliating
 * universities do not agree on the figure. Until the policy arrives the shipped
 * default stands in, which is what the server uses for a college that has never
 * opened its settings screen.
 */
export function useEligibilityThreshold(): number {
  const { data } = useGetPerformanceWeightsQuery()
  const threshold = Number(data?.attendanceEligibilityThreshold)

  return Number.isFinite(threshold) ? threshold : DEFAULT_ELIGIBILITY_THRESHOLD
}
