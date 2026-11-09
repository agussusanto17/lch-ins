import type { Metadata } from "next"

import { CoverNoteDocument } from "@/components/documents/slip-documents"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { slipAttachmentPrints } from "@/lib/server/slip-attachment-print"

export const metadata: Metadata = { title: "Cover Note — LCH Insurance Brokers" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = await getPlacingSlipById(id)
  const prints = slip ? await slipAttachmentPrints(slip.dbId ?? slip.id) : undefined
  return <CoverNoteDocument id={id} initial={slip} prints={prints} />
}
