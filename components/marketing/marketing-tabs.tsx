"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import { usePermission } from "@/components/auth/permission-provider"
import { PageHeader } from "@/components/layout/page-header"
import { ClientForm } from "@/components/marketing/client-form"
import { ClientTable } from "@/components/marketing/client-table"
import { RenewalNotice } from "@/components/marketing/renewal-notice"
import { SppaTable } from "@/components/marketing/sppa-table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Client, Policy, VehicleBrandOption } from "@/lib/data"
import { parseRenewalCob, parseRenewalPeriod } from "@/lib/renewal"
import type { ClientRecord } from "@/lib/server/clients"
import type { SppaRecord } from "@/lib/server/sppa"
import { store, useCollection } from "@/lib/store"
import { replaceQuery } from "@/lib/url-query"

const TABS = ["clients", "sppa", "renewal"] as const

interface MarketingTabsProps {
  initialClients?: ClientRecord[]
  initialSppa?: SppaRecord[]
  initialPolicies?: Policy[]
  vehicleOptions?: VehicleBrandOption[]
}

export function MarketingTabs({
  initialClients,
  initialSppa,
  initialPolicies,
  vehicleOptions,
}: MarketingTabsProps) {
  // Read from the URL, not server props: going back from a print page restores
  // cached props from the first load, but keeps the URL the user left.
  const searchParams = useSearchParams()
  const [tab, setTab] = React.useState<string>(
    () => TABS.find((t) => t === searchParams.get("tab")) ?? "clients"
  )

  React.useEffect(() => {
    if (initialSppa) store.hydrate("sppa", initialSppa)
  }, [initialSppa])

  const sppaCount = useCollection("sppa", initialSppa).length
  // ClientTable menghidrasi koleksi ini, jadi klien yang baru ditambah ikut muncul.
  const clients = useCollection("clients", initialClients)
  const permission = usePermission()
  const canManageMarketing = permission.canManage("/marketing")
  const [form, setForm] = React.useState<{
    key: number
    client: Client | null
  } | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        description="Database klien dan KYC, SPPA, serta renewal notice"
        actions={
          canManageMarketing ? (
            <Button
              onClick={() =>
                setForm((prev) => ({ key: (prev?.key ?? 0) + 1, client: null }))
              }
            >
              <Plus data-icon="inline-start" />
              Tambah Klien
            </Button>
          ) : null
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(String(value))
          replaceQuery({ tab: value === "clients" ? null : String(value) })
        }}
        className="flex flex-col gap-4"
      >
        <TabsList className="no-print">
          <TabsTrigger value="clients">Database Klien</TabsTrigger>
          <TabsTrigger value="sppa">SPPA ({sppaCount})</TabsTrigger>
          <TabsTrigger value="renewal">Renewal Notice</TabsTrigger>
        </TabsList>
        <TabsContent value="clients">
          <ClientTable
            initialClients={initialClients}
            onEdit={(client) =>
              setForm((prev) => ({ key: (prev?.key ?? 0) + 1, client }))
            }
          />
        </TabsContent>
        <TabsContent value="sppa">
          <SppaTable
            initialSppa={initialSppa}
            clients={clients}
            vehicleOptions={vehicleOptions}
          />
        </TabsContent>
        <TabsContent value="renewal">
          <RenewalNotice
            initialPolicies={initialPolicies}
            initialPeriod={parseRenewalPeriod(
              searchParams.get("days") ?? undefined
            )}
            initialCob={parseRenewalCob(searchParams.get("cob") ?? undefined)}
          />
        </TabsContent>
      </Tabs>

      {form ? (
        <ClientForm
          key={form.key}
          open
          onOpenChange={(open) => {
            if (!open) setForm(null)
          }}
          client={form.client}
        />
      ) : null}
    </div>
  )
}
