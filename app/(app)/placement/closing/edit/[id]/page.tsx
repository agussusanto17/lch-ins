import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { FormOptionsBoundary } from "@/components/shared/form-options-boundary"
import { ClosingDraftForm } from "@/components/underwriting/closing-draft-form"
import { canManage } from "@/lib/access"
import { listInsuredOptions } from "@/lib/server/clients"
import { currentUser } from "@/lib/server/session"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import { listVehicleOptions } from "@/lib/server/vehicles"

export const metadata: Metadata = {
  title: "Closing Instruction — LCH Insurance Brokers",
}

export default async function ClosingDraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await currentUser()
  if (!user || !canManage(user.roles, "/placement")) {
    redirect("/placement")
  }

  const { id } = await params
  const [slip, vehicleOptions, clients] = await Promise.all([
    getPlacingSlipById(id),
    listVehicleOptions(),
    listInsuredOptions(),
  ])
  return (
    <FormOptionsBoundary>
      <ClosingDraftForm
        id={id}
        initial={slip}
        vehicleOptions={vehicleOptions}
        clients={clients}
      />
    </FormOptionsBoundary>
  )
}
