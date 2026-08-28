import { ClassmatesLogo } from "./components/classmates-logo"
import { LoginForm } from "./components/login-form"

export default function LoginPage() {
  const year = new Date().getFullYear()

  return (
    <div className="flex min-h-screen w-full flex-col bg-background px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="bg-card px-6 py-8 sm:px-9 sm:py-10">
          <ClassmatesLogo className="mb-9" />

          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Sign In To SPAS
            </h1>
          </div>

          <div className="mt-7">
            <LoginForm />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span>© {year} SPAS</span>
          <span>Student Performance & Academic System</span>
        </div>
      </div>
    </div>
  )
}
