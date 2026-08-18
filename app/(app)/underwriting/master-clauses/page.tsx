import { PageShell } from "@/components/layout/page-header"
import { MasterClauses } from "@/components/underwriting/master-clauses"

export const metadata = { title: "Master Clauses — LCH Insurance Brokers" }

export default function MasterClausesPage() {
  return (
    <PageShell>
      <MasterClauses />
    </PageShell>
  )
}
