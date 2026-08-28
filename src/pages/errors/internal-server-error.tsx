import { Link } from "react-router-dom"

import PageImage from "@/components/page-image"
import { Button } from "@/components/ui/button"

import ServerIssueImage from "@/assets/images/error/500ErrorPage.svg"

const ServerErrorPage = () => {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <PageImage
        src={ServerIssueImage}
        alt="Internal server error illustration"
        className="mb-8 max-w-md"
      />

      <h1 className="text-4xl font-semibold tracking-tight">
        Internal Server Error
      </h1>

      <p className="mt-3 max-w-md text-muted-foreground">
        Something went wrong on our end. We&apos;re already working to fix the
        issue. Please try again in a few minutes.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button variant="outline" size="lg" onClick={handleRetry}>
          Try Again
        </Button>

        <Button size="lg" asChild>
          <Link to="/">Back Home</Link>
        </Button>
      </div>
    </div>
  )
}

export default ServerErrorPage
