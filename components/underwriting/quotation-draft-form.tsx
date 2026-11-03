"use client"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import type { PlacingSlip, VehicleBrandOption } from "@/lib/data"
import type { InsuredOption } from "@/lib/server/clients"

export { panelIssues } from "@/components/underwriting/placing-slip-form"

/**
 * QuotationDraftForm delegating to PlacingSlipForm in quotation mode.
 * Displays full placing slip input menus along with subjectivity and security panel.
 */
export function QuotationDraftForm({
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
      mode="quotation"
      vehicleOptions={vehicleOptions}
      clients={clients}
    />
  )
}
