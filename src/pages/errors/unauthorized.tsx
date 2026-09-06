import { useNavigate } from "react-router-dom"
import { ArrowLeft, House } from "lucide-react"

import unauthorizedImage from "@/assets/images/error/401.svg"
import { Button } from "@/components/ui/button"

const Unauthorized = () => {
  const navigate = useNavigate()

  return (
    <main className="grid min-h-screen place-items-center bg-muted/20 p-4 sm:p-6">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <img
          src={unauthorizedImage}
          alt="Access denied illustration"
          className="mb-5 h-auto w-full max-w-xs object-contain sm:max-w-sm"
        />
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          Error 401
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Access denied
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Your account doesn’t have permission to open this page. Return to your
          previous screen or continue from the dashboard.
        </p>
        <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" aria-hidden />
            Go back
          </Button>
          <Button onClick={() => navigate("/")}>
            <House className="size-4" aria-hidden />
            Go to dashboard
          </Button>
        </div>
      </div>
    </main>
  )
}

export default Unauthorized
