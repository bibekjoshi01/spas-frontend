import { Link } from "react-router-dom"
import { ArrowLeft, House } from "lucide-react"

import PageImage from "@/components/page-image"
import { Button } from "@/components/ui/button"

import PageNotFoundImage from "@/assets/images/error/404.svg"

const PageNotFound = () => {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/20 p-4 sm:p-6">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <PageImage
          src={PageNotFoundImage}
          alt="Page not found illustration"
          className="mb-5 max-w-xs sm:max-w-sm"
        />
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          Error 404
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          This page may have moved, been removed, or the address may be
          incorrect.
        </p>
        <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" aria-hidden />
            Go back
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

export default PageNotFound
