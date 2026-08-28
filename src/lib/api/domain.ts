/**
 * Domain types, named as the backend names them.
 *
 * The unit a teacher works in is a *class*: one subject taught to one batch in
 * one semester. The backend calls that a SubjectAllocation, and its id is what
 * every teaching endpoint is keyed on.
 */

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
export type AssignmentStatus = "DONE" | "PARTIAL" | "NOT_DONE"
export type ExamType =
  "UNIT_TEST" | "FIRST_TERM" | "SECOND_TERM" | "PRE_BOARD" | "OTHER"
export type SemesterStatus = "UPCOMING" | "RUNNING" | "COMPLETED"

export interface UserBrief {
  id: number
  fullName: string
  username?: string
}

/** A class, with the numbers the class list and dashboard render. */
export interface ClassSummary {
  id: number
  allocation: number
  subjectId: number
  code: string
  name: string
  program: string
  programCode: string
  semester: number
  semesterStatus: SemesterStatus
  semesterStartDate: string | null
  semesterEndDate: string | null
  batchYear: number
  startTime: string | null
  endTime: string | null
  teacher: UserBrief
  studentCount: number
  classesHeld: number
  attendancePercentage: number
  /** Present only on the dashboard payload. */
  recorded?: boolean
}

/** One student on a class, with the available performance parameters rolled up. */
export interface ClassStudent {
  enrollment: number
  studentId: number
  rollNumber: string
  registrationNumber: string
  fullName: string
  email: string
  phoneNo: string
  alternatePhoneNo: string
  isRetake: boolean
  attendance: {
    held: number
    attended: number
    percentage: number
    recent: Array<{
      date: string
      period: number
      status: AttendanceStatus
    }>
  }
  internalMarks: {
    obtained: number
    total: number
  }
  assignments: {
    done: number
    total: number
  }
  classPerformance: {
    score: number | null
    scale: 10
  }
  performancePercentage: number | null
}

export interface ClassPerformanceRating {
  enrollment: number
  studentId: number
  rollNumber: string
  fullName: string
  score: number | null
  remarks: string
}

export interface ClassStudentDetail {
  enrollment: number
  student: {
    id: number
    rollNumber: string
    registrationNumber: string
    fullName: string
    email: string
    phoneNo: string
    alternatePhoneNo: string
  }
  class: ClassSummary
  attendance: {
    held: number
    present: number
    absent: number
    excused: number
    late: number
    percentage: number
  } | null
  assessments: Array<{
    examId: number
    title: string
    examType: ExamType
    examDate: string | null
    fullMarks: number
    passMarks: number | null
    marksObtained: string | null
    isAbsent: boolean
  }>
  assignments: Array<{
    assignmentId: number
    title: string
    assignedDate: string
    dueDate: string | null
    status: AssignmentStatus | null
    remarks: string
  }>
  classPerformance: {
    score: number
    remarks: string
    updatedAt: string
  } | null
}

export interface ManagementStudentReport {
  student: {
    id: number
    rollNumber: string
    registrationNumber: string
    fullName: string
    email: string
    phoneNo: string
    alternatePhoneNo: string
    status: Student["status"]
    programCode: string
    programName: string
    departmentName: string
    batchYear: number
  }
  subjects: Array<{
    enrollment: number
    semester: number
    semesterStatus: SemesterStatus
    class: ClassSummary
    attendance: ClassStudentDetail["attendance"]
    assessments: ClassStudentDetail["assessments"]
    assignments: ClassStudentDetail["assignments"]
    classPerformance: ClassStudentDetail["classPerformance"]
  }>
}

export interface BatchSemesterPerformanceRow {
  studentId: number
  rollNumber: string
  registrationNumber: string
  fullName: string
  email: string
  phoneNo: string
  alternatePhoneNo: string
  subjects: number
  attendance: {
    present: number
    absent: number
    late: number
    excused: number
    held: number
    percentage: number | null
  }
  assessment: {
    obtained: number
    total: number
    recorded: number
    percentage: number | null
  }
  assignment: { recorded: number; percentage: number | null }
  classPerformancePercentage: number | null
  overallPercentage: number | null
  needsAttention: boolean
}

export interface BatchSemesterPerformanceReport {
  count: number
  next: string | null
  previous: string | null
  results: BatchSemesterPerformanceRow[]
  semester: {
    id: number
    semester: number
    status: SemesterStatus
    startDate: string | null
    endDate: string | null
    batch: {
      id: number
      year: number
      programCode: string
      programName: string
    }
  }
  summary: {
    students: number
    withEvidence: number
    needsAttention: number
    averagePerformance: number | null
  }
}

/** A roster row, as returned before anything has been marked. */
export interface RosterEntry {
  enrollment: number
  studentId: number
  rollNumber: string
  fullName: string
  phoneNo: string
  isRetake: boolean
}

export interface AttendanceRecord {
  id: number
  enrollment: number
  studentId: number
  rollNumber: string
  fullName: string
  phoneNo: string
  status: AttendanceStatus
}

export interface AttendanceSessionSummary {
  id: number
  uuid: string
  allocation: number
  subjectCode: string
  date: string
  period: number
  markedCount: number
  absentCount: number
  presentCount: number
}

export interface AttendanceSessionDetail {
  id: number
  uuid: string
  allocation: number
  date: string
  period: number
  records: AttendanceRecord[]
}

export interface Exam {
  id: number
  uuid: string
  allocation: number
  subjectCode: string
  title: string
  examType: ExamType
  fullMarks: number
  passMarks: number | null
  examDate: string | null
  markedCount: number
  absentCount: number
  passedCount: number
  averageMarks: string | null
  isActive: boolean
}

export interface ExamMark {
  id: number
  enrollment: number
  rollNumber: string
  fullName: string
  marksObtained: string | null
  isAbsent: boolean
}

export interface Assignment {
  id: number
  uuid: string
  allocation: number
  subjectCode: string
  title: string
  assignedDate: string
  dueDate: string | null
  evaluatedCount: number
  doneCount: number
  isActive: boolean
}

export interface AssignmentSubmission {
  id: number
  enrollment: number
  rollNumber: string
  fullName: string
  status: AssignmentStatus
  remarks: string
}

export interface Student {
  id: number
  uuid: string
  rollNumber: string
  registrationNumber: string
  fullName: string
  batch: {
    id: number
    year: number
    program: { id: number; name: string; code: string }
  }
  gender: string
  email: string
  phoneNo: string
  alternatePhoneNo: string
  status: "STUDYING" | "GRADUATED" | "DROPPED_OUT" | "TRANSFERRED"
  isActive: boolean
}

export interface DashboardOverview {
  experience: "TEACHER" | "MANAGEMENT"
  managementLevel: "CAMPUS" | "DEPARTMENT" | "PROGRAM" | null
  stats: {
    totalClasses: number
    totalStudents: number
    avgAttendancePercentage: number
    studentsBelowEligibility: number
    classesRecordedToday: number
    classesTotalToday: number
  }
  pendingAttendanceCount: number
  todayAttendance: {
    sessionsRecorded: number
    classesRecorded: number
    activeClasses: number
    marked: number
    present: number
    absent: number
    late: number
    excused: number
    attendancePercentage: number
    classesToReview: ClassSummary[]
  }
  todaysClasses: ClassSummary[]
  studentsNeedingAttention: Array<{
    studentId: number
    enrollment: number
    fullName: string
    rollNumber: string
    subject: string
    subjectCode: string
    semester: number
    attendancePercentage: number
  }>
  workQueue: Array<{
    key: string
    kind: "ATTENDANCE" | "ASSESSMENT" | "ASSIGNMENT" | "PERFORMANCE"
    allocation: number
    subjectCode: string
    classLabel: string
    title: string
    detail: string
    remaining: number
    dueDate: string | null
    priority: number
  }>
  recentActivity: Array<{
    id: number
    type: "success" | "info" | "warning"
    message: string
    timestamp: string
  }>
}

export interface AttendanceAttention {
  enrollment: number
  studentId: number
  fullName: string
  rollNumber: string
  email: string
  phoneNo: string
  alternatePhoneNo: string
  allocation: number
  subjectCode: string
  subjectName: string
  programCode: string
  batchYear: number
  semester: number
  teacherName: string
  classesHeld: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendancePercentage: number
  lastAttendanceDate: string | null
}

/** The attendance requirement every eligibility badge is measured against. */
export const ELIGIBILITY_THRESHOLD = 75

export type Eligibility = "eligible" | "borderline" | "at-risk"

export function eligibilityFor(percentage: number): Eligibility {
  if (percentage >= ELIGIBILITY_THRESHOLD) return "eligible"
  if (percentage >= 50) return "borderline"
  return "at-risk"
}

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
}

export const ASSIGNMENT_LABELS: Record<AssignmentStatus, string> = {
  DONE: "Done",
  PARTIAL: "Partial",
  NOT_DONE: "Not done",
}

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  UNIT_TEST: "Unit Test",
  FIRST_TERM: "First Term",
  SECOND_TERM: "Second Term",
  PRE_BOARD: "Pre Board",
  OTHER: "Other",
}

export function semesterLabel(semester: number): string {
  const suffix = ["th", "st", "nd", "rd"][
    semester % 100 > 10 && semester % 100 < 14
      ? 0
      : Math.min(semester % 10, 4) % 4
  ]
  return `${semester}${suffix} Sem`
}

/** A stable colour per class, so the same subject always looks the same. */
const CLASS_COLORS = [
  "blue",
  "green",
  "orange",
  "slate",
  "violet",
  "teal",
] as const
export type ClassColor = (typeof CLASS_COLORS)[number]

export function colorForId(id: number): ClassColor {
  return CLASS_COLORS[id % CLASS_COLORS.length]
}
