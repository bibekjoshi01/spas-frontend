import { useNavigate } from "react-router-dom"

import unauthorizedImage from "@/assets/images/error/401.svg"
import { Button } from "@/components/ui/button"

const Unauthorized = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-8 text-center">
      <div className="max-w-xl">
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-primary">
          Access Denied!
        </h1>

        <p className="text-lg text-foreground">
          Sorry, you don't have permission to view this page.
        </p>

        <p className="mt-2 text-lg text-muted-foreground">
          You can return to the
          <Button
            size="sm"
            variant={"link"}
            className="text-md mt-8 font-normal text-primary underline"
            onClick={() => navigate(-1)}
          >
            previous page
          </Button>
          .
        </p>
      </div>

      <img
        src={unauthorizedImage}
        alt="Unauthorized Access"
        className="w-full max-w-xs object-contain md:max-w-sm"
      />
    </div>
  )
}

export default Unauthorized
