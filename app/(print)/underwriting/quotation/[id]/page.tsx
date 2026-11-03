import type { Metadata } from "next"

import { QuotationSlipDocument } from "@/components/documents/slip-documents"
import { getPlacingSlipById } from "@/lib/server/placing-slips"

export const metadata: Metadata = { title: "Quotation Slip — LCH Insurance Brokers" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = await getPlacingSlipById(id)
  return <QuotationSlipDocument id={id} initial={slip} />
}
