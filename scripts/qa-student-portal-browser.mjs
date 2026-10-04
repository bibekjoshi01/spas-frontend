/* global process, Buffer */
import { createServer } from "vite"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import { mkdtemp, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
const root = fileURLToPath(new URL("../", import.meta.url))
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 3199, strictPort: true },
  plugins: [
    {
      name: "export-check",
      configureServer(server) {
        server.middlewares.use("/export-check", (_req, res) => {
          res.setHeader("Content-Type", "text/html")
          res.end(
            `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/src/index.css"></head><body><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import '/scripts/qa/student-portal-harness.jsx';</script></body></html>`
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
    "--remote-debugging-port=9239",
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
      targets = await (await fetch("http://127.0.0.1:9239/json")).json()
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
  await send("Page.navigate", { url: "http://127.0.0.1:3199/export-check" })
  for (let i = 0; i < 100; i++) {
    if (await evaluate("window.ready === true")) break
    await pause(100)
  }
  assert(await evaluate("window.ready === true"))
  const click = async (label) =>
    evaluate(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)})?.click()`
    )
  const waitText = async (text) => {
    for (let i = 0; i < 100; i++) {
      if (
        await evaluate(
          `document.body.textContent.includes(${JSON.stringify(text)})`
        )
      )
        return
      await pause(100)
    }
    throw new Error(`Missing portal text: ${text}`)
  }
  await waitText("Current performance")
  assert(
    await evaluate("document.body.textContent.includes('55%')"),
    "Completed classes contaminated current progress"
  )
  assert(
    !(await evaluate("document.body.textContent.includes('Historical Class')"))
  )
  assert(await evaluate("document.body.textContent.includes('Past due date')"))
  await click("Academic record")
  await waitText("REG-001")
  await click("My subjects")
  await waitText("Historical Class")
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='View marks and details').click()"
  )
  await waitText("Zero score exam")
  await waitText("0.00 / 10")
  await waitText("Not recorded")
  await waitText("Finish your own diagrams")
  await waitText("Unmarked")
  await click("Next")
  await waitText("11–12 of 12 classes")
  assert(
    await evaluate(
      "window.requests.every(url=>url.includes('/student-portal/'))"
    ),
    "Portal requested staff API"
  )
  for (const width of [390, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 500,
    })
    await pause(250)
    assert(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth + 1"
      ),
      `Page overflow at ${width}px`
    )
    const shot = await send("Page.captureScreenshot", { format: "png" })
    await writeFile(
      join(tmpdir(), `spas-student-portal-${width}.png`),
      Buffer.from(shot.data, "base64")
    )
  }
  await click("Close")
  await evaluate("window.empty=true;window.mount()")
  await waitText("No current subjects")
  await click("Academic record")
  await waitText("REG-001")
  await waitText("No semester progression recorded")
  await evaluate("window.empty=false;window.denied=true;window.mount()")
  await waitText("Portal access revoked")
  assert(
    !(await evaluate("document.body.textContent.includes('REG-001')")),
    "Revoked portal showed cached personal records"
  )
  assert.equal(await evaluate("window.logoutCache()"), 0)
  console.log(
    "Passed: student sections, current/history separation, marks and missing evidence, feedback, attendance pagination, own-only API calls, mobile/desktop overflow, empty profile, revoked access and cache clearing."
  )
} finally {
  socket?.close()
  browser.kill()
  await server.close()
}
