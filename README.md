# SPAS Frontend

Web client for SPAS — student performance and academic operations for colleges.
Covers attendance, rosters, assessments, academics, people, and reporting.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, and Redux
Toolkit Query.

## Requirements

- Node.js 20.19+ (see `.nvmrc`)
- Yarn 1.22
- A running [SPAS backend](https://github.com/bibekjoshi01/ims-backend)

## Multi-tenancy

Every college is a subdomain, and the same slug addresses both halves of the
product — the app on `client1.<app-domain>` calls the API at
`client1.<api-domain>`. The slug is read from `window.location.hostname`, so
**you must browse a subdomain, not a bare host**, or the app will stop and say
no college was addressed.

Locally that means `http://client1.localhost:3000`, not `http://localhost:3000`.
`*.localhost` resolves to `127.0.0.1` in modern browsers with no `/etc/hosts`
entry. To skip subdomains entirely, set `VITE_TENANT_SLUG` or `VITE_API_URL` in
`.env`.

## Development

```bash
git clone https://github.com/bibekjoshi01/spas-frontend.git
cd spas-frontend
cp .env.example .env
yarn install
yarn dev
```

Open <http://client1.localhost:3000>, substituting a college slug your backend
knows about.

## Scripts

| Script           | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `yarn dev`       | Dev server on port 3000                   |
| `yarn build`     | Typecheck, then build to `dist/`          |
| `yarn preview`   | Serve the production build locally        |
| `yarn typecheck` | TypeScript, no emit                       |
| `yarn lint`      | ESLint (`lint:fix` to autofix)            |
| `yarn format`    | Prettier write (`format:check` to verify) |
| `yarn verify`    | Typecheck + lint + format check           |

Husky runs typecheck and lint-staged on commit, and a full build on push.

## Calendar PDF downloads

Open **Academic Calendar → Download calendar** and choose the months to include.
Selections remain selected while moving between BS years. The PDF uses three
month columns, Nepali month/year headings, and red weekend/holiday dates,
followed by working-day totals and saved event/holiday tables. It contains no
letterhead or invented exam schedule. Working days cover the selected months,
excluding weekends and active holidays; several holidays on one date count as
one closed day. Long tables continue onto additional pages.

Exports use the authorized staff or student calendar response and perform no
independent BS conversion. Nepali text uses the bundled SIL Open Font License
Noto Sans Devanagari font. Pages are rendered at print resolution to preserve
Nepali text shaping across devices; PDF text is not selectable.

## Deployment

`yarn build` emits static files to `dist/`. Any static host works, with two
requirements:

1. **SPA fallback** — rewrite all unmatched paths to `/index.html`, or client
   routes will 404 on refresh.
2. **Wildcard DNS and TLS** for `*.<app-domain>`, so every college subdomain
   resolves and is served over HTTPS.

Set these build-time environment variables in your host (they are inlined at
build time, so a change needs a rebuild):

```
VITE_PUBLIC_APP_HTTP_SCHEME=https://
VITE_PUBLIC_APP_BASE_URL=api.example.edu
VITE_PUBLIC_APP_API_VERSION=v1/internal
```

Leave `VITE_API_URL` and `VITE_TENANT_SLUG` unset — they are local overrides
that would pin production to a single college.

`vercel.json` already configures the SPA rewrite, security headers, and
immutable caching for hashed assets. On Vercel, add the wildcard domain and the
environment variables above, and deploys work as-is.
