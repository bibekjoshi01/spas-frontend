/**
 * Tenant resolution.
 *
 * Each college is a subdomain, and the same slug addresses both halves of the
 * product: the app is served from `client1.<app-domain>` and its API lives at
 * `client1.<api-domain>`. Nothing carries a tenant id in a payload — the host
 * the request goes to is what selects the schema, so getting this right is the
 * whole of multi-tenancy on the client.
 */

/** Hosts that are the platform itself, never a college. */
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "static",
  "assets",
  "cdn",
])

function hostParts(hostname: string): string[] {
  return hostname.split(".").filter(Boolean)
}

/**
 * The college slug for the host the app is being served from.
 *
 * `client1.localhost` and `client1.operon.app` both yield "client1"; a bare
 * `localhost` or `operon.app` yields null, meaning "no college addressed".
 */
export function getTenantSlug(
  hostname = window.location.hostname
): string | null {
  const explicit = import.meta.env.VITE_TENANT_SLUG
  if (explicit) return explicit

  const parts = hostParts(hostname)

  // An IP address never carries a subdomain.
  if (/^\d+(\.\d+)*$/.test(hostname)) return null

  const isLocal = parts[parts.length - 1] === "localhost"
  const minimumParts = isLocal ? 2 : 3

  if (parts.length < minimumParts) return null

  const candidate = parts[0].toLowerCase()

  return RESERVED_SUBDOMAINS.has(candidate) ? null : candidate
}

/** True when the app is being served from a bare platform host. */
export function isMissingTenant(): boolean {
  return getTenantSlug() === null && !import.meta.env.VITE_API_URL
}

/**
 * The API root for the college currently being addressed.
 *
 * `VITE_API_URL` short-circuits everything, which is how a developer points a
 * local frontend at a specific tenant without editing their hosts file.
 */
export function getApiUrl(): string {
  const explicitUrl = import.meta.env.VITE_API_URL
  if (explicitUrl) return `${explicitUrl.replace(/\/$/, "")}/`

  const scheme =
    import.meta.env.VITE_PUBLIC_APP_HTTP_SCHEME ??
    `${window.location.protocol}//`
  const apiHost = (
    import.meta.env.VITE_PUBLIC_APP_BASE_URL ?? "localhost:8000/api"
  ).replace(/\/$/, "")
  const apiVersion = (
    import.meta.env.VITE_PUBLIC_APP_API_VERSION ?? "v1/internal"
  )
    .replace(/^\//, "")
    .replace(/\/$/, "")

  const tenant = getTenantSlug()
  const host = tenant ? `${tenant}.${apiHost}` : apiHost

  return `${scheme}${host}/${apiVersion}/`
}

export const baseURL = getApiUrl()

/** The slug, for showing the user which college they are signed in to. */
export const tenantSlug = getTenantSlug()

/**
 * Ask the public API whether the hostname addresses an active college.
 * Explicit development overrides are trusted and skip public resolution.
 */
export async function tenantExists(): Promise<boolean | null> {
  const tenant = getTenantSlug()

  if (
    !tenant ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_TENANT_SLUG
  ) {
    return null
  }

  const scheme =
    import.meta.env.VITE_PUBLIC_APP_HTTP_SCHEME ??
    `${window.location.protocol}//`
  const apiRoot = (
    import.meta.env.VITE_PUBLIC_APP_BASE_URL ?? "localhost:8000/api"
  ).replace(/\/$/, "")
  const url = new URL(`${scheme}${apiRoot}/v1/external/tenant-resolution`)
  url.searchParams.set("subdomain", tenant)

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const data: unknown = await response.json()
    if (
      typeof data === "object" &&
      data !== null &&
      "exists" in data &&
      typeof data.exists === "boolean"
    ) {
      return data.exists
    }
  } catch {
    // Let the app handle a temporarily unavailable API normally.
  }

  return null
}

/** The bare frontend URL, without the tenant subdomain. */
export function getPlatformAppUrl(): string {
  const parts = hostParts(window.location.hostname)
  const tenant = getTenantSlug()
  const hostname = tenant ? parts.slice(1).join(".") : parts.join(".")
  const port = window.location.port ? `:${window.location.port}` : ""

  return `${window.location.protocol}//${hostname}${port}/`
}

/** Builds the app URL for another college, used by the tenant switcher. */
export function urlForTenant(slug: string): string {
  const parts = hostParts(window.location.hostname)
  const isLocal = parts[parts.length - 1] === "localhost"
  const rootParts = getTenantSlug() ? parts.slice(1) : parts
  const root = rootParts.join(".")
  const port = window.location.port ? `:${window.location.port}` : ""

  return `${window.location.protocol}//${slug}.${root}${port}${isLocal ? "" : ""}/`
}
