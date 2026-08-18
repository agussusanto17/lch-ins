import { PageHeader, PageShell } from "@/components/layout/page-header"
import { PolicyDatabase } from "@/components/policies/policy-database"
import { PolicyDialog } from "@/components/policies/policy-dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export const metadata = { title: "Policy Database — LCH Insurance Brokers" }

export default function PoliciesPage() {
  return (
    <PageShell>
      <PageHeader
        title="Policy Database"
        description="Database polis asuransi beserta softcopy dokumen"
        actions={
          <>
            <Button variant="outline">
              <Upload data-icon="inline-start" />
              Upload Polis
            </Button>
            <PolicyDialog />
          </>
        }
      />
      <PolicyDatabase />
    </PageShell>
  )
}
