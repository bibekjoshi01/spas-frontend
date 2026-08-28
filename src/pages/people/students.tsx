import { PageHeader } from "@/components/page-header"

import { StudentsTab } from "../people/tabs/students"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Students"
        description="Everyone admitted, and which batch they belong to."
      />
      <StudentsTab />
    </div>
  )
}
