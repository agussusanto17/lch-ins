import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EndorsementDocument } from "@/components/documents/endorsement-document"
import { getEndorsementSlipData } from "@/lib/server/endorsement-slip"

export const metadata: Metadata = { title: "Endorsement — LCH Insurance Brokers" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getEndorsementSlipData(id)
  if (!data) notFound()
  return <EndorsementDocument data={data} />
}
