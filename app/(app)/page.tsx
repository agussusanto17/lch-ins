import type { Metadata } from "next"

import { DashboardView } from "@/components/dashboard/dashboard-view"
import { listClaims, seedInitialClaimsIfEmpty } from "@/lib/server/claims"
import { listClients } from "@/lib/server/clients"
import { listPlacingSlips } from "@/lib/server/placing-slips"
import { listPolicies } from "@/lib/server/policies"

export const metadata: Metadata = { title: "Dashboard — LCH Insurance Brokers" }

export default async function DashboardPage() {
  // Dashboard menjumlahkan keempat koleksi yang sama dengan halaman
  // operasional, jadi sumbernya harus sama persis. Kalau tidak, angka di sini
  // berbeda dari isi tabel yang dirujuknya.
  //
  // listClients, listPolicies, dan listPlacingSlips mengisi data awal sendiri
  // saat tabelnya kosong; klaim perlu dipanggil terpisah. Tanpa itu Dashboard
  // menulis 0 klaim di database baru, lalu angkanya berubah begitu halaman
  // Klaim dibuka — padahal tidak ada yang menambah klaim.
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
