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

  // Dashboard di sini cuma latar di belakang dialog ganti kata sandi yang
  // wajib. Datanya sengaja kosong: orang yang belum menyelesaikan login tidak
  // perlu melihat angka produksi, dan kuerinya pun mubazir karena halamannya
  // tidak bisa dipakai. Setelah kata sandi diganti, redirect ke "/" merender
  // Dashboard yang sebenarnya.
  return (
    <DashboardView
      initialClients={[]}
      initialPolicies={[]}
      initialClaims={[]}
      initialSlips={[]}
    />
  )
}
