import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = { title: "Laporan Keuangan — LCH Insurance Brokers" }

export default function AccountingStatementsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Laporan Keuangan"
        description="Neraca saldo, laba rugi, dan neraca dari jurnal yang sudah diposting"
      />
      <ModulePlaceholder
        phase="Bagian C · Akuntansi"
        week="minggu 10 sampai 12"
        features={[
          "Neraca saldo per periode",
          "Laporan laba rugi",
          "Neraca",
          "Perbandingan antar periode",
          "Export ke Excel dan PDF",
        ]}
        pending={[
          "Format laporan yang diminta OJK untuk pialang asuransi",
          "Periode pelaporan, bulanan atau triwulanan",
        ]}
      />
    </PageShell>
  )
}
