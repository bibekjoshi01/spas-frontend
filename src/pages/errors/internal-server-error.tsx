import { Link } from "react-router-dom"
import { House, RefreshCw } from "lucide-react"

import PageImage from "@/components/page-image"
import { Button } from "@/components/ui/button"

import ServerIssueImage from "@/assets/images/error/500.svg"

const ServerErrorPage = () => {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/20 p-4 sm:p-6">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <PageImage
          src={ServerIssueImage}
          alt="Internal server error illustration"
          className="mb-5 max-w-xs sm:max-w-sm"
        />
        <p className="text-xs font-semibold tracking-wider text-destructive uppercase">
          Error 500
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          We couldn’t load this page
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Something went wrong on our side. Retry now, or return to the
          dashboard and continue working.
        </p>
        <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button asChild>
            <Link to="/">
              <House className="size-4" aria-hidden />
              Go to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

export default ServerErrorPage
