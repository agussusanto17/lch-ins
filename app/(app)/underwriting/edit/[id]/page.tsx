import { notFound } from "next/navigation"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import { SLIPS, slipById } from "@/lib/data"

export function generateStaticParams() {
  return SLIPS.map((s) => ({ id: s.id }))
}

export default async function EditSlipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slip = slipById(id)
  if (!slip) notFound()
  return <PlacingSlipForm initial={slip} mode="edit" />
}
