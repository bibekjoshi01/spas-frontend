import { useState } from "react"
import { Palette } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useIsSuperUser } from "@/hooks/use-has-permissions"

import { AcademicCalendarSection } from "./sections/academic-calendar"
import { CalendarThemeDialog } from "./sections/calendar-theme-dialog"

export default function Page() {
  const isSuperUser = useIsSuperUser()
  const [showTheme, setShowTheme] = useState(false)

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Academic Calendar"
        description="Holidays, events and the days the college does not teach."
        actions={
          isSuperUser ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTheme(true)}
            >
              <Palette className="size-4" aria-hidden />
              Theme
            </Button>
          ) : null
        }
      />
      <AcademicCalendarSection />
      {showTheme && <CalendarThemeDialog onClose={() => setShowTheme(false)} />}
    </div>
  )
}
