import type { jsPDF as JsPDF } from "jspdf"
import type autoTableType from "jspdf-autotable"

import {
  ASSIGNMENT_LABELS,
  EXAM_TYPE_LABELS,
  type ClassStudent,
  type ClassStudentDetail,
  type ClassSummary,
  eligibilityFor,
  semesterLabel,
} from "@/lib/api"

const STANDING = {
  eligible: "Eligible",
  borderline: "Borderline",
  "at-risk": "At risk",
} as const

function heading(doc: JsPDF, title: string, subtitle: string) {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(title, 14, 16)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(subtitle, 14, 22)
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 27)
  doc.setTextColor(0)
}

function filename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function tableEnd(doc: JsPDF, fallback: number) {
  return (
    (doc as JsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? fallback
  )
}

function sectionStart(doc: JsPDF, y: number) {
  if (y <= 275) return y
  doc.addPage()
  return 15
}

async function pdfTools(): Promise<{
  jsPDF: typeof import("jspdf").jsPDF
  autoTable: typeof autoTableType
}> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  return { jsPDF, autoTable }
}

export async function exportRosterPdf(
  subject: ClassSummary,
  students: ClassStudent[]
) {
  const { jsPDF, autoTable } = await pdfTools()
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  heading(
    doc,
    `${subject.code} — ${subject.name}`,
    `${semesterLabel(subject.semester)} · ${students.length} enrolled students`
  )

  autoTable(doc, {
    startY: 33,
    head: [
      [
        "Roll",
        "Student",
        "Registration",
        "Contact",
        "Attendance",
        "Assessment",
        "Assignments",
        "Class perf.",
        "Standing",
      ],
    ],
    body: students.map((student) => [
      student.rollNumber,
      student.fullName,
      student.registrationNumber || "—",
      [student.email, student.phoneNo, student.alternatePhoneNo]
        .filter(Boolean)
        .join("\n") || "—",
      `${student.attendance.attended}/${student.attendance.held} (${student.attendance.percentage}%)`,
      student.internalMarks.total
        ? `${student.internalMarks.obtained}/${student.internalMarks.total}`
        : "—",
      student.assignments.total
        ? `${student.assignments.done}/${student.assignments.total}`
        : "—",
      student.classPerformance.score === null
        ? "Not rated"
        : `${student.classPerformance.score}/10`,
      student.performancePercentage === null
        ? "No data"
        : `${STANDING[eligibilityFor(student.performancePercentage)]} (${student.performancePercentage}%)`,
    ]),
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 10, right: 10 },
  })

  doc.save(`${filename(subject.code)}-class-roster.pdf`)
}

export async function exportStudentDetailPdf(data: ClassStudentDetail) {
  const { jsPDF, autoTable } = await pdfTools()
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  heading(
    doc,
    data.student.fullName,
    `${data.class.code} — ${data.class.name} · Roll ${data.student.rollNumber}`
  )

  autoTable(doc, {
    startY: 33,
    head: [["Registration", "Email", "Primary phone", "Alternate phone"]],
    body: [
      [
        data.student.registrationNumber || "—",
        data.student.email || "—",
        data.student.phoneNo || "—",
        data.student.alternatePhoneNo || "—",
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
  })

  let y = sectionStart(doc, tableEnd(doc, 33) + 8)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Attendance", 14, y)
  y += 3
  const attendance = data.attendance
  autoTable(doc, {
    startY: y,
    head: [["Present", "Absent", "Excused", "Late", "Sessions", "Attendance"]],
    body: attendance
      ? [
          [
            attendance.present,
            attendance.absent,
            attendance.excused,
            attendance.late,
            attendance.held,
            `${attendance.percentage}%`,
          ],
        ]
      : [["—", "—", "—", "—", "—", "Unavailable"]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] },
  })

  y = sectionStart(doc, tableEnd(doc, y) + 8)
  doc.text("Assessments", 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [["Assessment", "Type", "Date", "Marks", "Result"]],
    body: data.assessments.length
      ? data.assessments.map((exam) => {
          const marks = exam.isAbsent
            ? "Absent"
            : exam.marksObtained === null
              ? "Not marked"
              : `${exam.marksObtained}/${exam.fullMarks}`
          const result =
            !exam.isAbsent &&
            exam.marksObtained !== null &&
            exam.passMarks !== null
              ? Number(exam.marksObtained) >= exam.passMarks
                ? "Passed"
                : "Failed"
              : "—"
          return [
            exam.title,
            EXAM_TYPE_LABELS[exam.examType],
            exam.examDate ?? "—",
            marks,
            result,
          ]
        })
      : [["No assessments", "—", "—", "—", "—"]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] },
  })

  y = sectionStart(doc, tableEnd(doc, y) + 8)
  doc.text("Assignments", 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [["Assignment", "Assigned", "Due", "Status", "Remarks"]],
    body: data.assignments.length
      ? data.assignments.map((assignment) => [
          assignment.title,
          assignment.assignedDate,
          assignment.dueDate ?? "—",
          assignment.status
            ? ASSIGNMENT_LABELS[assignment.status]
            : "Not marked",
          assignment.remarks || "—",
        ])
      : [["No assignments", "—", "—", "—", "—"]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] },
  })

  y = sectionStart(doc, tableEnd(doc, y) + 8)
  doc.text("Class performance", 14, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(
    data.classPerformance
      ? `${data.classPerformance.score}/10 — ${data.classPerformance.remarks || "No remarks"}`
      : "Not rated yet.",
    14,
    y + 6,
    { maxWidth: 180 }
  )

  doc.save(
    `${filename(data.student.fullName)}-${filename(data.class.code)}-report.pdf`
  )
}
