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
  // Slip yang baru dibuat di sesi ini belum ada di data server, jadi form
  // mencarinya di store sesi sebelum menyatakan tidak ditemukan.
  return <PlacingSlipForm id={id} initial={slipById(id) ?? null} mode="edit" />
}
