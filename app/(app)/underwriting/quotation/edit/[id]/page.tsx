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
  return <QuotationDraftForm id={id} initial={slipById(id) ?? null} />
}
