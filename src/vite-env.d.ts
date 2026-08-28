/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Scheme the API is reached over, including "://". */
  readonly VITE_PUBLIC_APP_HTTP_SCHEME?: string
  /** API host and path prefix, without a tenant subdomain. */
  readonly VITE_PUBLIC_APP_BASE_URL?: string
  /** API version segment, e.g. "v1/internal". */
  readonly VITE_PUBLIC_APP_API_VERSION?: string

  /** Development override: a full API root that bypasses tenant resolution. */
  readonly VITE_API_URL?: string
  /** Development override: force a college slug regardless of hostname. */
  readonly VITE_TENANT_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
