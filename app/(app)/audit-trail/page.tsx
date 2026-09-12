import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = { title: "Audit Trail — LCH Insurance Brokers" }

export default function AuditTrailPage() {
  return (
    <PageShell>
      <PageHeader
        title="Audit Trail"
        description="Catatan siapa mengubah apa dan kapan"
      />
      <ModulePlaceholder
        phase="Usulan tambahan"
        week="menyusul persetujuan LCH"
        features={[
          "Log perubahan pada placing slip, polis, klaim, DN, CN, dan pembayaran",
          "Nilai sebelum dan sesudah diubah",
          "Filter per pengguna, per modul, dan per tanggal",
          "Tidak bisa dihapus dari aplikasi",
        ]}
        pending={[
          "Konfirmasi apakah modul ini dipakai, karena di luar daftar 14 menu awal",
        ]}
      />
    </PageShell>
  )
}
