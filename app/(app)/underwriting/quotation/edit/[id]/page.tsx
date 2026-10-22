import type { Metadata } from "next"

import { QuotationDraftForm } from "@/components/underwriting/quotation-draft-form"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { slipById } from "@/lib/data"

export const metadata: Metadata = {
  title: "Quotation Slip — LCH Insurance Brokers",
}

export default async function QuotationDraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = (await getPlacingSlipById(id)) ?? slipById(id) ?? null
  return <QuotationDraftForm id={id} initial={slip} />
}
