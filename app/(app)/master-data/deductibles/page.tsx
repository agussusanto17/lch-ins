import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { DeductibleOptionsTab } from "@/components/master-data/deductible-options-tab"
import { getFormOptions } from "@/lib/server/form-options"
import { listDeductibleOptions } from "@/lib/server/master-data"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Deductible | LCH Insurance Brokers",
}

export default async function MasterDataDeductiblesPage() {
  await requireAccess("/master-data")

  const [initialOptions, formOptions] = await Promise.all([
    listDeductibleOptions(),
    getFormOptions(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Deductible"
        description="Pilihan deductible per type of cover yang bisa dipilih di placing slip."
      />
      <DeductibleOptionsTab initialOptions={initialOptions} cobs={formOptions.cobs} />
    </PageShell>
  )
}
