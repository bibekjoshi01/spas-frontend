import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import axios, { AxiosError } from "axios"
import Cookies from "js-cookie"

window.requests = []
window.writes = []
const classSummary = {
  id: 11,
  allocation: 11,
  subjectId: 7,
  code: "CSC201",
  name: "Data Structures",
  semester: 3,
  semesterStatus: "RUNNING",
  program: "B.Sc. CSIT",
  programCode: "BSCCSIT",
  batchYear: 2082,
  meetings: [],
  studentCount: 2,
  classesHeld: 0,
  attendancePercentage: 0,
  teacher: { fullName: "Test Teacher" },
}
const metadata = (task) => ({
  assignmentId: task.id,
  title: task.title,
  assignedDate: task.assignedDate,
  dueDate: task.dueDate,
  status: "PARTIAL",
  remarks: "Finish the final example",
})
axios.defaults.adapter = async (config) => {
  window.requests.push({ url: config.url, method: config.method })
  const response = (data, status = 200) => ({
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
  })
  if (config.url.endsWith("/analytics/classes")) return response([classSummary])
  if (config.url.endsWith("/performance-weights"))
    return response({ attendanceEligibilityThreshold: "75" })
  if (config.url.endsWith("/assignments") && config.method === "get")
    return response({
      count: window.task ? 1 : 0,
      results: window.task ? [window.task] : [],
    })
  if (
    config.url.endsWith("/assignments") ||
    (config.url.endsWith("/assignments/7") && config.method === "patch")
  ) {
    const data = config.data
    const description = JSON.parse(data.get("description"))
    const files = [...data.entries()]
      .filter(([key]) => key.startsWith("newFiles["))
      .map(([, file]) => ({ name: file.name, size: file.size }))
    const removes = [...data.entries()]
      .filter(([key]) => key.startsWith("removeAttachments["))
      .map(([, value]) => Number(value))
    window.writes.push({
      title: data.get("title"),
      description,
      files,
      removes,
    })
    if (window.rejectSave)
      throw new AxiosError(
        "Invalid due date",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        response(
          { dueDate: ["Due date cannot fall before the assigned date."] },
          400
        )
      )
    const existing = (window.task?.attachments ?? []).filter(
      (file) => !removes.includes(file.id)
    )
    window.task = {
      id: 7,
      uuid: "task",
      allocation: 11,
      subjectCode: "CSC201",
      isActive: true,
      title: data.get("title"),
      description,
      assignedDate: data.get("assignedDate"),
      dueDate: data.get("dueDate") || null,
      evaluatedCount: 1,
      doneCount: 0,
      attachments: [
        ...existing,
        ...files.map((file, index) => ({
          id: 20 + window.writes.length * 10 + index,
          ...file,
        })),
      ],
    }
    return response({ id: 7, message: "Assignment saved." })
  }
  if (config.url.includes("/attachments/")) {
    if (window.rejectDownload)
      throw new AxiosError(
        "Access revoked",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        response(
          new Blob(
            [JSON.stringify({ detail: "This attachment is unavailable." })],
            { type: "application/json" }
          ),
          404
        )
      )
    return response(
      new Blob(["resource bytes"], { type: "application/octet-stream" })
    )
  }
  if (config.url.endsWith("/student-portal/assignments/7"))
    return response({
      ...metadata(window.task),
      description: window.task.description,
      attachments: window.task.attachments,
      subjectCode: "CSC201",
      subjectName: "Data Structures",
      teacherName: "Test Teacher",
    })
  if (config.url.endsWith("/assignments/7")) return response(window.task)
  if (config.url.endsWith("/student-portal/overview")) {
    const subject = {
      enrollment: 41,
      batchSemester: 3,
      semester: 3,
      semesterStatus: "RUNNING",
      isActive: true,
      isRetake: false,
      class: classSummary,
      assignments: [metadata(window.task)],
      assessments: [],
      attendance: {
        held: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        unmarked: 0,
        percentage: null,
        eligible: null,
      },
      classPerformance: null,
      performancePercentage: null,
    }
    return response({
      asOfDate: "2026-10-06",
      student: {
        fullName: "Student Thapa",
        programName: "B.Sc. CSIT",
        rollNumber: "01",
      },
      policy: { attendanceEligibilityThreshold: "75" },
      semesters: [],
      subjects: [
        subject,
        {
          ...subject,
          enrollment: 42,
          semesterStatus: "COMPLETED",
          isActive: false,
          assignments: [
            {
              ...metadata(window.task),
              assignmentId: 8,
              title: "Historical task",
              status: "DONE",
            },
          ],
        },
      ],
    })
  }
  if (config.url.endsWith("/roster"))
    return response([
      {
        enrollment: 41,
        studentId: 9,
        fullName: "Student Thapa",
        rollNumber: "01",
        phoneNo: "",
      },
    ])
  if (config.url.endsWith("/submissions")) {
    if (config.method === "post") {
      window.manualEntries = JSON.parse(config.data).entries
      return response({ saved: 1, message: "Saved" })
    }
    return response([
      {
        id: 1,
        enrollment: 41,
        fullName: "Student Thapa",
        rollNumber: "01",
        status: "PARTIAL",
        remarks: "Finish the final example",
      },
    ])
  }
  throw new Error(`Unexpected assignment request: ${config.url}`)
}
localStorage.clear()
Cookies.set("access", "test-assignment-access")
Cookies.set("refresh", "test-assignment-refresh")
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
const { default: AssignmentsPage } =
  await import("/src/pages/assessments/assignments.tsx")
const { default: StudentDashboard } =
  await import("/src/pages/student/index.tsx")
let root
window.mount = (student = false) => {
  root?.unmount()
  store.dispatch(rootAPI.util.resetApiState())
  store.dispatch(
    setProfile({
      id: student ? 2 : 1,
      uuid: student ? "student" : "teacher",
      mustChangePassword: false,
      isSuperuser: false,
      roles: [{ codename: student ? "STUDENT" : "TEACHER" }],
      permissions: student
        ? []
        : [
            "view_attendance",
            "view_assignment",
            "add_assignment",
            "edit_assignment",
          ],
    })
  )
  window.requests = []
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById("root"))
  root.render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[student ? "/student" : "/assignments?class=11"]}
      >
        {student ? <StudentDashboard /> : <AssignmentsPage />}
      </MemoryRouter>
    </Provider>
  )
}
window.chooseFiles = (names = ["task.pdf", "example.txt"]) => {
  const input = document.querySelector('input[type="file"]')
  const files = new DataTransfer()
  names.forEach((name) =>
    files.items.add(new File(["assignment resource"], name))
  )
  input.files = files.files
  input.dispatchEvent(new Event("change", { bubbles: true }))
}
window.mount()
window.ready = true
