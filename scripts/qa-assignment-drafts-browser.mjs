/* global process, Buffer */
import { createServer } from "vite"
import { createServer as createHttpServer } from "node:http"
import { spawn } from "node:child_process"
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import assert from "node:assert/strict"

const root = fileURLToPath(new URL("../", import.meta.url))
const backendRoot =
  process.env.SPAS_BACKEND_DIR || resolve(root, "../ims-backend")
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
let scenario = "success"
const gatewayCalls = []
const gateway = createHttpServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const payload = JSON.parse(Buffer.concat(chunks).toString())
  assert.equal(req.url, "/v1/responses")
  assert.equal(req.headers.authorization, "Bearer e2e-gateway-only-key")
  gatewayCalls.push(payload)
  const mode = scenario
  if (mode === "timeout" || mode === "slow")
    await pause(mode === "timeout" ? 400 : 150)
  if (res.destroyed) return
  res.setHeader("Content-Type", "application/json")
  if (mode === "error") {
    res.writeHead(503).end(JSON.stringify({ error: "Private upstream detail" }))
    return
  }
  const context = JSON.parse(payload.input)
  const draft = {
    title: "Binary search tree practice",
    instructions: ["Implement a binary search tree and explain the design."],
    practice_questions: Array.from(
      { length: context.question_count },
      (_, index) => `Question ${index + 1}: Explain a tree operation.`
    ),
    evaluation_criteria: ["Correct operations", "Clear reasoning"],
  }
  res.end(
    JSON.stringify({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            mode === "refusal"
              ? { type: "refusal", refusal: "Private refusal text" }
              : { type: "output_text", text: JSON.stringify(draft) },
          ],
        },
      ],
    })
  )
})
await new Promise((resolve) => gateway.listen(0, "127.0.0.1", resolve))
const backend = spawn(
  join(backendRoot, "venv/bin/python"),
  [join(backendRoot, "scripts/assignment_draft_e2e.py")],
  {
    cwd: backendRoot,
    env: {
      ...process.env,
      SPAS_E2E_GATEWAY_URL: `http://127.0.0.1:${gateway.address().port}/v1/responses`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
)
let backendLog = ""
backend.stderr.on("data", (data) => {
  backendLog = (backendLog + data).slice(-10000)
})
let fixture, server, browser, socket, profile
try {
  fixture = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`E2E backend startup timed out. ${backendLog}`)),
      90000
    )
    let buffer = ""
    backend.stdout.on("data", (data) => {
      buffer += data.toString()
      const lines = buffer.split("\n")
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('{"ready":')) continue
        clearTimeout(timeout)
        resolve(JSON.parse(line))
      }
    })
    backend.once("exit", (code) => {
      clearTimeout(timeout)
      reject(new Error(`E2E backend exited (${code}). ${backendLog}`))
    })
  })
  server = await createServer({
    root,
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(
        `http://draft-e2e.localhost:${fixture.port}/api/v1/internal/`
      ),
    },
    server: { host: "127.0.0.1", port: 0, strictPort: false },
    plugins: [
      {
        name: "assignment-draft-e2e",
        configureServer(vite) {
          vite.middlewares.use("/draft-e2e", (_req, res) => {
            res.setHeader("Content-Type", "text/html")
            res.end(
              `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/src/index.css"></head><body><div id="root"></div><script>window.fixture=${JSON.stringify(fixture)}</script><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import '/scripts/qa/assignment-draft-harness.jsx';</script></body></html>`
            )
          })
        },
      },
    ],
  })
  await server.listen()
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  assert.equal((await fetch(`${origin}/draft-e2e`)).status, 200)
  profile = await mkdtemp(join(tmpdir(), "spas-draft-chrome-"))
  browser = spawn(
    process.env.CHROME_BIN ||
      (process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "google-chrome"),
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  )
  let port
  for (let i = 0; i < 100; i++) {
    try {
      port = Number(
        (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split(
          "\n"
        )[0]
      )
      break
    } catch {
      await pause(100)
    }
  }
  assert(port, "Chrome did not start")
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  socket = new WebSocket(
    targets.find((target) => target.type === "page").webSocketDebuggerUrl
  )
  await new Promise((resolve) =>
    socket.addEventListener("open", resolve, { once: true })
  )
  let sequence = 0
  const pending = new Map()
  const errors = []
  let canceled = 0
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails)
    if (message.method === "Network.loadingFailed" && message.params.canceled)
      canceled++
    if (pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence
      pending.set(id, (message) =>
        message.error
          ? reject(new Error(JSON.stringify(message.error)))
          : resolve(message.result)
      )
      socket.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails)
      throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const wait = async (expression, label = expression) => {
    for (let i = 0; i < 150; i++) {
      if (await evaluate(expression)) return
      await pause(100)
    }
    throw new Error(
      `Timed out: ${label}; body=${await evaluate("document.body.textContent")}; browser=${JSON.stringify(errors)}; backend=${backendLog}`
    )
  }
  const waitText = (text) =>
    wait(`document.body.textContent.includes(${JSON.stringify(text)})`)
  const click = async (text) => {
    assert(
      await evaluate(
        `(() => {const button=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===${JSON.stringify(text)}); if (!button || button.disabled) return false; button.click(); return true})()`
      ),
      `Button unavailable: ${text}`
    )
    await pause(60)
  }
  const input = async (id, value) => {
    await evaluate(
      `(() => {const element=document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(element.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(element, ${JSON.stringify(String(value))}); element.dispatchEvent(new Event('input', {bubbles:true}))})()`
    )
    await pause(30)
  }
  const count = () =>
    evaluate(
      "window.api('performance-mod/assignments').then(result=>result.data.count)"
    )
  await send("Runtime.enable")
  await send("Network.enable")
  await send("Page.navigate", { url: `${origin}/draft-e2e` })
  await wait("window.ready===true")
  await waitText("Add assignment")
  assert.equal(await count(), 0)
  assert.equal(
    await evaluate(`window.checkOtherTeacher(${fixture.allocation})`),
    404
  )
  await click("Add assignment")
  await click("Draft with AI")
  assert(
    await evaluate(
      "[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Generate draft').disabled"
    )
  )
  await input("assignment-title", "Teacher title")
  await input("assignment-draft-topic", "Binary search trees")
  await input(
    "assignment-draft-objective",
    "Implement insertion and explain complexity."
  )
  await input("assignment-draft-count", 0)
  assert(
    await evaluate(
      "[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Generate draft').disabled"
    )
  )
  await input("assignment-draft-count", 3)
  await evaluate("window.chooseFile()")
  await waitText("resource.txt")
  for (const [mode, expected] of [
    ["refusal", "Revise the topic"],
    ["error", "drafting is unavailable"],
    ["timeout", "generation timed out"],
  ]) {
    scenario = mode
    await click("Generate draft")
    await waitText(expected)
    assert.equal(
      await evaluate("document.getElementById('assignment-draft-topic').value"),
      "Binary search trees"
    )
    assert.equal(
      await evaluate("document.getElementById('assignment-title').value"),
      "Teacher title"
    )
    assert.equal(await count(), 0)
    assert(
      !(await evaluate(
        "document.body.textContent.includes('Private upstream') || document.body.textContent.includes('Private refusal')"
      ))
    )
  }
  scenario = "success"
  await click("Generate draft")
  await waitText("AI draft · Review before use")
  assert.equal(await count(), 0)
  assert.equal(
    await evaluate("document.getElementById('assignment-title').value"),
    "Teacher title"
  )
  assert.equal(gatewayCalls.length, 4)
  assert.equal(gatewayCalls.at(-1).store, false)
  assert.deepEqual(
    Object.keys(JSON.parse(gatewayCalls.at(-1).input)).sort(),
    [
      "difficulty",
      "learning_objective",
      "question_count",
      "semester",
      "subject",
      "topic",
    ].sort()
  )
  for (const width of [320, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 950,
      deviceScaleFactor: 1,
      mobile: width < 500,
    })
    await pause(100)
    assert(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth + 1"
      ),
      `Page overflow at ${width}px`
    )
    assert(
      await evaluate(
        "(() => {const dialog=document.querySelector('[role=dialog]'); return dialog.scrollWidth<=dialog.clientWidth+1})()"
      ),
      `Dialog overflow at ${width}px`
    )
    const screenshot = await send("Page.captureScreenshot", { format: "png" })
    await writeFile(
      join(tmpdir(), `spas-ai-draft-preview-${width}.png`),
      Buffer.from(screenshot.data, "base64")
    )
  }
  await click("Replace title and instructions")
  assert.equal(
    await evaluate("document.getElementById('assignment-title').value"),
    "Binary search tree practice"
  )
  await wait(
    "document.querySelector('[aria-label=\"Task description\"]')?.textContent.includes('Question 3')"
  )
  await input("assignment-title", "Teacher-reviewed tree practice")
  await evaluate(
    "(() => {const editor=document.querySelector('[aria-label=\"Task description\"]'); editor.focus(); const range=document.createRange(); range.selectNodeContents(editor); range.collapse(false); const selection=window.getSelection(); selection.removeAllRanges(); selection.addRange(range)})()"
  )
  await send("Input.insertText", { text: " Teacher-reviewed note." })
  await click("Create")
  await wait("!document.getElementById('assignment-title')")
  await waitText("Teacher-reviewed tree practice")
  assert.equal(await count(), 1)
  const saved = await evaluate(
    "window.api('performance-mod/assignments').then(result=>window.api('performance-mod/assignments/'+result.data.results[0].id)).then(result=>result.data)"
  )
  assert.equal(saved.title, "Teacher-reviewed tree practice")
  assert(JSON.stringify(saved.description).includes("Teacher-reviewed note."))
  assert.equal(saved.attachments[0].name, "resource.txt")
  await click("Edit")
  await waitText("Edit Assignment")
  assert(
    !(await evaluate("document.body.textContent.includes('Draft with AI')")),
    "Draft controls exposed on editing"
  )
  await click("Cancel")
  await click("Add assignment")
  await click("Draft with AI")
  await input("assignment-draft-topic", "Cancelable draft")
  await input("assignment-draft-objective", "Explain a tree.")
  scenario = "slow"
  await click("Generate draft")
  assert(
    await evaluate(
      "[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Create').disabled"
    )
  )
  await click("Cancel")
  await pause(300)
  assert(canceled > 0, "Closing the form did not abort its HTTP request")
  assert.equal(await count(), 1)
  scenario = "success"
  await click("Add assignment")
  await click("Draft with AI")
  await input("assignment-draft-topic", "Retry after limit")
  await input("assignment-draft-objective", "Explain a tree.")
  await click("Generate draft")
  await waitText("throttled")
  assert.equal(gatewayCalls.length, 5)
  assert.equal(await count(), 1)
  assert.equal(errors.length, 0, JSON.stringify(errors))
  console.log(
    "Passed E2E: real Django/PostgreSQL login and ownership, input validation, Gateway refusal/503/timeout, unsaved preview, 320/1280px layouts, explicit use, editable rich text, attachment retention, persisted save, edit restrictions, cancellation, and request throttling. Gateway responses used a local HTTP stand-in; no live model calls."
  )
} finally {
  socket?.close()
  browser?.kill()
  await server?.close()
  backend.kill("SIGTERM")
  if (backend.exitCode === null)
    await Promise.race([
      new Promise((resolve) => backend.once("exit", resolve)),
      pause(10000),
    ])
  if (backend.exitCode === null) backend.kill("SIGKILL")
  gateway.closeAllConnections()
  await new Promise((resolve) => gateway.close(resolve))
  if (profile)
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    })
}
