import type { Metadata } from "next"

import { ClaimListDocument } from "@/components/documents/claim-documents"
import { filterClaims, parseClaimFilters } from "@/lib/claim-filter"
import { todayIso } from "@/lib/date"
import { listClaims } from "@/lib/server/claims"

export const metadata: Metadata = {
  title: "Cetak Daftar Klaim — LCH Insurance Brokers",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    stage?: string
    cob?: string
    search?: string
  }>
}) {
  const params = await searchParams
  const filters = parseClaimFilters(params)
  const today = todayIso()
  const allClaims = await listClaims()
  const rows = filterClaims(allClaims, filters)

  return <ClaimListDocument rows={rows} filters={filters} today={today} />
}
