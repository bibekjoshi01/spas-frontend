import { Link } from "react-router-dom"

import PageImage from "@/components/page-image"
import { Button } from "@/components/ui/button"

import PageNotFoundImage from "@/assets/images/error/404.svg"

const PageNotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <PageImage
        src={PageNotFoundImage}
        alt="404 page not found illustration"
        className="mb-8 max-w-md"
      />

      <h1 className="text-4xl font-semibold tracking-tight">
        404 – Page Not Found
      </h1>

      <p className="mt-3 max-w-md text-muted-foreground">
        The page you're looking for may have been moved, deleted, renamed, or
        may never have existed.
      </p>

      <Button size="lg" className="mt-8" asChild>
        <Link to="/">Back Home</Link>
      </Button>
    </div>
  )
}

export default PageNotFound
