import { notFound } from "next/navigation"

import { QuotationDraftForm } from "@/components/underwriting/quotation-draft-form"
import { SLIPS, slipById } from "@/lib/data"

export function generateStaticParams() {
  return SLIPS.map((s) => ({ id: s.id }))
}

export default async function QuotationDraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = slipById(id)
  if (!slip) notFound()
  return <QuotationDraftForm slip={slip} />
}
