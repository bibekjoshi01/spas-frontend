import { useEffect } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import axios, { AxiosError } from "axios"
import Cookies from "js-cookie"
import { HeaderActionsSlotContext } from "@/components/header-actions-context"

const w = window
w.requests = []
const profile = {
  id: 2,
  uuid: "teacher-test",
  username: "teacher",
  fullName: "Test Teacher",
  firstName: "Test",
  lastName: "Teacher",
  middleName: "",
  email: "test@example.invalid",
  phoneNo: "",
  alternatePhoneNo: "",
  photo: null,
  isSuperuser: false,
  mustChangePassword: false,
  permissions: ["view_attendance"],
  roles: [{ id: 2, codename: "TEACHER", name: "Teacher" }],
}
axios.defaults.adapter = async (config) => {
  w.requests.push(config.url)
  const response = (data, status = 200) => ({
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
  })
  const unauthorized = () => {
    throw new AxiosError(
      "Invalid credentials",
      "ERR_BAD_REQUEST",
      config,
      undefined,
      response({ detail: "Invalid credentials" }, 401)
    )
  }
  if (config.url?.endsWith("/account/login")) {
    if (!w.allowTeacherLogin) return unauthorized()
    w.loginCredentials = JSON.parse(config.data)
    return response({
      ...profile,
      ...w.profileOverrides,
      tokens: { access: "temporary-access", refresh: "temporary-refresh" },
    })
  }
  if (config.url?.endsWith("/account/change-password")) {
    w.passwordChanges = JSON.parse(config.data)
    if (w.rejectPasswordChange)
      throw new AxiosError(
        "Invalid current password",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        response({ currentPassword: ["Current password is incorrect."] }, 400)
      )
    w.profileOverrides = {
      ...w.profileOverrides,
      mustChangePassword: false,
      permissions: profile.permissions,
    }
    return response({
      tokens: { access: "private-access", refresh: "private-refresh" },
    })
  }
  if (config.url?.endsWith("/token/refresh")) {
    if (w.holdRefresh)
      await new Promise((resolve) => {
        w.releaseRefresh = resolve
      })
    if (w.networkFailure)
      throw new AxiosError("Network unavailable", "ERR_NETWORK", config)
    return response({ access: "renewed-access" })
  }
  if (config.url?.endsWith("/account/me")) {
    if (w.hold)
      await new Promise((resolve) => {
        w.release = () => {
          w.hold = false
          resolve()
        }
      })
    if (!config.headers.Authorization) return unauthorized()
    if (w.meForbidden)
      throw new AxiosError(
        "Access revoked",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        response({ detail: "Access revoked" }, 403)
      )
    return response({ ...profile, ...w.profileOverrides })
  }
  if (config.url?.endsWith("/students/import")) {
    const commit = config.data.get("commit") === "true"
    w.importRequests.push({
      commit,
      batch: config.data.get("batch"),
      file: config.data.get("file").name,
    })
    if (w.holdPreview && !commit)
      await new Promise((resolve) => {
        w.releasePreview = resolve
      })
    if (w.importError)
      throw new AxiosError(
        "Invalid CSV",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        response(
          { file: ["That sheet is missing required columns: roll_number."] },
          400
        )
      )
    return response({
      committed: commit,
      summary: { total: 1, create: 1, update: 0, error: 0 },
      columns: {
        recognised: ["rollNumber", "firstName", "lastName"],
        ignored: [],
      },
      rows: [
        {
          row: 2,
          action: "create",
          identity: "042 — Ramesh Thapa",
          errors: null,
          changes: [],
        },
      ],
    })
  }
  if (config.url?.endsWith("/batches"))
    return response({
      count: 1,
      results: [
        {
          id: 1,
          year: 2080,
          status: "RUNNING",
          isActive: true,
          studentCount: 0,
          program: { id: 1, code: "CSIT", name: "Computer Science" },
        },
      ],
    })
  if (config.url?.endsWith("/students") || config.url?.endsWith("/programs"))
    return response({ count: 0, results: [] })
  if (config.url?.endsWith("/private-test"))
    await new Promise((resolve) => {
      w.releasePrivate = resolve
    })
  return response([])
}
localStorage.clear()
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
const { setProfile, sessionInvalidated, logoutSuccess } =
  await import("/src/pages/auth/redux/auth.slice.ts")
const { default: AuthGuard } = await import("/src/routes/auth-guard.tsx")
const { default: PermissionGuard } =
  await import("/src/routes/permission-guard.tsx")
const { LoginForm } =
  await import("/src/pages/auth/login/components/login-form.tsx")
const { loginRequest } = await import("/src/pages/auth/redux/auth.api.ts")
const { rootAPI } = await import("/src/lib/redux/api-slice.ts")
const { StudentsSection } =
  await import("/src/pages/people/sections/students.tsx")
await import("/src/lib/api/teaching.api.ts")
let root
let host
let actionsHost
function Workspace() {
  useEffect(() => {
    w.workspaceMounts++
  }, [])
  return <div>PRIVATE WORKSPACE</div>
}
w.mount = async (path = "/workspace") => {
  root?.unmount()
  host?.remove()
  actionsHost?.remove()
  store.dispatch(sessionInvalidated())
  w.workspaceMounts = 0
  w.requests = []
  w.importRequests = []
  Cookies.remove("access")
  if (path === "/login") {
    Cookies.remove("refresh")
  } else {
    Cookies.set("refresh", "test-refresh")
    store.dispatch(
      setProfile({ ...profile, isSuperuser: true, permissions: ["view_user"] })
    )
  }
  host = document.createElement("div")
  actionsHost = document.createElement("div")
  document.body.append(actionsHost)
  document.body.append(host)
  root = createRoot(host)
  root.render(
    <Provider store={store}>
      <HeaderActionsSlotContext.Provider value={actionsHost}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AuthGuard />}>
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/dashboard" element={<Workspace />} />
              <Route
                path="/students"
                element={
                  <PermissionGuard permission="view_student">
                    <StudentsSection />
                  </PermissionGuard>
                }
              />
              <Route
                path="/admin"
                element={
                  <PermissionGuard permission="view_user">
                    <Workspace />
                  </PermissionGuard>
                }
              />
            </Route>
            <Route path="/401" element={<div>ACCESS DENIED</div>} />
            <Route
              path="/login"
              element={w.allowTeacherLogin ? <LoginForm /> : <div>LOGIN</div>}
            />
          </Routes>
        </MemoryRouter>
      </HeaderActionsSlotContext.Provider>
    </Provider>
  )
}
w.chooseCsv = (name = "students.csv") => {
  const files = new DataTransfer()
  files.items.add(
    new File(["roll_number,first_name,last_name\n042,Ramesh,Thapa\n"], name, {
      type: "text/csv",
    })
  )
  const input = document.querySelector('input[type="file"]')
  input.files = files.files
  input.dispatchEvent(new Event("change", { bubbles: true }))
}
w.loginFailure = () =>
  loginRequest({ persona: "bad", password: "bad" }).then(
    () => false,
    () => Boolean(Cookies.get("refresh"))
  )
w.cacheCheck = async () => {
  await store.dispatch(
    rootAPI.util.upsertQueryData("getClasses", undefined, [{ allocation: 99 }])
  )
  const before = Object.keys(
    store.getState()[rootAPI.reducerPath].queries
  ).length
  store.dispatch(logoutSuccess())
  return {
    before,
    after: Object.keys(store.getState()[rootAPI.reducerPath].queries).length,
  }
}
w.ready = true

const { axiosInstance } = await import("/src/lib/redux/axios.ts")
w.startLateResponse = () => {
  Cookies.set("refresh", "old-session")
  Cookies.set("access", "old-access")
  w.late = axiosInstance.get("/private-test").then(
    () => false,
    (error) => axios.isCancel(error)
  )
}
w.switchAndRelease = () => {
  Cookies.set("refresh", "new-session")
  Cookies.set("access", "new-access")
  w.releasePrivate()
  return w.late
}
w.startLateRefresh = () => {
  Cookies.set("refresh", "old-session")
  Cookies.remove("access")
  w.holdRefresh = true
  w.late = axiosInstance.get("user-mod/account/me").then(
    () => false,
    (error) => axios.isCancel(error)
  )
}
w.switchAndReleaseRefresh = async () => {
  Cookies.set("refresh", "new-session")
  Cookies.set("access", "new-access")
  w.releaseRefresh()
  const cancelled = await w.late
  return { cancelled, access: Cookies.get("access") }
}
