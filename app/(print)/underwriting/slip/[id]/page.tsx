import type { Metadata } from "next"

import { PlacingSlipDocument } from "@/components/documents/slip-documents"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { slipById } from "@/lib/data"

export const metadata: Metadata = { title: "Placing Slip — LCH Insurance Brokers" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = (await getPlacingSlipById(id)) ?? slipById(id) ?? null
  return <PlacingSlipDocument id={id} initial={slip} />
}
