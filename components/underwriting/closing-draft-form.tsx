"use client"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import type { PlacingSlip, VehicleBrandOption } from "@/lib/data"
import type { InsuredOption } from "@/lib/server/clients"

export { panelIssues } from "@/components/underwriting/placing-slip-form"

/**
 * ClosingDraftForm delegating to PlacingSlipForm in closing mode.
 * Displays full placing slip input menus along with subjectivity, security panel, and closing instruction.
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
