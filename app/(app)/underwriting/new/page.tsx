import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import { emptySlip } from "@/components/underwriting/slip-model"

export const metadata = { title: "Buat Placing Slip — LCH Insurance Brokers" }

export default function NewSlipPage() {
  return <PlacingSlipForm initial={emptySlip()} mode="new" />
}
