/* Browser-only fixture: all requests are handled locally; no college data is used. */
import { Suspense, useState } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import axios from "axios"
import { axiosInstance } from "@/lib/redux/axios"
import { ThemeProvider } from "@/components/theme-provider"
import LoginPage from "@/pages/auth/login"
import NotFoundPage from "@/pages/errors/page-not-found"
import MainLayout from "@/components/layout/main-layout"
import { privateRoutes } from "@/routes/route-config"
import { Combobox } from "@/components/ui/combobox"
import { FormDialog, Field } from "@/components/form-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

const longName =
  "Department of Computer Science and Information Technology — Advanced Research and Academic Administration"
const user = {
  id: 1,
  fullName: "Alexandra Chandrasekhar Sharma",
  firstName: "Alexandra",
  lastName: "Sharma",
  username: "alexandra.sharma",
  email: "alexandra.chandrasekhar.sharma@example.edu.np",
  roles: [],
  isActive: true,
  isSuperuser: true,
}
const department = {
  id: 1,
  uuid: "department",
  code: "CSIT",
  name: longName,
  head: user,
  isActive: true,
  programCount: 12,
}
const program = {
  id: 1,
  uuid: "program",
  code: "BSC-CSIT",
  name: longName,
  department,
  coordinator: user,
  totalSemesters: 8,
  isActive: true,
}
const batch = {
  id: 1,
  uuid: "batch",
  year: 2083,
  program,
  studentCount: 60,
  status: "RUNNING",
  isActive: true,
  graduatedOn: null,
}
const subject = {
  id: 1,
  uuid: "subject",
  code: "CSIT-401",
  name: longName,
  program,
  semester: 1,
  creditHours: 3,
  isElective: false,
  isActive: true,
}
const semester = {
  id: 1,
  uuid: "semester",
  batch,
  semester: 1,
  status: "RUNNING",
  isActive: true,
  startDate: null,
  endDate: null,
}
const allocation = {
  id: 1,
  uuid: "allocation",
  subject,
  teacher: user,
  batchSemester: semester,
  enrolledCount: 60,
  meetings: [],
  startTime: null,
  endTime: null,
  isActive: true,
}
const klass = {
  id: 1,
  allocation: 1,
  subjectId: 1,
  code: subject.code,
  name: longName,
  program: program.name,
  programCode: program.code,
  semester: 1,
  semesterStatus: "RUNNING",
  semesterStartDate: null,
  semesterEndDate: null,
  batchYear: 2083,
  teacher: user,
  studentCount: 60,
  classesHeld: 10,
  attendancePercentage: 82,
  meetings: [],
  trend: null,
}
const list = (rows) => ({
  count: rows.length,
  next: null,
  previous: null,
  results: rows,
})
const student = {
  ...user,
  uuid: "student",
  rollNumber: "2083-CSIT-001",
  registrationNumber: "TU-2083-0001",
  batch,
  status: "STUDYING",
  gender: "FEMALE",
  phoneNo: "9800000000",
  alternatePhoneNo: "",
}
const roster = {
  enrollment: 1,
  studentId: 1,
  rollNumber: student.rollNumber,
  registrationNumber: student.registrationNumber,
  fullName: user.fullName,
  email: user.email,
  phoneNo: student.phoneNo,
  isRetake: false,
  attendance: { held: 10, attended: 8, percentage: 80, recent: [] },
  internalMarks: { obtained: 80, total: 100 },
  assignments: { done: 2, total: 3 },
  classPerformance: { score: 8, scale: 10 },
  performancePercentage: 80,
}
const monthNames = [
  "वैशाख",
  "जेठ",
  "असार",
  "साउन",
  "भदौ",
  "असोज",
  "कात्तिक",
  "मंसिर",
  "पुस",
  "माघ",
  "फागुन",
  "चैत",
]
const calendar = {
  system: "BS",
  year: 2083,
  minYear: 2070,
  maxYear: 2090,
  weekendDays: [6],
  months: monthNames.map((nameNepali, index) => ({
    index: index + 1,
    name: `Month ${index + 1}`,
    nameNepali,
    days: Array.from({ length: 30 }, (_, i) => {
      const date = new Date(2026, index + 3, i + 14)
      return {
        date: date.toISOString().slice(0, 10),
        day: i + 1,
        dayLabel: String(i + 1),
        weekday: date.getDay() || 7,
        isWeekend: date.getDay() === 6,
        entries: [],
      }
    }),
  })),
}
window.requests = []
window.fixtureMode = "populated"
axiosInstance.defaults.adapter = async (config) => {
  window.requests.push({ url: config.url, params: config.params })
  const path = config.url.replace(/^.*\/api\/v1\/internal\//, "")
  if (window.fixtureMode === "error")
    throw new axios.AxiosError(
      "Fixture error",
      "ERR_BAD_RESPONSE",
      config,
      null,
      { status: 503, data: { message: "Please retry." }, config }
    )
  let data
  if (path.endsWith("analytics/classes")) data = [klass]
  else if (path.endsWith("analytics/classes/1/students")) data = [roster]
  else if (path.endsWith("settings/performance-weights"))
    data = {
      attendanceWeight: 25,
      classPerformanceWeight: 25,
      assignmentWeight: 25,
      assessmentWeight: 25,
      attendanceEligibilityThreshold: "75",
      updatedAt: "2026-09-06",
    }
  else if (path.endsWith("analytics/overview"))
    data = {
      experience: "MANAGEMENT",
      managementLevel: "CAMPUS",
      stats: {
        totalClasses: 10,
        totalStudents: 1234,
        avgAttendancePercentage: 82,
        studentsBelowEligibility: 12,
        classesRecordedToday: 0,
        classesTotalToday: 0,
      },
      pendingAttendanceCount: 0,
      todayAttendance: {
        sessionsRecorded: 0,
        classesRecorded: 0,
        activeClasses: 10,
        expectedClasses: 0,
        pendingClasses: 0,
        isTeachingDay: false,
        dayLabel: "Weekend",
        marked: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendancePercentage: 0,
        classesToReview: [],
      },
      todaysClasses: [],
      studentsNeedingAttention: [],
      workQueue: [],
      recentActivity: [],
    }
  else if (path.endsWith("student-portal/overview"))
    data = {
      student: {
        ...student,
        programName: program.name,
        programCode: program.code,
        departmentName: department.name,
        batchYear: 2083,
      },
      policy: {
        attendanceWeight: 25,
        classPerformanceWeight: 25,
        assignmentWeight: 25,
        assessmentWeight: 25,
        attendanceEligibilityThreshold: "75",
      },
      subjects: [
        {
          enrollment: 1,
          semester: 1,
          semesterStatus: "RUNNING",
          class: klass,
          attendance: {
            held: 10,
            present: 8,
            absent: 2,
            late: 0,
            excused: 0,
            percentage: 80,
            trend: null,
          },
          assessments: [],
          assignments: [],
          classPerformance: null,
        },
      ],
    }
  else if (path.endsWith("departments"))
    data =
      window.fixtureMode === "empty"
        ? list([])
        : { ...list([department]), count: 25 }
  else if (path.endsWith("programs")) data = list([program])
  else if (path.endsWith("batch-semesters")) data = list([semester])
  else if (path.endsWith("batches")) data = list([batch])
  else if (path.endsWith("subjects")) data = list([subject])
  else if (path.endsWith("subject-allocations")) data = list([allocation])
  else if (path.endsWith("users")) data = list([user])
  else if (path.endsWith("permissions")) data = []
  else if (path.endsWith("roles")) data = list([])
  else if (path.endsWith("students")) data = list([student])
  else if (path.endsWith("roster")) data = [roster]
  else if (path.endsWith("class-performance"))
    data = [{ ...roster, score: 8, remarks: "Consistent participation" }]
  else if (path.endsWith("audit-mod/resources"))
    data = [{ slug: "students", label: "Students" }]
  else if (path.endsWith("calendar/settings")) data = { weekendDays: [6] }
  else if (path.includes("calendar/class") && !config.params.system)
    data = {
      date: config.params.date,
      label: "Teaching day",
      isWeekend: false,
      holidayTitles: [],
      isExpected: true,
    }
  else if (path.includes("calendar")) data = calendar
  else if (path.endsWith("management-attendance-report"))
    data = {
      ...list([
        {
          id: 1,
          date: "2026-09-04",
          period: 1,
          allocation: 1,
          subjectCode: subject.code,
          subjectName: longName,
          programCode: program.code,
          batchYear: 2083,
          semester: 1,
          teacherName: user.fullName,
          marked: 60,
          present: 50,
          absent: 10,
          late: 0,
          excused: 0,
          attendancePercentage: 83.33,
        },
      ]),
      range: { startDate: "2026-09-01", endDate: "2026-09-06" },
      summary: {
        sessions: 1,
        marked: 60,
        present: 50,
        absent: 10,
        late: 0,
        excused: 0,
        attendancePercentage: 83.33,
      },
    }
  else if (path.endsWith("batch-semester-report"))
    data = {
      ...list([]),
      semester: {
        ...semester,
        batch: {
          id: 1,
          year: 2083,
          programCode: program.code,
          programName: program.name,
        },
      },
      summary: {
        students: 0,
        withEvidence: 0,
        needsAttention: 0,
        averagePerformance: null,
      },
    }
  else if (path.endsWith("internal-exams"))
    data = list([
      {
        id: 1,
        uuid: "exam",
        allocation: 1,
        subjectCode: subject.code,
        title: longName,
        examType: "UNIT_TEST",
        fullMarks: 100,
        passMarks: 40,
        examDate: "2026-09-04",
        markedCount: 0,
        absentCount: 0,
        passedCount: 0,
        averageMarks: null,
        isActive: true,
      },
    ])
  else if (path.endsWith("assignments"))
    data = list([
      {
        id: 1,
        uuid: "assignment",
        allocation: 1,
        subjectCode: subject.code,
        title: longName,
        assignedDate: "2026-09-01",
        dueDate: "2026-09-10",
        evaluatedCount: 0,
        doneCount: 0,
        isActive: true,
      },
    ])
  else data = list([])
  return { data, status: 200, statusText: "OK", headers: {}, config }
}
localStorage.clear()
const { store, persistor } = await import("@/lib/redux/store")
await new Promise((resolve) => {
  if (persistor.getState().bootstrapped) resolve()
  else {
    const unsubscribe = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) {
        unsubscribe()
        resolve()
      }
    })
  }
})
const { setProfile } = await import("@/pages/auth/redux/auth.slice")
const { setSidebar } = await import("@/lib/redux/common.slice")
store.dispatch(
  setProfile({ ...user, roles: [{ codename: "TEACHER" }], permissions: [] })
)
store.dispatch(setSidebar(false))
function Controls() {
  const [value, setValue] = useState("")
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-4 p-4">
      <Combobox
        aria-label="Program"
        className="w-72"
        options={Array.from({ length: 40 }, (_, i) => ({
          value: String(i),
          label: `${i} ${longName}`,
        }))}
        value={value}
        onValueChange={setValue}
      />
      <Select>
        <SelectTrigger aria-label="Subject">
          <SelectValue placeholder="Select subject" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="long">{longName}</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={() => setOpen(true)}>Open long form</Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={longName}
        onSubmit={() => {}}
      >
        {Array.from({ length: 15 }, (_, i) => (
          <Field key={i} label={`Field ${i + 1}`} htmlFor={`field-${i}`}>
            <Input id={`field-${i}`} />
          </Field>
        ))}
      </FormDialog>
    </div>
  )
}
let root, host, router
window.mountResponsive = (path) => {
  root?.unmount()
  router?.dispose()
  store.dispatch(
    setProfile({
      ...user,
      isSuperuser: path !== "/student",
      roles: [{ codename: path === "/student" ? "STUDENT" : "TEACHER" }],
      permissions: [],
    })
  )
  host?.remove()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  router = createMemoryRouter(
    [
      { path: "/login", element: <LoginPage /> },
      { path: "/404", element: <NotFoundPage /> },
      {
        element: <MainLayout />,
        errorElement: <p data-qa-error>QA render failed</p>,
        children: [
          ...privateRoutes.map(({ path, element: Page }) => ({
            path,
            element: <Page />,
          })),
          { path: "/qa-controls", element: <Controls /> },
        ],
      },
    ],
    { initialEntries: [path] }
  )
  root.render(
    <Provider store={store}>
      <ThemeProvider>
        <Suspense fallback={<p>Loading QA page…</p>}>
          <RouterProvider router={router} />
        </Suspense>
      </ThemeProvider>
    </Provider>
  )
}
window.ready = true
