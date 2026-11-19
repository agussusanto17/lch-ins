import type { Metadata } from "next"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { SignaturesTab } from "@/components/master-data/signatures-tab"
import { listDocumentSignatories } from "@/lib/server/document-signatories"
import { requireAccess } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Tanda Tangan — LCH Insurance Brokers",
}

export default async function MasterDataSignaturesPage() {
  await requireAccess("/master-data")

  const initialSignatories = await listDocumentSignatories()

  return (
    <PageShell>
      <PageHeader
        title="Tanda Tangan"
        description="Tanda tangan dan cap LCH di cetak Placing Slip, Quotation Slip, dan Closing Instruction. Di halaman cetak, yang default terpilih otomatis dan bisa diganti atau dikosongkan."
      />
      <SignaturesTab initialSignatories={initialSignatories} />
    </PageShell>
  )
}
