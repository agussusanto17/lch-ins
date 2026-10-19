import { QuotationSlipDocument } from "@/components/documents/slip-documents"
import { SLIPS, slipById } from "@/lib/data"

export const metadata = { title: "Quotation Slip — LCH Insurance Brokers" }

export function generateStaticParams() {
  return SLIPS.map((s) => ({ id: s.id }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <QuotationSlipDocument id={id} initial={slipById(id) ?? null} />
}
