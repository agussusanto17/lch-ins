import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ExportButtons } from "@/components/shared/table-toolbar"
import { ReportView } from "@/components/reports/report-view"

export const metadata = { title: "Report — LCH Insurance Brokers" }

export default function ReportsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Report"
        description="Laporan periodik produksi, polis, dan klaim"
        actions={<ExportButtons />}
      />
      <ReportView />
    </PageShell>
  )
}
