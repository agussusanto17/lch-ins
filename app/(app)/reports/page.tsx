import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ExportButtons } from "@/components/shared/table-toolbar"
import { ReportView } from "@/components/reports/report-view"
import { listClaims } from "@/lib/server/claims"
import { listPolicies } from "@/lib/server/policies"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Report — LCH Insurance Brokers" }

export default async function ReportsPage() {
  const user = await requireAccess("/reports")
  const isPlacementOnly =
    user.roles.includes("placement") && !user.roles.includes("admin")
  const [policies, claims] = await Promise.all([
    listPolicies(),
    isPlacementOnly ? Promise.resolve([]) : listClaims(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Report"
        description="Laporan periodik produksi, polis, dan klaim"
        actions={<ExportButtons />}
      />
      <ReportView
        policies={policies}
        claims={claims}
        showClaims={!isPlacementOnly}
      />
    </PageShell>
  )
}
