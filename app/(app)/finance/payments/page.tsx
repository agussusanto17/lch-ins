import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = { title: "Pembayaran — LCH Insurance Brokers" }

export default function FinancePaymentsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Pembayaran"
        description="Pencatatan penerimaan premi dari tertanggung dan penyetoran ke asuransi"
      />
      <ModulePlaceholder
        phase="Bagian B · Finance"
        week="minggu 5 sampai 9"
        features={[
          "Catat penerimaan premi, penuh maupun cicilan, dengan bukti transfer",
          "Alokasi pembayaran ke Debit Note yang sesuai",
          "Penyetoran premi ke asuransi setelah dipotong brokerage",
          "Dana premi titipan yang belum disetor ke asuransi",
          "Rekonsiliasi ke rekening bank LCH",
        ]}
        pending={[
          "Daftar rekening bank LCH yang dipakai menerima premi",
          "Batas waktu setor premi ke tiap asuransi",
          "Perlakuan premi yang dibayar langsung tertanggung ke asuransi",
        ]}
      />
    </PageShell>
  )
}
