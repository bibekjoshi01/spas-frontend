import { PageHeader } from "@/components/page-header"

import { AccountsSection } from "../people/sections/accounts"

export default function Page() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 md:p-4">
      <PageHeader
        title="Accounts & Roles"
        description="Who can sign in, and what their role lets them do."
      />
      <AccountsSection />
    </div>
  )
}
