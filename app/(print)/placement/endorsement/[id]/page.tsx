import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EndorsementSlipDocument } from "@/components/documents/endorsement-slip-document"
import { getEndorsementSlipPrint } from "@/lib/server/endorsement-slip"

export const metadata: Metadata = { title: "Endorsement Slip — LCH Insurance Brokers" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getEndorsementSlipPrint(id)
  if (!data) notFound()
  return <EndorsementSlipDocument data={data} />
}
