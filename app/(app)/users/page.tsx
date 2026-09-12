import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/shared/module-placeholder"

export const metadata = { title: "Pengguna — LCH Insurance Brokers" }

export default function UsersPage() {
  return (
    <PageShell>
      <PageHeader
        title="Pengguna"
        description="Daftar pengguna LCH dan role masing-masing"
      />
      <ModulePlaceholder
        phase="Bagian A · Underwriting"
        week="minggu 3 sampai 4"
        features={[
          "Tambah pengguna, atur role, aktifkan dan nonaktifkan",
          "Reset password",
          "Role: Admin, Marketing, Placement/Teknik, Klaim, Finance",
          "Hak akses per menu diatur di config kode, tidak ada halaman permission",
        ]}
        pending={[
          "Daftar nama, email, dan role tiap pengguna",
          "Isian Google Sheet hak akses per role",
        ]}
      />
    </PageShell>
  )
}
