import { Link } from "react-router-dom"

import PageImage from "@/components/page-image"
import { Button } from "@/components/ui/button"

import ServerIssueImage from "@/assets/images/error/500ErrorPage.svg"

import { resetApplication } from "@/lib/utils/reset-app"

const ErrorFallback = () => {
  const handleReset = async () => {
    await resetApplication()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <PageImage
        src={ServerIssueImage}
        alt="Unexpected error illustration"
        className="mb-8 max-w-md"
      />

      <h1 className="text-4xl font-semibold tracking-tight">
        Something Went Wrong
      </h1>

      <p className="mt-3 max-w-md text-muted-foreground">
        We encountered an unexpected error. Please try again later.
      </p>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        If the problem persists, please contact support.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>

        <Button size="lg" onClick={handleReset}>
          Reset App
        </Button>
      </div>

      <Button variant="link" className="mt-2" asChild>
        <Link to="/">Back Home</Link>
      </Button>
    </div>
  )
}

export default ErrorFallback
