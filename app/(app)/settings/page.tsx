import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = { title: "Pengaturan — LCH Insurance Brokers" }

export default function SettingsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Pengaturan"
        description="Identitas perusahaan, format penomoran dokumen, dan default perhitungan"
      />
      <ModulePlaceholder
        phase="Usulan tambahan"
        week="menyusul persetujuan LCH"
        features={[
          "Kop surat, logo, alamat, dan NPWP untuk dokumen cetak",
          "Format penomoran slip, Debit Note, Credit Note, dan polis",
          "Default PPN, PPh 23, biaya polis, dan materai",
          "Rekening bank yang tampil di Debit Note",
        ]}
        pending={[
          "Konfirmasi apakah modul ini dipakai, karena di luar daftar 14 menu awal",
          "File logo resolusi tinggi dan kop surat LCH",
        ]}
      />
    </PageShell>
  )
}
