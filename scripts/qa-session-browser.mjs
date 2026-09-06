/* global process, Buffer */
import { createServer } from "vite"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import { mkdtemp } from "node:fs/promises"
import assert from "node:assert/strict"
const root = fileURLToPath(new URL("../", import.meta.url))
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 3198, strictPort: true },
  plugins: [
    {
      name: "export-check",
      configureServer(server) {
        server.middlewares.use("/export-check", (_req, res) => {
          res.setHeader("Content-Type", "text/html")
          res.end(
            `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/src/index.css"></head><body><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import '/scripts/qa/session-harness.jsx';</script></body></html>`
          )
        })
      },
    },
  ],
})
await server.listen()
const profile = await mkdtemp(join(tmpdir(), "spas-qa-chrome-"))
const browser = spawn(
  process.env.CHROME_BIN ||
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome"),
  [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=9238",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" }
)
let socket
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
try {
  let targets
  for (let i = 0; i < 50; i++) {
    try {
      targets = await (await fetch("http://127.0.0.1:9238/json")).json()
      break
    } catch {
      await pause(200)
    }
  }
  assert(targets, "Browser did not start")
  socket = new WebSocket(
    targets.find((t) => t.type === "page").webSocketDebuggerUrl
  )
  await new Promise((r) => socket.addEventListener("open", r, { once: true }))
  let id = 0
  const pending = new Map()
  socket.addEventListener("message", (e) => {
    const m = JSON.parse(e.data)
    if (pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      pending.set(n, (m) => (m.error ? reject(m.error) : resolve(m.result)))
      socket.send(JSON.stringify({ id: n, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  await send("Page.navigate", { url: "http://127.0.0.1:3198/export-check" })
  for (let i = 0; i < 100; i++) {
    if (await evaluate("window.ready === true")) break
    await pause(100)
  }
  assert(await evaluate("window.ready === true"))
  await evaluate(`window.hold=true;window.mount()`)
  for (let i = 0; i < 100; i++) {
    if (await evaluate("Boolean(window.release)")) break
    await pause(100)
  }
  assert.equal(
    await evaluate("window.workspaceMounts"),
    0,
    "Stale persisted profile mounted protected UI"
  )
  assert(
    await evaluate(`document.body.textContent.includes('Checking access')`)
  )
  await evaluate("window.release()")
  await pause(700)
  assert.equal(await evaluate("window.workspaceMounts"), 1)
  assert(
    await evaluate(`window.requests.some(url=>url.endsWith('/token/refresh'))`)
  )
  assert(
    await evaluate("window.loginFailure()"),
    "Invalid login cleared another valid session"
  )
  await evaluate(`window.networkFailure=true;window.mount()`)
  await pause(700)
  assert(
    await evaluate(
      `document.body.textContent.includes('Could not check your session')`
    )
  )
  assert(await evaluate(`document.cookie.includes('refresh=test-refresh')`))
  await evaluate(
    `window.networkFailure=false;Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Retry').click()`
  )
  await pause(700)
  assert(
    await evaluate(`document.body.textContent.includes('PRIVATE WORKSPACE')`)
  )
  await evaluate(`window.mount('/admin')`)
  await pause(700)
  assert(await evaluate(`document.body.textContent.includes('ACCESS DENIED')`))
  assert.equal(
    await evaluate("window.workspaceMounts"),
    0,
    "Teacher mounted management UI"
  )
  const cache = await evaluate("window.cacheCheck()")
  assert(cache.before > 0)
  assert.equal(cache.after, 0)
  await evaluate("window.startLateResponse()")
  for (let i = 0; i < 100; i++) {
    if (await evaluate("Boolean(window.releasePrivate)")) break
    await pause(50)
  }
  assert(
    await evaluate("window.switchAndRelease()"),
    "Old-account response was accepted"
  )
  await evaluate("window.startLateRefresh()")
  for (let i = 0; i < 100; i++) {
    if (await evaluate("Boolean(window.releaseRefresh)")) break
    await pause(50)
  }
  const late = await evaluate("window.switchAndReleaseRefresh()")
  assert(late.cancelled)
  assert.equal(late.access, "new-access")
  console.log(
    "Passed: stale account responses and late token refresh are rejected."
  )
  console.log(
    "Passed: no protected render before validation; expired access restored with refresh; invalid login preserves session; transient refresh failure supports retry; teacher denied admin route; logout clears cached records."
  )
} finally {
  socket?.close()
  browser.kill()
  await server.close()
}
