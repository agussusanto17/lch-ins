"use client"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import type { PlacingSlip, VehicleBrandOption } from "@/lib/data"
import type { InsuredOption } from "@/lib/server/clients"

export { panelIssues } from "@/components/underwriting/placing-slip-form"

/** PlacingSlipForm in closing mode, with subjectivity, security, and closing instruction panels. */
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
