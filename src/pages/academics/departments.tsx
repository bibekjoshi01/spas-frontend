import { PageHeader } from "@/components/page-header"

import { DepartmentsSection } from "../academics/sections/departments"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Departments"
        description="The divisions that own programmes and teaching staff."
      />
      <DepartmentsSection />
    </div>
  )
}
