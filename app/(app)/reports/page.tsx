import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ExportButtons } from "@/components/shared/table-toolbar"
import { ReportView } from "@/components/reports/report-view"
import { canSeeReportClaims } from "@/lib/access"
import { listClaims } from "@/lib/server/claims"
import { listPolicies } from "@/lib/server/policies"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Report Operational — LCH Insurance Brokers" }

export default async function ReportsPage() {
  const user = await requireAccess("/reports")
  // Data klaim tidak diambil untuk pengguna yang tidak boleh melihatnya.
  const showClaims = canSeeReportClaims(user.roles)
  const [policies, claims] = await Promise.all([
    listPolicies(),
    showClaims ? listClaims() : Promise.resolve([]),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Report Operational"
        description="Laporan periodik produksi, polis, dan klaim"
        actions={<ExportButtons />}
      />
      <ReportView
        policies={policies}
        claims={claims}
        showClaims={showClaims}
      />
    </PageShell>
  )
}
