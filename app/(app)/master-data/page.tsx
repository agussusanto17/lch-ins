import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = { title: "Master Data — LCH Insurance Brokers" }

export default function MasterDataPage() {
  return (
    <PageShell>
      <PageHeader
        title="Master Data"
        description="Sumber semua pilihan dropdown di form, bisa diubah LCH tanpa developer"
      />
      <ModulePlaceholder
        phase="Bagian A · Underwriting"
        week="minggu 3 sampai 4"
        features={[
          "COB dan type of cover beserta kodenya",
          "Okupasi dan tarif OJK, zona gempa, tarif banjir, skala BI",
          "Asuransi rekanan dan adjuster",
          "Wording form, mata uang, rekening bank",
          "Daftar pilihan pendek seperti status klien, tipe polis, dan status klaim",
          "Data yang sudah terpakai dinonaktifkan, tidak dihapus",
        ]}
        pending={[
          "Daftar asuransi rekanan dan adjuster yang dipakai",
          "Daftar wording form",
          "Pemetaan 10 kelompok klausul ke COB dan type of cover",
        ]}
      />
    </PageShell>
  )
}
