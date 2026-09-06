import { useEffect } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import axios, { AxiosError } from "axios"
import Cookies from "js-cookie"

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
  if (config.url?.endsWith("/account/login")) return unauthorized()
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
    return response(profile)
  }
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
const { loginRequest } = await import("/src/pages/auth/redux/auth.api.ts")
const { rootAPI } = await import("/src/lib/redux/api-slice.ts")
await import("/src/lib/api/teaching.api.ts")
let root
let host
function Workspace() {
  useEffect(() => {
    w.workspaceMounts++
  }, [])
  return <div>PRIVATE WORKSPACE</div>
}
w.mount = async (path = "/workspace") => {
  root?.unmount()
  host?.remove()
  store.dispatch(sessionInvalidated())
  w.workspaceMounts = 0
  w.requests = []
  Cookies.set("refresh", "test-refresh")
  Cookies.remove("access")
  store.dispatch(
    setProfile({ ...profile, isSuperuser: true, permissions: ["view_user"] })
  )
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  root.render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/workspace" element={<Workspace />} />
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
          <Route path="/login" element={<div>LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
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
