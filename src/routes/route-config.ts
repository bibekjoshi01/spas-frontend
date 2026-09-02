import { lazy, type ComponentType, type LazyExoticComponent } from "react"

const Overview = lazy(() => import("@/pages/overview"))
const AttendanceAttention = lazy(() => import("@/pages/attention"))
const BatchPerformanceReport = lazy(
  () => import("@/pages/reports/batch-performance")
)
const AttendanceReport = lazy(() => import("@/pages/reports/attendance-report"))
const Classes = lazy(() => import("@/pages/classes"))
const ClassWorkspace = lazy(() => import("@/pages/classes/workspace"))
const AttendanceSession = lazy(() => import("@/pages/attendance-session"))
const Attendance = lazy(() => import("@/pages/attendance"))
const Roster = lazy(() => import("@/pages/roster"))
const Exams = lazy(() => import("@/pages/assessments/exams"))
const Assignments = lazy(() => import("@/pages/assessments/assignments"))
const ClassPerformance = lazy(() => import("@/pages/class-performance"))

const Departments = lazy(() => import("@/pages/academics/departments"))
const Programs = lazy(() => import("@/pages/academics/programs"))
const Batches = lazy(() => import("@/pages/academics/batches"))
const Subjects = lazy(() => import("@/pages/academics/subjects"))
const Allocations = lazy(() => import("@/pages/academics/allocations"))

const People = lazy(() => import("@/pages/people/students"))
const Accounts = lazy(() => import("@/pages/people/accounts"))
const PerformanceSettings = lazy(() => import("@/pages/settings/performance"))

export interface AppRoute {
  path: string
  element: ComponentType | LazyExoticComponent<ComponentType>
  /**
   * Permission codename that admits someone to this route.
   *
   * The same codename the API checks, so the guard and the backend cannot
   * disagree about who belongs here.
   */
  permission?: string
  /** Role required even when the account is a superuser. */
  role?: string
  /** At least one management role; superusers bypass this list. */
  allowedRoles?: string[]
  superuserOnly?: boolean
  /**
   * The shape the router draws while this route's chunk downloads.
   *
   * It should match the skeleton the screen itself shows while its data loads,
   * so a cold navigation reads as one wait rather than two.
   */
  skeleton?: "list" | "dashboard"
  title: string
  showInSidebar: boolean
}

export const privateRoutes: AppRoute[] = [
  // Dashboard is universal; the rest of Workspace belongs to TEACHER accounts.
  {
    path: "/dashboard",
    element: Overview,
    skeleton: "dashboard",
    title: "Dashboard",
    showInSidebar: true,
  },
  {
    path: "/attention",
    element: AttendanceAttention,
    permission: "view_attendance",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    title: "Attendance Attention",
    showInSidebar: true,
  },
  {
    path: "/reports/batch-performance",
    element: BatchPerformanceReport,
    permission: "view_student",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    title: "Batch Performance",
    showInSidebar: true,
  },
  {
    path: "/reports/attendance",
    element: AttendanceReport,
    permission: "view_attendance",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    title: "Attendance Reports",
    showInSidebar: true,
  },
  {
    path: "/classes",
    element: Classes,
    permission: "view_attendance",
    role: "TEACHER",
    title: "My Classes",
    showInSidebar: true,
  },
  {
    path: "/classes/:allocationId",
    element: ClassWorkspace,
    permission: "view_attendance",
    role: "TEACHER",
    title: "Class Workspace",
    showInSidebar: false,
  },
  {
    path: "/attendance",
    element: Attendance,
    permission: "view_attendance",
    role: "TEACHER",
    title: "Attendance",
    showInSidebar: true,
  },
  {
    path: "/attendance/:allocationId/:date",
    element: AttendanceSession,
    permission: "view_attendance",
    role: "TEACHER",
    title: "Take Attendance",
    showInSidebar: false,
  },
  {
    path: "/roster",
    element: Roster,
    permission: "view_attendance",
    role: "TEACHER",
    title: "Class Roster",
    showInSidebar: true,
  },
  {
    path: "/assessments",
    element: Exams,
    permission: "view_internal_exam",
    role: "TEACHER",
    title: "Assessments",
    showInSidebar: true,
  },
  {
    path: "/assignments",
    element: Assignments,
    permission: "view_assignment",
    role: "TEACHER",
    title: "Assignments",
    showInSidebar: true,
  },
  {
    path: "/class-performance",
    element: ClassPerformance,
    permission: "view_class_performance",
    role: "TEACHER",
    title: "Class Performance",
    showInSidebar: true,
  },
  // Academics.
  {
    path: "/academics/departments",
    element: Departments,
    permission: "view_department",
    superuserOnly: true,
    title: "Departments",
    showInSidebar: true,
  },
  {
    path: "/academics/programs",
    element: Programs,
    permission: "view_program",
    allowedRoles: ["DEPARTMENT-HEAD"],
    title: "Programs",
    showInSidebar: true,
  },
  {
    path: "/academics/batches",
    element: Batches,
    permission: "view_batch",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    title: "Batches",
    showInSidebar: true,
  },
  {
    path: "/academics/subjects",
    element: Subjects,
    permission: "view_subject",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    title: "Subjects",
    showInSidebar: true,
  },
  {
    path: "/academics/allocations",
    element: Allocations,
    permission: "view_subject_allocation",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    title: "Subject Allocations",
    showInSidebar: true,
  },

  // People.
  {
    path: "/people/students",
    element: People,
    permission: "view_student",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    title: "Students",
    showInSidebar: true,
  },
  {
    path: "/people/accounts",
    element: Accounts,
    permission: "view_user",
    title: "Accounts & Roles",
    showInSidebar: true,
  },
  {
    path: "/settings/performance",
    element: PerformanceSettings,
    superuserOnly: true,
    title: "Performance Settings",
    showInSidebar: true,
  },
]

/**
 * Where to send someone who lands on "/".
 *
 * A teacher belongs on their dashboard; management has no workspace, so they
 * go to the first screen their permissions admit them to.
 */
export function landingPathFor(
  _permissions: string[],
  _isSuperuser: boolean
): string {
  return "/dashboard"
}
