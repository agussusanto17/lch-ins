import type { Metadata } from "next"

import { QuotationSlipDocument } from "@/components/documents/slip-documents"
import { listDocumentSignatories } from "@/lib/server/document-signatories"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { slipAttachmentPrints } from "@/lib/server/slip-attachment-print"

export const metadata: Metadata = { title: "Quotation Slip — LCH Insurance Brokers" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Tanda tangan LCH yang bisa dipilih di toolbar cetak (Harry, 19 November 2026).
  const [slip, signatories] = await Promise.all([
    getPlacingSlipById(id),
    listDocumentSignatories(),
  ])
  const prints = slip ? await slipAttachmentPrints(slip.dbId ?? slip.id) : undefined
  return (
    <QuotationSlipDocument id={id} initial={slip} prints={prints} signatories={signatories} />
  )
}
