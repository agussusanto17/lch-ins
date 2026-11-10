import type { Metadata } from "next"

import { ClosingInstructionDocument } from "@/components/documents/slip-documents"
import { canManage } from "@/lib/access"
import { policyNosForSlip } from "@/lib/server/auto-policies"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { currentUser } from "@/lib/server/session"
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
  // Tombol "Catat polis" hanya untuk yang boleh mengelola Policy Database.
  const user = await currentUser()
  const canRecordPolicy = user ? canManage(user.roles, "/policies") : false
  return (
    <ClosingInstructionDocument
      id={id}
      initial={slip}
      prints={prints}
      linkedPolicies={linkedPolicies}
      canRecordPolicy={canRecordPolicy}
    />
  )
}
