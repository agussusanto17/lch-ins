import type { Metadata } from "next"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { slipById } from "@/lib/data"

export const metadata: Metadata = {
  title: "Edit Placing Slip — LCH Insurance Brokers",
}

export default async function EditSlipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = (await getPlacingSlipById(id)) ?? slipById(id) ?? null

  return <PlacingSlipForm id={id} initial={slip} mode="edit" />
}
