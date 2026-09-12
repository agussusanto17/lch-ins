import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = {
  title: "Debit Note & Credit Note — LCH Insurance Brokers",
}

export default function FinanceNotesPage() {
  return (
    <PageShell>
      <PageHeader
        title="Debit Note & Credit Note"
        description="Penerbitan DN ke tertanggung dan CN ke asuransi dari polis yang sudah terbit"
      />
      <ModulePlaceholder
        phase="Bagian B · Finance"
        week="minggu 5 sampai 9"
        features={[
          "Buat Debit Note dari polis, nomor otomatis {urut}/DNLCH/{bulan}/{tahun}",
          "Credit Note per cicilan, nomor {urut}/CNLCH/{bulan}/{tahun}-{cicilan}",
          "Rincian premi, diskon, biaya polis, materai, PPN 11%, dan PPh 23",
          "Pembagian share co-insurance per asuransi",
          "Cetak PDF dengan kop surat LCH dan kirim ke tertanggung",
        ]}
        pending={[
          "Contoh Debit Note dan Credit Note yang sedang dipakai",
          "Aturan reset nomor urut, per bulan atau per tahun",
          "Arah Credit Note, ke asuransi atau ke tertanggung",
        ]}
      />
    </PageShell>
  )
}
