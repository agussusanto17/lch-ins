import type { Metadata } from "next"

import { DashboardView } from "@/components/dashboard/dashboard-view"
import { listClaims, seedInitialClaimsIfEmpty } from "@/lib/server/claims"
import { listClients } from "@/lib/server/clients"
import { listPlacingSlips } from "@/lib/server/placing-slips"
import { listPolicies } from "@/lib/server/policies"

export const metadata: Metadata = { title: "Dashboard — LCH Insurance Brokers" }

export default async function DashboardPage() {
  // Sumbernya harus sama persis dengan halaman operasional supaya angkanya cocok dengan tabel.
  // Hanya klaim yang tidak mengisi data awal sendiri saat tabel kosong, jadi di-seed di sini.
  await seedInitialClaimsIfEmpty()

  const [initialClients, initialPolicies, initialClaims, initialSlips] =
    await Promise.all([
      listClients(),
      listPolicies(),
      listClaims(),
      listPlacingSlips(),
    ])

  return (
    <DashboardView
      initialClients={initialClients}
      initialPolicies={initialPolicies}
      initialClaims={initialClaims}
      initialSlips={initialSlips}
    />
  )
}
