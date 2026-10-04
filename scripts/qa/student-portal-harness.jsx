import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import axios, { AxiosError } from "axios"
import Cookies from "js-cookie"

window.requests = []
const subject = {
  enrollment: 41,
  batchSemester: 3,
  semester: 3,
  semesterStatus: "RUNNING",
  isRetake: false,
  isActive: true,
  class: {
    id: 11,
    allocation: 11,
    subjectId: 7,
    code: "CSC201",
    name: "Data Structures",
    creditHours: 3,
    program: "B.Sc. CSIT",
    programCode: "BSCCSIT",
    semester: 3,
    semesterStatus: "RUNNING",
    semesterStartDate: "2026-01-01",
    semesterEndDate: null,
    batchYear: 2079,
    startTime: null,
    endTime: null,
    teacher: { fullName: "Test Teacher" },
    meetings: [{ weekday: 1, startTime: "10:00:00", endTime: "11:00:00" }],
  },
  attendance: {
    held: 12,
    present: 8,
    late: 1,
    absent: 1,
    excused: 1,
    unmarked: 1,
    percentage: 75,
    eligible: true,
  },
  assessments: [
    {
      examId: 1,
      title: "Zero score exam",
      examType: "UNIT_TEST",
      examDate: "2026-01-09",
      fullMarks: 10,
      passMarks: 4,
      marksObtained: "0.00",
      isAbsent: false,
      result: "FAIL",
    },
    {
      examId: 2,
      title: "Pending score exam",
      examType: "FIRST_TERM",
      examDate: "2026-10-12",
      fullMarks: 50,
      passMarks: 20,
      marksObtained: null,
      isAbsent: false,
      result: "NOT_RECORDED",
    },
    {
      examId: 3,
      title: "Absent exam",
      examType: "OTHER",
      examDate: "2026-01-09",
      fullMarks: 10,
      passMarks: null,
      marksObtained: null,
      isAbsent: true,
      result: "ABSENT",
    },
  ],
  assignments: [
    {
      assignmentId: 1,
      title: "Tree project",
      assignedDate: "2026-01-09",
      dueDate: "2026-10-03",
      status: "PARTIAL",
      remarks: "Finish your own diagrams",
    },
  ],
  classPerformance: {
    score: 8,
    remarks: "Good progress",
    updatedAt: "2026-10-02T10:00:00Z",
  },
  performancePercentage: 55,
}
const overview = {
  asOfDate: "2026-10-04",
  student: {
    id: 9,
    firstName: "Student",
    middleName: "",
    lastName: "Thapa",
    fullName: "Student Thapa",
    rollNumber: "01",
    registrationNumber: "REG-001",
    departmentName: "Computer Science",
    programName: "B.Sc. CSIT",
    programCode: "BSCCSIT",
    batchYear: 2079,
    status: "STUDYING",
    gender: "",
    dateOfBirth: null,
    email: "student@example.invalid",
    phoneNo: "",
    alternatePhoneNo: "",
  },
  semesters: [
    {
      id: 1,
      batchSemester: 3,
      semester: 3,
      semesterStatus: "RUNNING",
      batchYear: 2079,
      status: "ACTIVE",
      isActive: true,
      startDate: "2026-01-01",
      endDate: null,
    },
  ],
  subjects: [
    subject,
    {
      ...subject,
      enrollment: 42,
      batchSemester: 2,
      semester: 2,
      semesterStatus: "COMPLETED",
      class: { ...subject.class, code: "CSC101", name: "Historical Class" },
      attendance: { ...subject.attendance, percentage: 10, eligible: false },
      performancePercentage: 10,
    },
  ],
  policy: {
    attendanceWeight: 20,
    assessmentWeight: 40,
    assignmentWeight: 30,
    classPerformanceWeight: 10,
    attendanceEligibilityThreshold: "75.00",
    updatedAt: null,
  },
}
axios.defaults.adapter = async (config) => {
  window.requests.push(config.url)
  const response = (data, status = 200) => ({
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
  })
  if (window.denied)
    throw new AxiosError(
      "Portal access revoked",
      "ERR_BAD_REQUEST",
      config,
      undefined,
      response({ detail: "Portal access revoked" }, 403)
    )
  if (config.url.endsWith("/overview"))
    return response(
      window.empty ? { ...overview, subjects: [], semesters: [] } : overview
    )
  if (config.url.endsWith("/subjects/41")) return response(subject)
  if (config.url.endsWith("/subjects/41/attendance")) {
    const offset = Number(config.params?.offset || 0)
    return response({
      count: 12,
      previous: offset ? "previous" : null,
      next: offset ? null : "next",
      results: Array.from({ length: offset ? 2 : 10 }, (_, index) => ({
        id: offset + index + 1,
        date: "2026-01-09",
        period: 1,
        status: index === 0 ? null : "PRESENT",
        excuseReason: "",
      })),
    })
  }
  throw new Error(`Unexpected portal request: ${config.url}`)
}
localStorage.clear()
Cookies.set("access", "test-student-access")
Cookies.set("refresh", "test-student-refresh")
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
const { default: StudentDashboard } =
  await import("/src/pages/student/index.tsx")
const { rootAPI } = await import("/src/lib/redux/api-slice.ts")
const { logoutSuccess } = await import("/src/pages/auth/redux/auth.slice.ts")
let root
window.mount = () => {
  root?.unmount()
  store.dispatch(rootAPI.util.resetApiState())
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById("root"))
  root.render(
    <Provider store={store}>
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    </Provider>
  )
}
window.logoutCache = () => {
  store.dispatch(logoutSuccess())
  return Object.keys(store.getState()[rootAPI.reducerPath].queries).length
}
window.mount()
window.ready = true
