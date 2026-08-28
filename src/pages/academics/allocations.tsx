import { PageHeader } from "@/components/page-header"

import { AllocationsTab } from "../academics/tabs/allocations"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Subject Allocations"
        description="Who teaches what, to which batch. Creating one makes a class."
      />
      <AllocationsTab />
    </div>
  )
}
