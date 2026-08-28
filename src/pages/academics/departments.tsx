import { PageHeader } from "@/components/page-header"

import { DepartmentsTab } from "../academics/tabs/departments"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Departments"
        description="The divisions that own programmes and teaching staff."
      />
      <DepartmentsTab />
    </div>
  )
}
