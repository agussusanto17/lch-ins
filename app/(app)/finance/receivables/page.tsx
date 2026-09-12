import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = {
  title: "Piutang & Hutang Premi — LCH Insurance Brokers",
}

export default function FinanceReceivablesPage() {
  return (
    <PageShell>
      <PageHeader
        title="Piutang & Hutang Premi"
        description="Umur piutang premi tertanggung dan hutang premi ke asuransi"
      />
      <ModulePlaceholder
        phase="Bagian B · Finance"
        week="minggu 5 sampai 9"
        features={[
          "Aging piutang premi per tertanggung dan per polis",
          "Aging hutang premi per asuransi",
          "Peringatan jatuh tempo dan polis berisiko lapse",
          "Rekap brokerage yang sudah dan belum diterima",
          "Export ke Excel untuk rapat bulanan",
        ]}
        pending={[
          "Kelompok umur piutang yang dipakai LCH, misalnya 0-30, 31-60, 61-90",
          "Tenggang waktu pembayaran premi menurut polis",
        ]}
      />
    </PageShell>
  )
}
