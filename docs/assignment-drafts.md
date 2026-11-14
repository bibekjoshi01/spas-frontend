# AI assignment drafts

In **Assignments → Add assignment → Draft with AI**, teachers enter a topic,
learning objective, difficulty and 1–10 practice questions. Generation returns a
preview without creating an assignment. Choose **Use draft** (or **Replace title
and instructions** when the form already has content), edit the normal title and
rich-text editor, then choose **Create**. Dates and attachments survive applying
a draft and failed generation attempts.

The panel is available on new assignments with `add_assignment` permission in a
running class. Completed/upcoming classes remain read-only; editing saved
assignments does not offer generation. The backend independently checks
permissions, tenant and class ownership. Closing the dialog aborts the browser
request; a provider request already received by the server may still finish.

The typed mutation posts to
`performance-mod/allocations/<allocation>/assignment-draft` using the existing
authenticated API client. It does not invalidate saved-data caches. Requests
have a 45-second browser timeout; the backend's Gateway socket timeout is 30
seconds. Errors and field messages remain in the panel, retaining its inputs.
The existing create/update assignment API saves the reviewed content. An empty
optional due date is supported for multipart creation and clearing a deadline.

The Vercel AI Gateway key stays on the backend. No frontend Gateway credential or
new `VITE_` setting is required. The backend must enable `ASSIGNMENT_AI_ENABLED`
and configure `AI_GATEWAY_API_KEY` plus a structured-output model; see the backend
assignment documentation. Leave personal student information out of the topic
and objective. Review generated questions and criteria before saving.

## Verification

Run `yarn verify`, `yarn build`, `yarn test:assignments`, `yarn test:session`, and
`yarn test:student-portal` for the existing browser contracts.

`yarn test:assignment-drafts` runs the actual assignment components and API client
against real Django and PostgreSQL, with a local HTTP stand-in for Vercel AI
Gateway. No axios adapter or backend response is stubbed. Requirements:

- Node 22+, installed frontend dependencies and Chrome (`CHROME_BIN` optional).
- The sibling `ims-backend` checkout and its configured Python `venv`.
- Local PostgreSQL with credentials from the backend environment and permission
  to create/drop test databases. `SPAS_BACKEND_DIR` overrides the backend path.

The backend helper creates and migrates a unique disposable database, seeds a
college/teachers/classes and starts an HTTP server. A temporary private-media
directory contains uploaded test resources. Both are removed on exit; the
application database is untouched. The test verifies real login, cross-teacher
404s, invalid input prevention, refusal/outage/timeout errors, unsaved preview,
mobile/desktop overflow, explicit draft application, teacher edits, attachment
retention, persisted saving, edit restrictions, cancellation and throttling.
Screenshots are written to the OS temporary directory as
`spas-ai-draft-preview-320.png` and `spas-ai-draft-preview-1280.png`.

This check establishes behavior against the local Gateway contract stand-in.
Live model credentials, quality, budgets and retention settings require separate
deployment verification.
