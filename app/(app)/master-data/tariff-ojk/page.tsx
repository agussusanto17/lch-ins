import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { TariffOjkTab } from "@/components/master-data/tariff-ojk-tab"
import {
  listBiScales,
  listLossLimitScales,
  listOccupations,
  listTariffEqProperty,
  listTariffFlood,
} from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Tarif Baku OJK — LCH Insurance Brokers",
}

export default async function MasterDataTariffOjkPage() {
  await requireAccess("/master-data")

  const [
    initialOccupations,
    tariffEqProperty,
    tariffFlood,
    biScales,
    lossLimitScales,
  ] = await Promise.all([
    listOccupations(),
    listTariffEqProperty(),
    listTariffFlood(),
    listBiScales(),
    listLossLimitScales(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Tarif Baku OJK"
        description="Batas tarif dari ketentuan OJK, dipakai sebagai acuan rate di placing slip."
      />
      <TariffOjkTab
        initialOccupations={initialOccupations}
        tariffEqProperty={tariffEqProperty}
        tariffFlood={tariffFlood}
        biScales={biScales}
        lossLimitScales={lossLimitScales}
      />
    </PageShell>
  )
}
