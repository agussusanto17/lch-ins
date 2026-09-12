import { ClosingInstructionDocument } from "@/components/documents/slip-documents"
import { SLIPS, slipById } from "@/lib/data"

export const metadata = { title: "Closing Instruction — LCH Insurance Brokers" }

export function generateStaticParams() {
  return SLIPS.map((s) => ({ id: s.id }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ClosingInstructionDocument id={id} initial={slipById(id) ?? null} />
}
