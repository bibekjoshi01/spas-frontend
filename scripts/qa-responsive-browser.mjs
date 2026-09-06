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
            `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/src/index.css"></head><body><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import '/scripts/qa/responsive-harness.jsx';</script></body></html>`
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
  const paths = [
    "/login",
    "/404",
    "/student",
    "/dashboard",
    "/academics/departments",
    "/academics/programs",
    "/academics/batches",
    "/academics/subjects",
    "/academics/allocations",
    "/people/accounts",
    "/people/students",
    "/classes",
    "/classes/1",
    "/attendance/1/2026-09-04",
    "/attendance?class=1",
    "/roster?class=1",
    "/assessments?class=1",
    "/assignments?class=1",
    "/class-performance?class=1",
    "/reports/attendance",
    "/reports/batch-performance",
    "/attention",
    "/audit",
    "/settings/performance",
    "/academics/calendar",
    "/qa-controls",
  ]
  const failures = []
  for (const width of process.env.QA_INTERACTIONS_ONLY
    ? []
    : [320, 390, 768, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: width < 768,
    })
    for (const path of paths) {
      await evaluate(`window.mountResponsive(${JSON.stringify(path)})`)
      await pause(450)
      const result = await evaluate(
        `({renderError:!!document.querySelector("[data-qa-error]"),width:document.documentElement.scrollWidth,text:document.body.innerText.slice(-250),bad:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1&&!e.closest('[data-slot="table-container"],nav')}).slice(0,6).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))})`
      )
      if (result.width > width + 1 || !result.text || result.renderError)
        failures.push({ viewport: width, path, ...result })
    }
  }
  assert.deepEqual(failures, [], JSON.stringify(failures, null, 2))
  if (!process.env.QA_INTERACTIONS_ONLY)
    console.log(
      `Passed: ${paths.length} pages at 320, 390, 768, and 1280px without page overflow.`
    )
  const click = async (text) => {
    assert(
      await evaluate(
        `Boolean([...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}))`
      ),
      `Missing button: ${text}`
    )
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`
    )
    await pause(250)
  }
  const screenshot = async (name) => {
    const shot = await send("Page.captureScreenshot", { format: "png" })
    await writeFile(
      join(tmpdir(), `spas-ui-${name}.png`),
      Buffer.from(shot.data, "base64")
    )
  }
  const viewport = async (width, height = 844) =>
    send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    })
  await viewport(390)
  await evaluate(`window.mountResponsive('/academics/departments')`)
  await pause(450)
  await screenshot("departments-mobile")
  assert(
    await evaluate(
      `!!document.querySelector('[data-slot="table-container"][tabindex="0"]')`
    )
  )
  await evaluate(
    `document.querySelector('[data-slot="table-container"]').focus()`
  )
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "ArrowRight",
    code: "ArrowRight",
    windowsVirtualKeyCode: 39,
  })
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "ArrowRight",
    code: "ArrowRight",
    windowsVirtualKeyCode: 39,
  })
  await pause(200)
  assert(
    await evaluate(
      `document.querySelector('[data-slot="table-container"]').scrollLeft>0`
    ),
    "Table cannot be scrolled by keyboard"
  )
  await evaluate(`document.querySelector('[aria-label="Next page"]').click()`)
  await pause(300)
  assert(
    await evaluate(
      `window.requests.filter(r=>r.url.endsWith('/departments')).at(-1).params.offset===10`
    )
  )
  await evaluate(
    `const input=document.querySelector('input[aria-label="Search departments"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Computer');input.dispatchEvent(new Event('input',{bubbles:true}))`
  )
  await pause(300)
  assert(
    await evaluate(
      `window.requests.filter(r=>r.url.endsWith('/departments')).at(-1).params.offset===0`
    ),
    "Search did not reset pagination"
  )
  await evaluate(
    `document.querySelector('[aria-label="Filter by status"]').click()`
  )
  await pause(200)
  await evaluate(`document.querySelector('[role="option"]').click()`)
  await pause(200)
  await click("Clear filters")
  assert(
    await evaluate(
      `!window.requests.filter(r=>r.url.endsWith('/departments')).at(-1).params.is_active`
    )
  )
  await viewport(320, 568)
  await evaluate(`window.mountResponsive('/qa-controls')`)
  await pause(350)
  await evaluate(`document.querySelector('[aria-label="Subject"]').click()`)
  await pause(300)
  assert(
    await evaluate(
      `(()=>{const r=document.querySelector('[data-slot="select-content"]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()`
    ),
    "Select menu escapes viewport"
  )
  await screenshot("select-mobile")
  await evaluate(`document.querySelector('[role="option"]').click()`)
  await pause(200)
  assert(
    await evaluate(`document.documentElement.scrollWidth<=innerWidth`),
    "Long selected text overflows page"
  )
  await evaluate(`document.querySelector('[aria-label="Program"]').click()`)
  await pause(250)
  assert(
    await evaluate(`document.activeElement.tagName==='INPUT'`),
    "Combobox search is not focused"
  )
  await evaluate(
    `const comboInput=document.activeElement;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(comboInput,'39 ');comboInput.dispatchEvent(new Event('input',{bubbles:true}))`
  )
  await pause(200)
  assert.equal(
    await evaluate(`document.querySelectorAll('[role="option"]').length`),
    1
  )
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  })
  await pause(250)
  assert(
    await evaluate(
      `document.querySelector('[aria-label="Program"]').textContent.includes('39 ')`
    )
  )
  await click("Open long form")
  assert(
    await evaluate(
      `(()=>{const d=document.querySelector('[role="dialog"]');const r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1&&d.scrollHeight>d.clientHeight})()`
    ),
    "Long form cannot scroll within viewport"
  )
  await screenshot("form-mobile")
  await evaluate(`document.querySelector('[role="dialog"]').scrollTop=99999`)
  await pause(200)
  assert(
    await evaluate(
      `(()=>{const r=document.querySelector('button[type="submit"]').getBoundingClientRect();return r.top>0&&r.bottom<=innerHeight})()`
    ),
    "Form submit is unreachable"
  )
  await click("Cancel")
  await viewport(390, 320)
  await evaluate(`document.querySelector('[aria-label="Program"]').click()`)
  await pause(250)
  assert(
    await evaluate(
      `(()=>{const list=document.querySelector('[role="listbox"]');const r=list.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&list.scrollHeight>list.clientHeight})()`
    ),
    "Combobox list is clipped on short viewport"
  )
  await evaluate(`document.querySelector('[role="listbox"]').scrollTop=99999`)
  await pause(150)
  assert(
    await evaluate(
      `(()=>{const r=[...document.querySelectorAll('[role="option"]')].at(-1).getBoundingClientRect();return r.bottom<=innerHeight})()`
    ),
    "Last option is unreachable"
  )
  await viewport(390)
  for (const path of ["/classes", "/attendance?class=1", "/student"]) {
    await evaluate(`window.mountResponsive(${JSON.stringify(path)})`)
    await pause(350)
    await screenshot(path.split("?")[0].slice(1))
  }
  for (const mode of ["empty", "error"]) {
    await evaluate(
      `window.fixtureMode=${JSON.stringify(mode)};window.mountResponsive('/academics/departments')`
    )
    await pause(350)
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`))
    assert(
      await evaluate(
        `document.body.textContent.includes(${JSON.stringify(mode === "empty" ? "No departments" : "Try again")})`
      )
    )
  }
  console.log(
    "Passed: keyboard table scrolling, pagination reset on search, clear filters, long select labels, searchable dropdown keyboard selection, short viewport scrolling, long forms, empty/error states."
  )
} finally {
  socket?.close()
  browser.kill()
  await server.close()
}
