import { Building2 } from "lucide-react"

/**
 * Shown when the app is opened on a bare platform host.
 *
 * Without a college in the hostname there is no schema to talk to, so failing
 * loudly here is better than every request 404ing with no explanation.
 */
export function TenantMissing() {
  const host = window.location.hostname

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <Building2 className="size-6 text-muted-foreground" aria-hidden />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Open Your College’s Address</h1>
          <p className="text-sm text-muted-foreground">
            SPAS is addressed per college. Go to your college’s own subdomain —
            for example{" "}
            <span className="font-mono text-foreground">
              yourcollege.{host}
            </span>{" "}
            — and sign in there.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Not sure which address to use? Ask your department head or the person
          who set up your account.
        </p>
      </div>
    </div>
  )
}
