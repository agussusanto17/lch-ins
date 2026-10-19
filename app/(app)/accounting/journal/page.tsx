import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = { title: "Jurnal — LCH Insurance Brokers" }

export default function AccountingJournalPage() {
  return (
    <PageShell>
      <PageHeader
        title="Jurnal"
        description="Chart of account dan jurnal yang terbentuk dari transaksi finance"
      />
      <ModulePlaceholder
        phase="Bagian C · Akuntansi"
        week="minggu 10 sampai 12"
        features={[
          "Chart of account yang bisa diatur sendiri oleh LCH",
          "Jurnal otomatis dari Debit Note, Credit Note, dan pembayaran",
          "Jurnal manual untuk penyesuaian dan koreksi",
          "Buku besar dan sub ledger per akun",
          "Tutup buku per bulan",
        ]}
        pending={[
          "Chart of account yang sekarang dipakai di Excel",
          "Contoh jurnal untuk satu polis dari terbit sampai lunas",
          "Perlakuan PPh 23 dan PPN brokerage 2,2% di jurnal",
        ]}
      />
    </PageShell>
  )
}
