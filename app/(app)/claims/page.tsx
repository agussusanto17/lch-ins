import { PageHeader, PageShell } from "@/components/layout/page-header"
import { ClaimDialog } from "@/components/claims/claim-dialog"
import { ClaimsView } from "@/components/claims/claims-view"

export const metadata = { title: "Klaim — LCH Insurance Brokers" }

export default function ClaimsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Klaim"
        description="Manajemen klaim asuransi"
        actions={<ClaimDialog />}
      />
      <ClaimsView />
    </PageShell>
  )
}
