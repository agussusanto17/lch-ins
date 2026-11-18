import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ReportCatalog } from "@/components/reports/report-catalog"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = { title: "Report — LCH Insurance Brokers" }

export default async function ReportExcelPage() {
  await requireAccess("/report-excel")
  return (
    <PageShell>
      <PageHeader
        title="Report"
        description="Pilih report, isi periodenya, lalu file Excel langsung terunduh."
      />
      <ReportCatalog />
    </PageShell>
  )
}
