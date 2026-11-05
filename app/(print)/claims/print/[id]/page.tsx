import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ClaimDetailDocument } from "@/components/documents/claim-documents"
import { claimBackHref, parseClaimFilters } from "@/lib/claim-filter"
import {
  getClaimById,
  listClaimDocuments,
  listClaimFollowups,
} from "@/lib/server/claims"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const claim = await getClaimById(id)
  return {
    title: claim
      ? `Cetak Detail Klaim ${claim.claimNo} — LCH Insurance Brokers`
      : "Detail Klaim — LCH Insurance Brokers",
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    status?: string
    stage?: string
    cob?: string
    search?: string
  }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const claim = await getClaimById(id)
  if (!claim) notFound()

  const [documents, followups] = await Promise.all([
    listClaimDocuments(claim.id),
    listClaimFollowups(claim.id),
  ])

  const filters = parseClaimFilters(query)
  const backHref = claimBackHref(filters)

  return (
    <ClaimDetailDocument
      claim={claim}
      documents={documents}
      followups={followups}
      backHref={backHref}
    />
  )
}
