import { PageShell } from "@/components/layout/page-header"
import { PolicyDatabase } from "@/components/policies/policy-database"

export const metadata = { title: "Policy Database — LCH Insurance Brokers" }

export default function PoliciesPage() {
  return (
    <PageShell>
      <PolicyDatabase />
    </PageShell>
  )
}
