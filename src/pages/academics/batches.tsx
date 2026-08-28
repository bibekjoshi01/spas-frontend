import { PageHeader } from "@/components/page-header"

import { BatchesSection } from "../academics/sections/batches"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Batches"
        description="Intake cohorts, and the semesters each has sat. Promotion happens here."
      />
      <BatchesSection />
    </div>
  )
}
