import type { Metadata } from "next"

import { ClosingInstructionDocument } from "@/components/documents/slip-documents"
import { policyNosForSlip } from "@/lib/server/auto-policies"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { slipAttachmentPrints } from "@/lib/server/slip-attachment-print"

export const metadata: Metadata = { title: "Closing Instruction — LCH Insurance Brokers" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = await getPlacingSlipById(id)
  const prints = slip ? await slipAttachmentPrints(slip.dbId ?? slip.id) : undefined
  // Polis yang tercatat dari CI ini, ditampilkan di atas dokumen (tidak tercetak).
  const linkedPolicies = slip ? await policyNosForSlip(slip.dbId ?? slip.id) : undefined
  return (
    <ClosingInstructionDocument
      id={id}
      initial={slip}
      prints={prints}
      linkedPolicies={linkedPolicies}
    />
  )
}
