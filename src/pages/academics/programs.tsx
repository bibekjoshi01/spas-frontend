import { PageHeader } from "@/components/page-header"

import { ProgramsSection } from "../academics/sections/programs"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Programs"
        description="Degrees a department runs, and who coordinates each one."
      />
      <ProgramsSection />
    </div>
  )
}
