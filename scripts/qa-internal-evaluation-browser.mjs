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
  server: { host: "127.0.0.1", port: 3198, strictPort: true },
  plugins: [
    {
      name: "export-check",
      configureServer(server) {
        server.middlewares.use("/export-check", (_req, res) => {
          res.setHeader("Content-Type", "text/html")
          res.end(
            `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/src/index.css"></head><body><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import '/scripts/qa/internal-evaluation-harness.jsx';</script></body></html>`
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
  await send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: profile,
  })
  await send("Page.navigate", { url: "http://127.0.0.1:3198/export-check" })
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
    throw new Error(
      `Missing evaluation text: ${text}. Page: ${await evaluate("document.body.textContent")} Buttons: ${await evaluate('JSON.stringify(Array.from(document.querySelectorAll("button")).map(b=>({text:b.textContent,disabled:b.disabled})))')}`
    )
  }

  await click("Internal evaluation sheet")
  await waitText("Assignments: 1 unevaluated assignment(s).")
  assert(
    await evaluate(
      "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Download calculated sheet')).disabled"
    )
  )
  assert(
    await evaluate(
      "!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Download blank sheet')).disabled"
    )
  )
  await click("Download blank sheet")
  await pause(300)
  assert(
    await evaluate(
      "window.requests.some(r=>r.url.endsWith('/pdf') && r.params.mode==='blank' && r.authorization==='Bearer qa-evaluation-access')"
    )
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
      join(tmpdir(), `spas-internal-evaluation-${width}.png`),
      Buffer.from(shot.data, "base64")
    )
  }
  await evaluate("window.scenario='complete';window.mount()")
  await click("Internal evaluation sheet")
  await waitText("Full marks: 40")
  assert(
    await evaluate(
      "!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Download calculated sheet')).disabled"
    )
  )
  // The actual download must surface a server rejection even after a valid preview.
  await evaluate("window.scenario='changed'")
  await click("Download calculated sheet")
  await waitText("01: Assessments: 1 unmarked assessment(s).")
  await evaluate("window.scenario='setup';window.mount()")
  await click("Internal evaluation sheet")
  await waitText("An administrator must add institution details in Settings.")
  assert(
    await evaluate(
      "Array.from(document.querySelectorAll('button')).filter(b=>b.textContent.includes('Download ') && b.textContent.includes('sheet')).every(b=>b.disabled)"
    )
  )
  await evaluate("window.mount('evaluation', false)")
  await pause(200)
  assert(
    !(await evaluate(
      "document.body.textContent.includes('Internal evaluation sheet')"
    ))
  )
  await evaluate("window.mount('institution')")
  await waitText("Thapathali Campus")
  await click("Edit details")
  await waitText("Edit institution details")
  await evaluate(
    "(()=>{const input=document.querySelector('#institution-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Updated Campus');input.dispatchEvent(new Event('input',{bubbles:true}))})()"
  )
  await click("Save")
  await waitText("Updated Campus")
  await click("Archive details")
  await waitText("Archive institution details?")
  await click("Archive")
  await waitText("Add institution")
  await click("Add institution")
  await waitText("Add institution details")
  for (const [id, value] of [
    ["name", "New Campus"],
    ["universityName", "University"],
  ]) {
    await evaluate(
      `(()=>{const input=document.querySelector('#institution-${id}');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`
    )
  }
  await click("Save")
  await waitText("New Campus")
  console.log(
    "Passed: incomplete/setup states, permission gating, authenticated blank download, stale-final rejection, institution create/edit/archive, mobile and desktop overflow."
  )
} finally {
  socket?.close()
  browser.kill()
  await server.close()
}
