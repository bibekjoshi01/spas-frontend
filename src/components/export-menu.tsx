import { FileDown } from "lucide-react"

import { InlineSpinner } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ExportFormat } from "@/lib/spreadsheet-export"

export function ExportMenu({
  exporting,
  disabled,
  onExport,
  label = "Export",
}: {
  exporting: ExportFormat | null
  disabled?: boolean
  onExport: (format: ExportFormat) => void
  label?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || !!exporting}>
          {exporting ? (
            <InlineSpinner />
          ) : (
            <FileDown className="size-4" aria-hidden />
          )}
          {exporting ? `Preparing ${exporting.toUpperCase()}…` : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[120]">
        <DropdownMenuItem onClick={() => onExport("xlsx")}>
          Excel workbook (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("csv")}>
          CSV spreadsheet (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("pdf")}>
          PDF document (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
