import {
  BookOpen,
  Boxes,
  Building2,
  CalendarRange,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Layers,
  ShieldCheck,
  Settings2,
  Star,
  TriangleAlert,
  Users,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  /**
   * Permission codename that admits someone to this screen.
   *
   * Workspace items key off the *doing* verbs (add_attendance and friends),
   * which only a teacher holds. Management items key off the managing verbs.
   * The two sets are disjoint, so nobody sees a section that is not theirs.
   */
  permission?: string
  role?: string
  allowedRoles?: string[]
  superuserOnly?: boolean
  showInSidebar?: boolean
  breadcrumb: string
  icon: React.ElementType
  section: "Workspace" | "Reports" | "Academics" | "People" | "Administration"
}

export const NAV_ITEMS: NavItem[] = [
  // Dashboard is universal; all other Workspace items require TEACHER.
  {
    label: "Dashboard",
    href: "/dashboard",
    breadcrumb: "Dashboard",
    icon: LayoutDashboard,
    section: "Workspace",
  },
  {
    label: "Attendance Attention",
    href: "/attention",
    permission: "view_attendance",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    breadcrumb: "Attendance Attention",
    icon: TriangleAlert,
    section: "Workspace",
  },
  {
    label: "Batch Performance",
    href: "/reports/batch-performance",
    permission: "view_student",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    breadcrumb: "Batch Performance",
    icon: ChartNoAxesColumnIncreasing,
    section: "Reports",
  },
  {
    label: "My Classes",
    href: "/classes",
    permission: "view_attendance",
    role: "TEACHER",
    breadcrumb: "My Classes",
    icon: BookOpen,
    section: "Workspace",
  },
  {
    label: "Class Roster",
    href: "/roster",
    permission: "view_attendance",
    role: "TEACHER",
    breadcrumb: "Class Roster",
    icon: Users,
    section: "Workspace",
    showInSidebar: false,
  },
  {
    label: "Attendance",
    href: "/attendance",
    permission: "view_attendance",
    role: "TEACHER",
    breadcrumb: "Attendance",
    icon: CalendarRange,
    section: "Workspace",
  },
  {
    label: "Assessments",
    href: "/assessments",
    permission: "view_internal_exam",
    role: "TEACHER",
    breadcrumb: "Assessments",
    icon: ClipboardList,
    section: "Workspace",
    showInSidebar: false,
  },
  {
    label: "Assignments",
    href: "/assignments",
    permission: "view_assignment",
    role: "TEACHER",
    breadcrumb: "Assignments",
    icon: ClipboardCheck,
    section: "Workspace",
    showInSidebar: false,
  },
  {
    label: "Class Performance",
    href: "/class-performance",
    permission: "view_class_performance",
    role: "TEACHER",
    breadcrumb: "Class Performance",
    icon: Star,
    section: "Workspace",
    showInSidebar: false,
  },
  // Academics — the structure, in the order it has to be built.
  {
    label: "Departments",
    href: "/academics/departments",
    permission: "view_department",
    superuserOnly: true,
    breadcrumb: "Departments",
    icon: Building2,
    section: "Academics",
  },
  {
    label: "Programs",
    href: "/academics/programs",
    permission: "view_program",
    allowedRoles: ["DEPARTMENT-HEAD"],
    breadcrumb: "Programs",
    icon: GraduationCap,
    section: "Academics",
  },
  {
    label: "Batches",
    href: "/academics/batches",
    permission: "view_batch",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    breadcrumb: "Batches",
    icon: CalendarRange,
    section: "Academics",
  },
  {
    label: "Subjects",
    href: "/academics/subjects",
    permission: "view_subject",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    breadcrumb: "Subjects",
    icon: Layers,
    section: "Academics",
  },
  {
    label: "Subject Allocations",
    href: "/academics/allocations",
    permission: "view_subject_allocation",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    breadcrumb: "Subject Allocations",
    icon: Boxes,
    section: "Academics",
  },

  // People.
  {
    label: "Students",
    href: "/people/students",
    permission: "view_student",
    allowedRoles: ["DEPARTMENT-HEAD", "PROGRAM-COORDINATOR"],
    breadcrumb: "Students",
    icon: Users,
    section: "People",
  },
  {
    label: "Accounts & Roles",
    href: "/people/accounts",
    permission: "view_user",
    breadcrumb: "Accounts & Roles",
    icon: ShieldCheck,
    section: "People",
  },
  {
    label: "Performance Settings",
    href: "/settings/performance",
    superuserOnly: true,
    breadcrumb: "Performance Settings",
    icon: Settings2,
    section: "Administration",
  },
]

/**
 * The mobile bottom bar.
 *
 * A teacher on a phone is between classes, so this carries only what they
 * reach for in that moment.
 */
export const FOOTER_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter(
  (item) => item.section === "Workspace"
)
