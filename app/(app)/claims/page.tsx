import { PageShell } from "@/components/layout/page-header"
import { ClaimsView } from "@/components/claims/claims-view"

export const metadata = { title: "Klaim — LCH Insurance Brokers" }

export default function ClaimsPage() {
  return (
    <PageShell>
      <ClaimsView />
    </PageShell>
  )
}
