"use client"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import type { PlacingSlip, VehicleBrandOption } from "@/lib/data"
import type { InsuredOption } from "@/lib/server/clients"

export { panelIssues } from "@/components/underwriting/placing-slip-form"

/**
 * Tahap Cover Note & Closing Instruction (MoM review Phase 1, poin 8): PlacingSlipForm mode
 * closing, satu-satunya tahap dengan isian Closing Instruction dan Catatan Cover Note.
 */
export function ClosingDraftForm({
  id,
  initial,
  vehicleOptions,
  clients = [],
}: {
  id: string
  initial: PlacingSlip | null
  vehicleOptions?: VehicleBrandOption[]
  clients?: InsuredOption[]
}) {
  return (
    <PlacingSlipForm
      id={id}
      initial={initial}
      mode="closing"
      vehicleOptions={vehicleOptions}
      clients={clients}
    />
  )
}
