import { PageHeader } from "@/components/page-header"

import { AcademicCalendarSection } from "./sections/academic-calendar"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Academic Calendar"
        description="Holidays, events and the days the college does not teach."
      />
      <AcademicCalendarSection />
    </div>
  )
}
