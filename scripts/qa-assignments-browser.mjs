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
  server: { host: "127.0.0.1", port: 3200, strictPort: true },
  plugins: [
    {
      name: "export-check",
      configureServer(server) {
        server.middlewares.use("/export-check", (_req, res) => {
          res.setHeader("Content-Type", "text/html")
          res.end(
            `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/src/index.css"></head><body><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import '/scripts/qa/assignment-harness.jsx';</script></body></html>`
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
    "--remote-debugging-port=9240",
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
      targets = await (await fetch("http://127.0.0.1:9240/json")).json()
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
  const browserErrors = []
  socket.addEventListener("message", (e) => {
    const m = JSON.parse(e.data)
    if (m.method === "Runtime.exceptionThrown")
      browserErrors.push(m.params.exceptionDetails)
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
  await send("Runtime.enable")
  await send("Page.navigate", { url: "http://127.0.0.1:3200/export-check" })
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
      `Missing assignment text: ${text}; body=${await evaluate("document.body.textContent")}; errors=${JSON.stringify(browserErrors)}`
    )
  }
  const input = async (id, value) =>
    evaluate(`(() => {
    const input = document.getElementById(${JSON.stringify(id)})
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)})
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  const tool = async (label) => {
    await evaluate(
      `document.querySelector('button[aria-label="${label}"]').click()`
    )
    await pause(80)
  }
  const enter = async () => {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    })
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    })
  }
  await waitText("Add assignment")
  await click("Add assignment")
  await waitText("Task description")
  await input("assignment-title", "Tree project")
  await tool("Heading")
  await send("Input.insertText", { text: "Build a tree" })
  await enter()
  await tool("Bold")
  await send("Input.insertText", { text: "Use the provided data." })
  await tool("Bold")
  await enter()
  await tool("Bullet list")
  await send("Input.insertText", { text: "Draw each step" })
  await enter()
  await enter()
  await tool("Numbered list")
  await send("Input.insertText", { text: "Explain complexity" })
  await evaluate("window.chooseFiles()")
  await waitText("task.pdf")
  await waitText("example.txt")
  for (const width of [320, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 950,
      deviceScaleFactor: 1,
      mobile: width < 500,
    })
    await pause(200)
    assert(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth + 1"
      ),
      `Editor overflow at ${width}px`
    )
    const shot = await send("Page.captureScreenshot", { format: "png" })
    await writeFile(
      join(tmpdir(), `spas-assignment-editor-${width}.png`),
      Buffer.from(shot.data, "base64")
    )
  }
  await evaluate("window.rejectSave=true")
  await click("Create")
  await waitText("Due date cannot fall before the assigned date.")
  assert(
    await evaluate(
      `document.getElementById('assignment-title').value==='Tree project'`
    )
  )
  assert(await evaluate(`document.body.textContent.includes('task.pdf')`))
  const description = await evaluate("window.writes[0].description")
  const nodes = []
  const visit = (node) => {
    nodes.push(node)
    node.content?.forEach(visit)
  }
  visit(description)
  assert(
    nodes.some((node) => node.type === "heading" && node.attrs.level === 2)
  )
  assert(nodes.some((node) => node.marks?.some((mark) => mark.type === "bold")))
  assert(nodes.some((node) => node.type === "bulletList"))
  assert(nodes.some((node) => node.type === "orderedList"))
  await writeFile(
    join(tmpdir(), "spas-assignment-editor-document.json"),
    JSON.stringify(description)
  )
  await evaluate("window.rejectSave=false")
  await click("Create")
  await waitText("View assignment")
  assert(
    !(await evaluate(`Boolean(document.getElementById('assignment-title'))`)),
    "Successful save did not close form"
  )
  assert.deepEqual(
    await evaluate("window.writes.at(-1).files.map(file=>file.name)"),
    ["task.pdf", "example.txt"]
  )
  await click("View assignment")
  await waitText("Task instructions and resources")
  assert(
    await evaluate(
      `document.querySelector('[aria-label="Task instructions"] h2').textContent==='Build a tree'`
    )
  )
  assert(
    await evaluate(
      `document.querySelector('[aria-label="Task instructions"] strong').textContent==='Use the provided data.'`
    )
  )
  await evaluate(
    `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('task.pdf')).click()`
  )
  await pause(200)
  assert(
    await evaluate(
      `window.requests.some(request=>request.url.includes('/assignments/7/attachments/'))`
    )
  )
  await click("Close")
  await click("Edit")
  await waitText("Edit Assignment")
  await waitText("Task description")
  assert(
    await evaluate(
      `document.querySelector('[aria-label="Task description"] h2').textContent==='Build a tree'`
    )
  )
  await evaluate(
    `document.querySelector('button[aria-label="Remove task.pdf"]').click()`
  )
  await evaluate(`window.chooseFiles(['updated.txt'])`)
  await input("edit-assignment-title", "Revised tree project")
  await click("Save changes")
  await waitText("Revised tree project")
  assert.deepEqual(
    await evaluate("window.task.attachments.map(file=>file.name)"),
    ["example.txt", "updated.txt"]
  )
  assert.equal((await evaluate("window.writes.at(-1).removes")).length, 1)
  await click("Update statuses")
  await waitText("Student Thapa")
  assert(
    await evaluate(
      `document.body.textContent.includes('PARTIAL') || document.body.textContent.includes('Partial')`
    ),
    "Manual evaluation unavailable"
  )
  await click("All done")
  await click("Save")
  await pause(250)
  assert.deepEqual(await evaluate("window.manualEntries"), [
    { enrollment: 41, status: "DONE" },
  ])
  await click("Close")
  await evaluate("window.mount(true)")
  await waitText("Current subjects")
  await click("Assignments")
  await waitText("Ongoing assignments")
  await waitText("Revised tree project")
  assert(
    !(await evaluate(`document.body.textContent.includes('Historical task')`))
  )
  await click("All assignments")
  await waitText("Historical task")
  await click("Ongoing assignments")
  await click("View assignment details")
  await waitText("Task instructions and resources")
  await waitText("Finish the final example")
  assert(
    await evaluate(
      `document.querySelector('[aria-label="Task instructions"] ol').textContent.includes('Explain complexity')`
    )
  )
  assert(
    !(await evaluate(`document.querySelector('input[type="file"]')`)),
    "Student submission control was exposed"
  )
  await evaluate(
    `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('updated.txt')).click()`
  )
  await pause(200)
  assert(
    await evaluate(
      `window.requests.some(request=>request.url.includes('/student-portal/assignments/7/attachments/'))`
    )
  )
  assert(
    await evaluate(
      `window.requests.every(request=>request.url.includes('/student-portal/') && request.method==='get')`
    ),
    "Student used a staff or write endpoint"
  )
  for (const width of [320, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 950,
      deviceScaleFactor: 1,
      mobile: width < 500,
    })
    await pause(200)
    assert(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth + 1"
      ),
      `Assignment details overflow at ${width}px`
    )
    const shot = await send("Page.captureScreenshot", { format: "png" })
    await writeFile(
      join(tmpdir(), `spas-assignment-student-${width}.png`),
      Buffer.from(shot.data, "base64")
    )
  }
  console.log(
    "Passed: basic editor formats, multipart attachment upload, failed-save retention, create/edit, resource downloads, manual evaluation, student ongoing/history details, own-only read APIs and mobile/desktop layout."
  )
} finally {
  socket?.close()
  browser.kill()
  await server.close()
}
