import { Link } from "react-router-dom"

import PageImage from "@/components/page-image"
import { Button } from "@/components/ui/button"

import UnderConstructionImage from "@/assets/images/error/constructionPage.svg"

const UnderConstruction = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <PageImage
        src={UnderConstructionImage}
        alt="Under construction illustration"
        className="mb-8 max-w-md"
      />

      <h1 className="text-4xl font-semibold tracking-tight">
        Under Construction
      </h1>

      <p className="mt-3 max-w-md text-muted-foreground">
        This page is currently under construction. We're working on it and it
        will be available soon. Please check back later.
      </p>

      <Button size="lg" className="mt-8" asChild>
        <Link to="/">Back Home</Link>
      </Button>
    </div>
  )
}

export default UnderConstruction
