import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { DashboardView } from "@/components/dashboard/dashboard-view"
import { currentUser } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Ganti Kata Sandi — LCH Insurance Brokers",
}

export default async function ChangePasswordPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  if (!user.mustChangePassword) {
    redirect("/")
  }

  // Dashboard di sini cuma latar dialog ganti kata sandi wajib, jadi datanya sengaja kosong:
  // yang belum selesai login tidak perlu melihat angka produksi.
  return (
    <DashboardView
      initialClients={[]}
      initialPolicies={[]}
      initialClaims={[]}
      initialSlips={[]}
    />
  )
}
