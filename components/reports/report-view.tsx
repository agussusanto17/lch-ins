"use client"

import * as React from "react"
import { Banknote, FileText, ShieldCheck, TriangleAlert } from "lucide-react"

import { CobBar } from "@/components/reports/cob-bar"
import { ProductionTrend } from "@/components/reports/production-trend"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { ExportButtons } from "@/components/shared/table-toolbar"
import { Card } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toIdr } from "@/lib/calc"
import {
  CLAIMS,
  POLICIES,
  TOTALS,
  premiumByCob,
  premiumByInsurer,
  premiumIdr,
} from "@/lib/data"
import { compactMoney, dateShort, money, rupiah } from "@/lib/format"

const PERIOD_ITEMS = [
  { label: "Bulanan", value: "monthly" },
  { label: "Kuartalan", value: "quarterly" },
  { label: "Tahunan", value: "yearly" },
]
const MONTH_ITEMS = [
  { label: "Agustus 2026", value: "2026-08" },
  { label: "Juli 2026", value: "2026-07" },
  { label: "Juni 2026", value: "2026-06" },
]

export function ReportView() {
  const [period, setPeriod] = React.useState("monthly")
  const [month, setMonth] = React.useState("2026-08")

  const cob = premiumByCob()
  const insurers = premiumByInsurer()

  const summary: [string, string][] = [
    ["Total Polis", String(TOTALS.activePolicies)],
    ["Total Premium", rupiah(TOTALS.totalPremium)],
    ["Total Brokerage", rupiah(TOTALS.totalBrokerage)],
    ["Total Sum Insured", rupiah(TOTALS.totalSumInsured)],
    ["Total Klaim", String(CLAIMS.length)],
    ["Nilai Klaim", rupiah(TOTALS.claimValue)],
    ["Polis Baru", String(POLICIES.filter((p) => p.type === "Baru").length)],
    [
      "Polis Renewal",
      String(POLICIES.filter((p) => p.type === "Renewal").length),
    ],
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-[150px]">
          <FieldLabel>Periode</FieldLabel>
          <Select
            items={PERIOD_ITEMS}
            value={period}
            onValueChange={(v) => setPeriod(v as string)}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PERIOD_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-[180px]">
          <FieldLabel>Bulan / Tahun</FieldLabel>
          <Select
            items={MONTH_ITEMS}
            value={month}
            onValueChange={(v) => setMonth(v as string)}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {MONTH_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Polis"
          value={TOTALS.activePolicies}
          sub="polis aktif"
          icon={ShieldCheck}
        />
        <StatCard
          label="Total Premium"
          value={`Rp ${compactMoney(TOTALS.totalPremium)}`}
          icon={Banknote}
          trend={{ value: "+18,4% YoY", direction: "up" }}
        />
        <StatCard
          label="Brokerage Income"
          value={`Rp ${compactMoney(TOTALS.totalBrokerage)}`}
          icon={FileText}
          trend={{ value: "+12,1% YoY", direction: "up" }}
        />
        <StatCard
          label="Total Klaim"
          value={CLAIMS.length}
          sub={`Rp ${compactMoney(TOTALS.claimValue)}`}
          icon={TriangleAlert}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <SectionCard
          title="Premium per Class of Business"
          contentClassName="px-2"
        >
          <CobBar data={cob.map((c) => ({ cob: c.cob, premium: c.premium }))} />
        </SectionCard>

        <SectionCard title="Ringkasan Periode" contentClassName="flex flex-col">
          {summary.map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between border-b py-2.5 text-sm last:border-0"
            >
              <span className="text-muted-foreground">{k}</span>
              <span className="tabular font-semibold">{v}</span>
            </div>
          ))}
        </SectionCard>
      </div>

      <Tabs defaultValue="production" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="production">Produksi Polis</TabsTrigger>
          <TabsTrigger value="policies">Polis ({POLICIES.length})</TabsTrigger>
          <TabsTrigger value="claims">Klaim ({CLAIMS.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total Polis", String(TOTALS.activePolicies)],
              [
                "Total Sum Insured",
                `Rp ${compactMoney(TOTALS.totalSumInsured)}`,
              ],
              ["Total Premium", `Rp ${compactMoney(TOTALS.totalPremium)}`],
              ["Total Brokerage", `Rp ${compactMoney(TOTALS.totalBrokerage)}`],
            ].map(([k, v]) => (
              <Card key={k} className="gap-1 px-4 py-3.5">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="tabular text-lg font-bold">{v}</p>
              </Card>
            ))}
          </div>

          <SectionCard
            title="Trend Produksi 2026"
            description="Premium & brokerage per bulan (juta IDR)"
            contentClassName="px-2"
          >
            <ProductionTrend />
          </SectionCard>

          <SectionCard
            title="Produksi per Class of Business"
            action={<ExportButtons />}
            contentClassName="px-0"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Class of Business</TableHead>
                  <TableHead className="text-right">Polis</TableHead>
                  <TableHead className="text-right">
                    Total Sum Insured
                  </TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="pr-5 text-right">Brokerage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cob.map((c) => (
                  <TableRow key={c.cob}>
                    <TableCell className="pl-5 font-medium">{c.cob}</TableCell>
                    <TableCell className="tabular text-right">
                      {c.policies}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {rupiah(c.sumInsured)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {rupiah(c.premium)}
                    </TableCell>
                    <TableCell className="tabular pr-5 text-right">
                      {rupiah(c.brokerage)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          <SectionCard
            title="Produksi per Insurer"
            action={<ExportButtons />}
            contentClassName="px-0"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Insurer</TableHead>
                  <TableHead className="text-right">Polis</TableHead>
                  <TableHead className="text-right">
                    Total Sum Insured
                  </TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="pr-5 text-right">Brokerage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insurers.map((c) => (
                  <TableRow key={c.insurer}>
                    <TableCell className="max-w-[280px] truncate pl-5 font-medium">
                      {c.insurer}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {c.policies}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {rupiah(c.sumInsured)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {rupiah(c.premium)}
                    </TableCell>
                    <TableCell className="tabular pr-5 text-right">
                      {rupiah(c.brokerage)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>No. Polis</TableHead>
                  <TableHead>Tertanggung</TableHead>
                  <TableHead>COB</TableHead>
                  <TableHead>Berakhir</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Brokerage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {POLICIES.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="tabular font-medium">
                      {p.policyNo}
                    </TableCell>
                    <TableCell className="max-w-[210px] truncate">
                      {p.insuredName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {p.cob}
                    </TableCell>
                    <TableCell className="tabular whitespace-nowrap">
                      {dateShort(p.expiryDate)}
                    </TableCell>
                    <TableCell className="tabular text-right whitespace-nowrap">
                      {money(p.premium, p.currency)}
                    </TableCell>
                    <TableCell className="tabular text-right whitespace-nowrap">
                      {rupiah((premiumIdr(p) * p.brokeragePct) / 100)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>No. Klaim</TableHead>
                  <TableHead>Tertanggung</TableHead>
                  <TableHead>COB</TableHead>
                  <TableHead>Tgl Kejadian</TableHead>
                  <TableHead className="text-right">Estimasi</TableHead>
                  <TableHead className="text-right">Dibayar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CLAIMS.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="tabular font-medium">
                      {c.claimNo}
                    </TableCell>
                    <TableCell className="max-w-[210px] truncate">
                      {c.insuredName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {c.cob}
                    </TableCell>
                    <TableCell className="tabular whitespace-nowrap">
                      {dateShort(c.lossDate)}
                    </TableCell>
                    <TableCell className="tabular text-right whitespace-nowrap">
                      {rupiah(toIdr(c.estimatedLoss, c.currency))}
                    </TableCell>
                    <TableCell className="tabular text-right whitespace-nowrap">
                      {rupiah(toIdr(c.paidAmount, c.currency))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
