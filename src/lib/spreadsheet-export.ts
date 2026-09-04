export type ExportFormat = "pdf" | "csv" | "xlsx"
export type ExportCell = string | number | boolean | null | undefined

export interface ExportColumn {
  header: string
  width?: number
  format?: "text" | "integer" | "decimal" | "percentage" | "date"
}

export interface ExportTable {
  filename: string
  sheetName: string
  title: string
  subtitle?: string
  columns: ExportColumn[]
  rows: ExportCell[][]
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function validateExportTable(table: ExportTable) {
  if (table.columns.length === 0) throw new Error("Export has no columns.")
  table.rows.forEach((row, index) => {
    if (row.length !== table.columns.length) {
      throw new Error(
        `Export row ${index + 1} has ${row.length} values for ${table.columns.length} columns.`
      )
    }
  })
}

function csvCell(value: ExportCell, column: ExportColumn) {
  let output = ""
  if (value !== null && value !== undefined) {
    output =
      column.format === "percentage" && typeof value === "number"
        ? `${(value * 100).toFixed(2)}%`
        : String(value)
  }

  // Prevent spreadsheet programs from evaluating imported user text as a
  // formula while preserving identifiers such as +977 phone numbers.
  if (/^[=+\-@\t\r]/.test(output)) output = `'${output}`
  return `"${output.replaceAll('"', '""')}"`
}

export function exportCsv(table: ExportTable) {
  validateExportTable(table)
  const lines = [
    table.columns.map((column) => csvCell(column.header, column)).join(","),
    ...table.rows.map((row) =>
      table.columns
        .map((column, index) => csvCell(row[index], column))
        .join(",")
    ),
  ]
  download(
    new Blob(["\uFEFF", lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
    `${safeFilename(table.filename)}.csv`
  )
}

export async function exportExcel(table: ExportTable) {
  validateExportTable(table)
  const { Workbook } = await import("exceljs")
  const workbook = new Workbook()
  workbook.creator = "SPAS"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(table.sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  })
  sheet.columns = table.columns.map((column) => ({
    header: column.header,
    width: column.width ?? Math.max(12, column.header.length + 2),
  }))
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: table.columns.length },
  }

  for (const row of table.rows) {
    sheet.addRow(
      row.map((value, index) => {
        if (
          table.columns[index].format === "date" &&
          typeof value === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {
          const [year, month, day] = value.split("-").map(Number)
          return new Date(year, month - 1, day)
        }
        return value ?? ""
      })
    )
  }

  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: "FFFFFFFF" } }
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  }
  header.alignment = { vertical: "middle" }
  header.height = 22

  table.columns.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1)
    if (column.format === "text") excelColumn.numFmt = "@"
    if (column.format === "integer") excelColumn.numFmt = "0"
    if (column.format === "decimal") excelColumn.numFmt = "0.00"
    if (column.format === "percentage") excelColumn.numFmt = "0.00%"
    if (column.format === "date") excelColumn.numFmt = "yyyy-mm-dd"
    excelColumn.alignment = { vertical: "top", wrapText: true }
  })

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" },
      }
    }
  })

  const about = workbook.addWorksheet("About")
  about.addRows([
    ["Report", table.title],
    ["Scope", table.subtitle ?? ""],
    ["Rows", table.rows.length],
    ["Generated", new Date().toISOString()],
  ])
  about.getColumn(1).font = { bold: true }
  about.columns = [{ width: 14 }, { width: 70 }]

  const buffer = await workbook.xlsx.writeBuffer()
  download(
    new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeFilename(table.filename)}.xlsx`
  )
}

export async function exportSpreadsheet(
  format: Exclude<ExportFormat, "pdf">,
  table: ExportTable
) {
  if (format === "csv") exportCsv(table)
  else await exportExcel(table)
}
