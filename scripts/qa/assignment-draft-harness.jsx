import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import Cookies from "js-cookie"

// Only this QA entry point injects a fixture host. The app's axios adapter and
// components remain unchanged and make real HTTP requests to Django.
const { baseURL } = await import("/src/lib/utils/tenant.ts")
localStorage.clear()
Cookies.remove("access")
Cookies.remove("refresh")
const { store, persistor } = await import("/src/lib/redux/store.ts")
await new Promise((resolve) => {
  if (persistor.getState().bootstrapped) resolve()
  else {
    const stop = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) {
        stop()
        resolve()
      }
    })
  }
})
const loginResponse = await fetch(`${baseURL}user-mod/account/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ persona: "e2e-teacher", password: "E2eOnly!234" }),
})
if (!loginResponse.ok)
  throw new Error(`E2E login failed: ${loginResponse.status}`)
const profile = await loginResponse.json()
const { loginSuccess } = await import("/src/pages/auth/redux/auth.slice.ts")
store.dispatch(
  loginSuccess({
    tokens: profile.tokens,
    isAuthenticated: true,
    isSuperUser: profile.isSuperuser,
    profile,
  })
)
window.api = async (path, body, method = body ? "POST" : "GET") => {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access")}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: response.status, data: await response.json() }
}
window.checkOtherTeacher = async (allocation) => {
  const login = await fetch(`${baseURL}user-mod/account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona: "e2e-other", password: "E2eOnly!234" }),
  })
  const other = await login.json()
  const response = await fetch(
    `${baseURL}performance-mod/allocations/${allocation}/assignment-draft`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${other.tokens.access}`,
      },
      body: JSON.stringify({
        topic: "Trees",
        learningObjective: "Explain trees",
        difficulty: "BEGINNER",
      }),
    }
  )
  return response.status
}
window.chooseFile = () => {
  const input = document.querySelector('input[type="file"]')
  const files = new DataTransfer()
  files.items.add(
    new File(["Teacher resource"], "resource.txt", { type: "text/plain" })
  )
  input.files = files.files
  input.dispatchEvent(new Event("change", { bubbles: true }))
}
const { default: AssignmentsPage } =
  await import("/src/pages/assessments/assignments.tsx")
createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <MemoryRouter
      initialEntries={[`/assignments?class=${window.fixture.allocation}`]}
    >
      <AssignmentsPage />
    </MemoryRouter>
  </Provider>
)
window.ready = true
