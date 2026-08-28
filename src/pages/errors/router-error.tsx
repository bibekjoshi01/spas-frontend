import { isRouteErrorResponse, useRouteError } from "react-router-dom"

import ErrorFallback from "@/pages/errors/website-error"

export default function RouterErrorBoundary() {
  const error = useRouteError()

  console.error("Router error:", error)

  if (isRouteErrorResponse(error)) {
    console.error("Route error:", {
      status: error.status,
      statusText: error.statusText,
      data: error.data,
    })
  }

  return <ErrorFallback />
}
