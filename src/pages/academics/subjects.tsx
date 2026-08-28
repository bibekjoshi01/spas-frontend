import { PageHeader } from "@/components/page-header"

import { SubjectsSection } from "../academics/sections/subjects"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Subjects"
        description="The curriculum: what is taught, in which semester of which programme."
      />
      <SubjectsSection />
    </div>
  )
}
