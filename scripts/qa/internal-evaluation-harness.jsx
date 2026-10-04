/* Synthetic fixture; no college data or backend writes. */
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import axios, { AxiosError } from "axios"
import Cookies from "js-cookie"
import { HeaderActionsSlotContext } from "@/components/header-actions-context"

window.requests = []
window.scenario = "incomplete"
window.institution = {
  id: 1,
  uuid: "institution",
  name: "Thapathali Campus",
  universityName: "Tribhuvan University",
  instituteName: "Institute of Engineering",
  address: "Kathmandu",
}
const preview = () => ({
  institution: window.institution,
  subject: {
    code: "EX716",
    name: "RF and Microwave Engineering",
    fullMarks: 40,
    passMarks: 16,
    component: "Theory",
  },
  program: "BEI",
  academicLevel: "Bachelor",
  examiner: "Teacher",
  headOfDepartment: "Head",
  bsDate: "2083-06-18",
  weights: {
    attendance: 20,
    classPerformance: 10,
    assignment: 30,
    assessment: 40,
  },
  setupIssues:
    window.scenario === "setup"
      ? ["An administrator must add institution details in Settings."]
      : [],
  canDownloadBlank: window.scenario !== "setup",
  canDownloadCalculated: window.scenario === "complete",
  rows: [
    {
      enrollment: 41,
      rollNumber: "THA079BEI001",
      fullName: "Student One",
      mark: window.scenario === "complete" ? 26 : null,
      absent: false,
      remarks: "",
      issues:
        window.scenario === "incomplete"
          ? ["Assignments: 1 unevaluated assignment(s)."]
          : [],
    },
  ],
})
axios.defaults.adapter = async (config) => {
  window.requests.push({
    url: config.url,
    params: config.params,
    method: config.method,
    authorization: config.headers.Authorization,
  })
  const response = (data, status = 200) => ({
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
  })
  if (config.url.endsWith("/pdf")) {
    if (window.scenario === "changed")
      throw new AxiosError(
        "Incomplete",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        response(
          new Blob(
            [
              JSON.stringify({
                evidence: ["01: Assessments: 1 unmarked assessment(s)."],
              }),
            ],
            { type: "application/json" }
          ),
          400
        )
      )
    return response(
      new Blob(["%PDF-1.4 synthetic download"], { type: "application/pdf" })
    )
  }
  if (config.url.endsWith("/internal-evaluation")) return response(preview())
  if (config.url.includes("/institutions")) {
    if (config.method === "delete") {
      window.institution = null
      return response({ message: "Archived" })
    }
    if (config.method === "post" || config.method === "patch") {
      window.institution = {
        ...window.institution,
        id: 1,
        uuid: "institution",
        ...JSON.parse(config.data),
      }
      return response({ id: 1, message: "Saved" })
    }
    return response({
      count: window.institution ? 1 : 0,
      results: window.institution ? [window.institution] : [],
      next: null,
      previous: null,
    })
  }
  throw new Error(`Unexpected request: ${config.url}`)
}
localStorage.clear()
Cookies.set("access", "qa-evaluation-access")
Cookies.set("refresh", "qa-evaluation-refresh")
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
const { setProfile } = await import("/src/pages/auth/redux/auth.slice.ts")
const { rootAPI } = await import("/src/lib/redux/api-slice.ts")
const { InternalEvaluationButton } =
  await import("/src/components/internal-evaluation-dialog.tsx")
const { default: InstitutionSettings } =
  await import("/src/pages/settings/institution.tsx")
let root
window.mount = (page = "evaluation", allowed = true) => {
  root?.unmount()
  store.dispatch(rootAPI.util.resetApiState())
  store.dispatch(
    setProfile({
      id: 1,
      isSuperuser: page === "institution",
      roles: [],
      permissions: allowed
        ? [
            "view_attendance",
            "view_internal_exam",
            "view_assignment",
            "view_class_performance",
          ]
        : [],
    })
  )
  document.body.innerHTML =
    '<div id="header-actions"></div><div id="root"></div>'
  root = createRoot(document.getElementById("root"))
  root.render(
    <Provider store={store}>
      <HeaderActionsSlotContext.Provider
        value={document.getElementById("header-actions")}
      >
        <MemoryRouter>
          {page === "institution" ? (
            <InstitutionSettings />
          ) : (
            <InternalEvaluationButton allocation={11} />
          )}
        </MemoryRouter>
      </HeaderActionsSlotContext.Provider>
    </Provider>
  )
}
window.mount()
window.ready = true
