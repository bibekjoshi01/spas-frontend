import { Link } from "react-router-dom"
import { House, RefreshCw, RotateCcw } from "lucide-react"

import PageImage from "@/components/page-image"
import { Button } from "@/components/ui/button"

import ServerIssueImage from "@/assets/images/error/500.svg"

import { resetApplication } from "@/lib/utils/reset-app"

const ErrorFallback = () => {
  const handleReset = async () => {
    await resetApplication()
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/20 p-4 sm:p-6">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <PageImage
          src={ServerIssueImage}
          alt="Unexpected error illustration"
          className="mb-5 max-w-xs sm:max-w-sm"
        />
        <p className="text-xs font-semibold tracking-wider text-destructive uppercase">
          Unexpected error
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Reload the page first. If the problem continues, reset the local app
          data and sign in again.
        </p>
        <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button variant="destructive" onClick={handleReset}>
            <RotateCcw className="size-4" aria-hidden />
            Reset and sign out
          </Button>
        </div>
        <Button variant="link" className="mt-2" asChild>
          <Link to="/">
            <House className="size-4" aria-hidden />
            Go to dashboard
          </Link>
        </Button>
      </div>
    </main>
  )
}

export default ErrorFallback
