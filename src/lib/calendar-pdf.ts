import type { CalendarMonth } from "@/lib/api"
import nepaliFontUrl from "@/assets/fonts/NotoSansDevanagari.ttf?url"

export interface CalendarExportMonth {
  year: number
  month: CalendarMonth
}

const RED = "#bf0800"
const BORDER = "#e3a17a"
const WIDTH = 794
const HEIGHT = 1123
const MARGIN = 36
const BOTTOM = HEIGHT - MARGIN
const SCALE = 3
const nepali = (value: number) =>
  String(value).replace(/\d/g, (digit) => "०१२३४५६७८९"[Number(digit)])

let fontReady: Promise<FontFace> | undefined

/** Use the browser's text shaping for Nepali conjuncts, with a bundled font. */
function loadFont() {
  fontReady ??= new FontFace("Calendar Nepali", `url(${nepaliFontUrl})`)
    .load()
    .then((font) => {
      document.fonts.add(font)
      return font
    })
    .catch((error: unknown) => {
      fontReady = undefined
      throw error
    })
  return fontReady
}

/** Export only the selected, server-converted dates; no client-side BS conversion. */
export async function downloadCalendarPdf(selected: CalendarExportMonth[]) {
  if (!selected.length) throw new Error("Select at least one month.")
  const months = [
    ...new Map(
      selected.map((item) => [`${item.year}-${item.month.index}`, item])
    ).values(),
  ].sort((a, b) => a.year - b.year || a.month.index - b.month.index)
  await loadFont()
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true })
  pdf.setProperties({
    title: "Academic calendar",
    subject: "Selected academic calendar months",
  })
  const canvas = document.createElement("canvas")
  canvas.width = WIDTH * SCALE
  canvas.height = HEIGHT * SCALE
  const context = canvas.getContext("2d")
  if (!context)
    throw new Error("Your browser could not prepare the calendar PDF.")
  const ctx = context
  ctx.scale(SCALE, SCALE)
  let pages = 0

  function text(
    value: string,
    x: number,
    y: number,
    size = 12,
    color = "#111",
    bold = false,
    align: CanvasTextAlign = "left"
  ) {
    ctx.font = `${bold ? 700 : 400} ${size}px "Calendar Nepali", serif`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = "middle"
    ctx.fillText(value, x, y)
  }

  function box(x: number, y: number, w: number, h: number, fill = "#fff") {
    ctx.fillStyle = fill
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = BORDER
    ctx.lineWidth = 0.7
    ctx.strokeRect(x, y, w, h)
  }

  function newPage() {
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    text("Academic calendar", WIDTH / 2, 36, 20, "#111", true, "center")
  }

  function savePage() {
    if (pages++) pdf.addPage()
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      pdf.internal.pageSize.getWidth(),
      pdf.internal.pageSize.getHeight(),
      undefined,
      "FAST"
    )
  }

  function drawMonth(item: CalendarExportMonth, x: number, y: number) {
    const w = (WIDTH - MARGIN * 2 - 24) / 3
    const cell = w / 7
    box(x, y, w, 40, RED)
    text(
      `${item.month.nameNepali} ${nepali(item.year)}`,
      x + w / 2,
      y + 13,
      13,
      "#fff",
      true,
      "center"
    )
    text(
      `${item.month.name} ${item.year}`,
      x + w / 2,
      y + 29,
      10,
      "#fff",
      false,
      "center"
    )
    for (let col = 0; col < 7; col++) {
      box(x + col * cell, y + 40, cell, 22)
      text(
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][col],
        x + (col + 0.5) * cell,
        y + 51,
        10,
        "#111",
        true,
        "center"
      )
    }
    const leading = item.month.days[0].weekday % 7
    for (let index = 0; index < 42; index++) {
      const day = item.month.days[index - leading]
      const left = x + (index % 7) * cell
      const top = y + 62 + Math.floor(index / 7) * 22
      box(left, top, cell, 22)
      if (!day) continue
      const holiday = day.entries.some(
        (entry) => entry.isActive && entry.kind === "HOLIDAY"
      )
      text(
        day.dayLabel,
        left + cell / 2,
        top + 11,
        12,
        day.isWeekend || holiday ? RED : "#111",
        false,
        "center"
      )
    }
  }

  function wrap(value: string, width: number): string[] {
    ctx.font = '400 11px "Calendar Nepali", serif'
    const lines: string[] = []
    // Segment graphemes so wrapping never separates a Nepali conjunct.
    const segmenter = new Intl.Segmenter("ne", { granularity: "grapheme" })
    for (const paragraph of value.split(/\r?\n/)) {
      let line = ""
      for (const { segment } of segmenter.segment(paragraph)) {
        if (line && ctx.measureText(line + segment).width > width) {
          lines.push(line)
          line = ""
        }
        line += segment
      }
      lines.push(line)
    }
    return lines
  }

  const entries = months.flatMap(({ year, month }) =>
    month.days.flatMap((day) =>
      day.entries
        .filter((entry) => entry.isActive)
        .map((entry) => ({
          kind: entry.kind,
          date: `${day.dayLabel} ${month.nameNepali} ${nepali(year)}`,
          description: [entry.title, entry.note].filter(Boolean).join("\n"),
        }))
    )
  )
  const panelWidth = (WIDTH - MARGIN * 2 - 20) / 2
  const dateWidth = 115
  const makeRows = (kind: string) =>
    entries
      .filter((entry) => entry.kind === kind)
      .map((entry) => ({
        date: wrap(entry.date, dateWidth - 12),
        description: wrap(entry.description, panelWidth - dateWidth - 12),
        offset: 0,
      }))
  const events = makeRows("EVENT")
  const holidays = makeRows("HOLIDAY")

  function panel(
    rows: ReturnType<typeof makeRows>,
    title: string,
    x: number,
    y: number,
    continued: boolean
  ) {
    text(title + (continued ? " (continued)" : ""), x, y + 10, 14, RED, true)
    y += 26
    box(x, y, dateWidth, 26, RED)
    box(x + dateWidth, y, panelWidth - dateWidth, 26, RED)
    text("Date", x + 6, y + 13, 12, "#fff", true)
    text("Occasion", x + dateWidth + 6, y + 13, 12, "#fff", true)
    y += 26
    if (!rows.length) {
      box(x, y, panelWidth, 28)
      text("No marked dates in the selected months.", x + 6, y + 14, 10)
    }
    while (rows.length) {
      const row = rows[0]
      const remaining =
        Math.max(row.date.length, row.description.length) - row.offset
      const count = Math.min(remaining, Math.floor((BOTTOM - y - 10) / 17))
      if (count <= 0) return
      const height = count * 17 + 10
      box(x, y, dateWidth, height)
      box(x + dateWidth, y, panelWidth - dateWidth, height)
      for (let line = 0; line < count; line++) {
        text(row.date[row.offset + line] ?? "", x + 6, y + 13 + line * 17, 11)
        text(
          row.description[row.offset + line] ?? "",
          x + dateWidth + 6,
          y + 13 + line * 17,
          11
        )
      }
      row.offset += count
      y += height
      if (row.offset >= Math.max(row.date.length, row.description.length))
        rows.shift()
    }
  }

  newPage()
  let y = 70
  for (let i = 0; i < months.length; i++) {
    if (i > 0 && i % 6 === 0) {
      savePage()
      newPage()
      y = 70
    }
    drawMonth(
      months[i],
      MARGIN + (i % 3) * ((WIDTH - MARGIN * 2 - 24) / 3 + 12),
      y
    )
    if (i % 3 === 2 || i === months.length - 1) y += 212
  }
  const workingDays = months.reduce(
    (sum, { month }) =>
      sum +
      month.days.filter(
        (day) =>
          !day.isWeekend &&
          !day.entries.some(
            (entry) => entry.isActive && entry.kind === "HOLIDAY"
          )
      ).length,
    0
  )
  text(
    `Total Working Days: ${workingDays} days`,
    MARGIN,
    y + 8,
    14,
    "#111",
    true
  )
  text(
    "Selected months, excluding weekends and marked holidays.",
    MARGIN,
    y + 30,
    10,
    "#555"
  )
  text("Red dates indicate weekends or holidays.", MARGIN, y + 47, 10, RED)
  y += 70
  panel(events, "Important Dates", MARGIN, y, false)
  panel(holidays, "Holidays", MARGIN + panelWidth + 20, y, false)
  while (events.length || holidays.length) {
    savePage()
    newPage()
    if (events.length) panel(events, "Important Dates", MARGIN, 70, true)
    if (holidays.length)
      panel(holidays, "Holidays", MARGIN + panelWidth + 20, 70, true)
  }
  savePage()
  const first = months[0]
  const last = months[months.length - 1]
  pdf.save(
    `academic-calendar-${first.year}-${first.month.index}-to-${last.year}-${last.month.index}.pdf`
  )
}
