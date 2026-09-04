import {
  ASSIGNMENT_LABELS,
  EXAM_TYPE_LABELS,
  type Allocation,
  type BatchSemesterPerformanceReport,
  type ClassStudent,
  type ClassStudentDetail,
  type ClassSummary,
  type ManagementAttendanceReport,
  type ManagementStudentReport,
  eligibilityFor,
} from "@/lib/api"
import type { ExportTable } from "@/lib/spreadsheet-export"

const percentage = (value: number | null | undefined) =>
  value === null || value === undefined ? null : value / 100

export function rosterExportTable(
  subject: Pick<ClassSummary, "code" | "name">,
  students: ClassStudent[],
  threshold: number
): ExportTable {
  return {
    filename: `${subject.code}-class-roster`,
    sheetName: "Class roster",
    title: `${subject.code} — ${subject.name}`,
    subtitle: `${students.length} enrolled students`,
    columns: [
      { header: "Roll number", format: "text", width: 16 },
      { header: "Full name", format: "text", width: 28 },
      { header: "Registration number", format: "text", width: 22 },
      { header: "Email", format: "text", width: 28 },
      { header: "Primary phone", format: "text", width: 18 },
      { header: "Alternate phone", format: "text", width: 18 },
      { header: "Retake", width: 10 },
      { header: "Classes held", format: "integer", width: 14 },
      { header: "Classes attended", format: "integer", width: 18 },
      { header: "Attendance", format: "percentage", width: 14 },
      { header: "Assessment obtained", format: "decimal", width: 20 },
      { header: "Assessment total", format: "decimal", width: 18 },
      { header: "Assignments done", format: "integer", width: 18 },
      { header: "Assignments total", format: "integer", width: 18 },
      { header: "Class performance (1-10)", format: "integer", width: 24 },
      { header: "Overall performance", format: "percentage", width: 20 },
      { header: "Standing", width: 18 },
    ],
    rows: students.map((student) => [
      student.rollNumber,
      student.fullName,
      student.registrationNumber,
      student.email,
      student.phoneNo,
      student.alternatePhoneNo,
      student.isRetake ? "Yes" : "No",
      student.attendance.held,
      student.attendance.attended,
      percentage(student.attendance.percentage),
      student.internalMarks.obtained,
      student.internalMarks.total,
      student.assignments.done,
      student.assignments.total,
      student.classPerformance.score,
      percentage(student.performancePercentage),
      student.performancePercentage === null
        ? "No data"
        : eligibilityFor(student.performancePercentage, threshold),
    ]),
  }
}

export function allocationExportTable(
  allocation: Allocation,
  students: ClassStudent[],
  threshold: number
) {
  const table = rosterExportTable(
    {
      code: allocation.subject.code,
      name: allocation.subject.name,
    },
    students,
    threshold
  )
  return {
    ...table,
    filename: `${allocation.subject.code}-batch-${allocation.batchSemester.batch.year}-performance`,
    sheetName: "Class performance",
    subtitle: `${allocation.batchSemester.batch.program.code} · Batch ${allocation.batchSemester.batch.year} · Semester ${allocation.batchSemester.semester} · ${allocation.teacher.fullName}`,
  }
}

export function classStudentExportTable(data: ClassStudentDetail): ExportTable {
  const base = [data.student.rollNumber, data.student.fullName]
  const rows = [
    [
      ...base,
      "Attendance",
      "Overall attendance",
      "",
      data.attendance?.present ?? null,
      data.attendance?.held ?? null,
      data.attendance ? percentage(data.attendance.percentage) : null,
      data.attendance ? "Recorded" : "Unavailable",
      data.attendance
        ? `${data.attendance.absent} absent, ${data.attendance.late} late, ${data.attendance.excused} excused`
        : "Unavailable",
    ],
    ...data.assessments.map((exam) => [
      ...base,
      "Assessment",
      exam.title,
      exam.examDate,
      exam.isAbsent || exam.marksObtained === null
        ? null
        : Number(exam.marksObtained),
      exam.fullMarks,
      null,
      exam.isAbsent
        ? "Absent"
        : exam.marksObtained === null
          ? "Not marked"
          : Number(exam.marksObtained) >= (exam.passMarks ?? 0)
            ? "Passed"
            : "Failed",
      EXAM_TYPE_LABELS[exam.examType],
    ]),
    ...data.assignments.map((assignment) => [
      ...base,
      "Assignment",
      assignment.title,
      assignment.dueDate,
      null,
      null,
      null,
      assignment.status ? ASSIGNMENT_LABELS[assignment.status] : "Not marked",
      assignment.remarks,
    ]),
    [
      ...base,
      "Class performance",
      "Overall rating",
      data.classPerformance?.updatedAt ?? null,
      data.classPerformance?.score ?? null,
      10,
      null,
      data.classPerformance ? "Rated" : "Not rated",
      data.classPerformance?.remarks ?? "",
    ],
  ]
  return {
    filename: `${data.student.fullName}-${data.class.code}-report`,
    sheetName: "Student record",
    title: `${data.student.fullName} — ${data.class.code}`,
    subtitle: `${data.class.name} · Roll ${data.student.rollNumber}`,
    columns: [
      { header: "Roll number", format: "text", width: 16 },
      { header: "Full name", format: "text", width: 28 },
      { header: "Category", width: 20 },
      { header: "Item", width: 30 },
      { header: "Date", format: "date", width: 14 },
      { header: "Value", format: "decimal", width: 12 },
      { header: "Maximum / sessions", format: "decimal", width: 20 },
      { header: "Attendance", format: "percentage", width: 14 },
      { header: "Status", width: 18 },
      { header: "Details", width: 36 },
    ],
    rows,
  }
}

export function managementStudentExportTable(
  data: ManagementStudentReport
): ExportTable {
  const rows = data.subjects.flatMap((subject) => {
    const base = [
      data.student.rollNumber,
      data.student.fullName,
      subject.semester,
      subject.class.code,
      subject.class.name,
    ]
    return [
      [
        ...base,
        "Subject summary",
        "",
        null,
        null,
        null,
        subject.attendance ? percentage(subject.attendance.percentage) : null,
        subject.classPerformance?.score ?? null,
        subject.semesterStatus,
        "",
      ],
      ...subject.assessments.map((exam) => [
        ...base,
        "Assessment",
        exam.title,
        exam.examDate,
        exam.isAbsent || exam.marksObtained === null
          ? null
          : Number(exam.marksObtained),
        exam.fullMarks,
        null,
        null,
        exam.isAbsent ? "Absent" : "Recorded",
        EXAM_TYPE_LABELS[exam.examType],
      ]),
      ...subject.assignments.map((assignment) => [
        ...base,
        "Assignment",
        assignment.title,
        assignment.dueDate,
        null,
        null,
        null,
        null,
        assignment.status ? ASSIGNMENT_LABELS[assignment.status] : "Not marked",
        assignment.remarks,
      ]),
    ]
  })
  return {
    filename: `${data.student.fullName}-complete-performance-report`,
    sheetName: "Academic records",
    title: `${data.student.fullName} — complete performance report`,
    subtitle: `${data.student.programCode} · Batch ${data.student.batchYear} · Roll ${data.student.rollNumber}`,
    columns: [
      { header: "Roll number", format: "text", width: 16 },
      { header: "Full name", format: "text", width: 28 },
      { header: "Semester", format: "integer", width: 12 },
      { header: "Subject code", format: "text", width: 16 },
      { header: "Subject name", width: 28 },
      { header: "Category", width: 18 },
      { header: "Item", width: 30 },
      { header: "Date", format: "date", width: 14 },
      { header: "Obtained", format: "decimal", width: 12 },
      { header: "Maximum", format: "decimal", width: 12 },
      { header: "Attendance", format: "percentage", width: 14 },
      { header: "Rating (1-10)", format: "integer", width: 16 },
      { header: "Status", width: 16 },
      { header: "Remarks", width: 36 },
    ],
    rows,
  }
}

export function batchPerformanceExportTable(
  data: BatchSemesterPerformanceReport
): ExportTable {
  if (data.results.length !== data.count) {
    throw new Error("Batch export is incomplete.")
  }
  const semester = data.semester
  return {
    filename: `${semester.batch.programCode}-batch-${semester.batch.year}-semester-${semester.semester}-performance`,
    sheetName: "Batch performance",
    title: `${semester.batch.programCode} Batch ${semester.batch.year} — Semester ${semester.semester}`,
    subtitle: `${semester.status} · ${data.summary.students} students`,
    columns: [
      { header: "Roll number", format: "text", width: 16 },
      { header: "Registration number", format: "text", width: 22 },
      { header: "Full name", format: "text", width: 28 },
      { header: "Email", format: "text", width: 28 },
      { header: "Primary phone", format: "text", width: 18 },
      { header: "Alternate phone", format: "text", width: 18 },
      { header: "Subjects", format: "integer", width: 12 },
      { header: "Present", format: "integer", width: 10 },
      { header: "Absent", format: "integer", width: 10 },
      { header: "Late", format: "integer", width: 10 },
      { header: "Excused", format: "integer", width: 10 },
      { header: "Classes held", format: "integer", width: 14 },
      { header: "Attendance", format: "percentage", width: 14 },
      { header: "Assessment obtained", format: "decimal", width: 20 },
      { header: "Assessment total", format: "decimal", width: 18 },
      { header: "Assessment", format: "percentage", width: 14 },
      { header: "Assignments recorded", format: "integer", width: 21 },
      { header: "Assignment", format: "percentage", width: 14 },
      { header: "Class performance", format: "percentage", width: 20 },
      { header: "Overall", format: "percentage", width: 14 },
      { header: "Needs attention", width: 18 },
    ],
    rows: data.results.map((row) => [
      row.rollNumber,
      row.registrationNumber,
      row.fullName,
      row.email,
      row.phoneNo,
      row.alternatePhoneNo,
      row.subjects,
      row.attendance.present,
      row.attendance.absent,
      row.attendance.late,
      row.attendance.excused,
      row.attendance.held,
      percentage(row.attendance.percentage),
      row.assessment.obtained,
      row.assessment.total,
      percentage(row.assessment.percentage),
      row.assignment.recorded,
      percentage(row.assignment.percentage),
      percentage(row.classPerformancePercentage),
      percentage(row.overallPercentage),
      row.needsAttention ? "Yes" : "No",
    ]),
  }
}

export function attendanceExportTable(
  data: ManagementAttendanceReport
): ExportTable {
  if (data.results.length !== data.count) {
    throw new Error("Attendance export is incomplete.")
  }
  return {
    filename: `attendance-${data.range.startDate}-to-${data.range.endDate}`,
    sheetName: "Attendance report",
    title: "Attendance report",
    subtitle: `${data.range.startDate} to ${data.range.endDate} · ${data.summary.sessions} classes`,
    columns: [
      { header: "Date", format: "date", width: 14 },
      { header: "Period", format: "integer", width: 10 },
      { header: "Subject code", format: "text", width: 16 },
      { header: "Subject name", width: 28 },
      { header: "Program", format: "text", width: 14 },
      { header: "Batch year", format: "integer", width: 14 },
      { header: "Semester", format: "integer", width: 12 },
      { header: "Teacher", width: 28 },
      { header: "Marked", format: "integer", width: 10 },
      { header: "Present", format: "integer", width: 10 },
      { header: "Absent", format: "integer", width: 10 },
      { header: "Late", format: "integer", width: 10 },
      { header: "Excused", format: "integer", width: 10 },
      { header: "Attendance", format: "percentage", width: 14 },
    ],
    rows: data.results.map((row) => [
      row.date,
      row.period,
      row.subjectCode,
      row.subjectName,
      row.programCode,
      row.batchYear,
      row.semester,
      row.teacherName,
      row.marked,
      row.present,
      row.absent,
      row.late,
      row.excused,
      percentage(row.attendancePercentage),
    ]),
  }
}
