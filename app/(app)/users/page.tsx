import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { UserTable } from "@/components/users/user-table"
import { requireAdmin } from "@/lib/server/session"
import { listUsers } from "@/lib/server/users"

export const metadata: Metadata = {
  title: "Manajemen Pengguna — LCH Insurance Brokers",
  description: "Kelola akun pengguna, penugasan hak akses multi-role, dan kredensial.",
}

export default async function UsersPage() {
  const currentAdmin = await requireAdmin("/users")
  const users = await listUsers()

  return (
    <PageShell>
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun pengguna, hak akses multi-role, dan kata sandi operasional sistem."
      />
      <UserTable initialUsers={users} currentUserId={currentAdmin.id} />
    </PageShell>
  )
}
