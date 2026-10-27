import { redirect } from "next/navigation"

import { ClauseForm } from "@/components/underwriting/clause-form"
import { canManage } from "@/lib/access"
import {
  listCobOptions,
  listCoverTypeOptions,
  listSourceGroups,
} from "@/lib/server/clauses"
import { currentUser } from "@/lib/server/session"

export const metadata = { title: "Clause Baru — LCH Insurance Brokers" }

// Halaman ini membaca master data dari database, jadi tidak boleh di-prerender
// saat build. Server build tidak punya koneksi database.
export const dynamic = "force-dynamic"

export default async function NewClausePage() {
  const user = await currentUser()
  if (!user || !canManage(user.roles, "/underwriting/master-clauses")) {
    redirect("/underwriting/master-clauses")
  }

  const [cobs, coverTypes, groups] = await Promise.all([
    listCobOptions(),
    listCoverTypeOptions(),
    listSourceGroups(),
  ])
  return (
    <ClauseForm
      mode="new"
      canManage={true}
      cobs={cobs}
      coverTypes={coverTypes}
      groups={groups}
    />
  )
}
