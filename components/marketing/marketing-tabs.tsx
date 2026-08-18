"use client"

import * as React from "react"

import { ClientTable } from "@/components/marketing/client-table"
import { RenewalNotice } from "@/components/marketing/renewal-notice"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function MarketingTabs() {
  return (
    <Tabs defaultValue="clients" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="clients">Database Klien</TabsTrigger>
        <TabsTrigger value="renewal">Renewal Notice</TabsTrigger>
      </TabsList>
      <TabsContent value="clients">
        <ClientTable />
      </TabsContent>
      <TabsContent value="renewal">
        <RenewalNotice />
      </TabsContent>
    </Tabs>
  )
}
