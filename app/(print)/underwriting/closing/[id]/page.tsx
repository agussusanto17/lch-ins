import type { Metadata } from "next"

import { ClosingInstructionDocument } from "@/components/documents/slip-documents"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { slipById } from "@/lib/data"

export const metadata: Metadata = { title: "Closing Instruction — LCH Insurance Brokers" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = (await getPlacingSlipById(id)) ?? slipById(id) ?? null
  return <ClosingInstructionDocument id={id} initial={slip} />
}
