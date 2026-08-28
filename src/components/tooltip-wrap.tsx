import React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type TooltipWrapProps = {
  tooltip: React.ReactNode
  children: React.ReactNode
}

export default function TooltipWrap({ tooltip, children }: TooltipWrapProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
