"use client"

import * as React from "react"
import { Banknote, FileText, ShieldCheck, TriangleAlert } from "lucide-react"

import { useToday } from "@/components/layout/today-provider"
import { CobBar } from "@/components/reports/cob-bar"
import { ProductionTrend } from "@/components/reports/production-trend"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
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
  breakdownByCob,
  breakdownByInsurer,
  brokerageIdr,
  monthlyProduction,
  policyStatus,
  premiumIdr,
  type Claim,
  type Policy,
} from "@/lib/data"
import { yearMonth } from "@/lib/date"
import type { ExportColumn } from "@/lib/export"
import {
  compactMoney,
  dateShort,
  money,
  MONTH_NAMES_ID,
  rupiah,
} from "@/lib/format"
import { useCollection } from "@/lib/store"

type Period = "monthly" | "quarterly" | "yearly"

const PERIOD_ITEMS: { label: string; value: Period }[] = [
  { label: "Bulanan", value: "monthly" },
  { label: "Kuartalan", value: "quarterly" },
  { label: "Tahunan", value: "yearly" },
]

/** 12 bulan terakhir sampai bulan berjalan, sebagai titik acuan periode. */
function monthOptions(today: string) {
  const { year, month } = yearMonth(today)
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - i, 1))
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth()
    return {
      label: `${MONTH_NAMES_ID[m]} ${y}`,
      value: `${y}-${String(m + 1).padStart(2, "0")}`,
    }
  })
}

/** Rentang tanggal [awal, akhir] untuk periode yang dipilih. */
function periodRange(period: Period, anchor: string) {
  const [y, m] = anchor.split("-").map(Number)
  const pad = (n: number) => String(n).padStart(2, "0")
  const lastDay = (yy: number, mm: number) =>
    new Date(Date.UTC(yy, mm, 0)).getUTCDate()
  if (period === "yearly") {
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `Tahun ${y}` }
  }
  if (period === "quarterly") {
    const q = Math.ceil(m / 3)
    const first = (q - 1) * 3 + 1
    return {
      start: `${y}-${pad(first)}-01`,
      end: `${y}-${pad(first + 2)}-${lastDay(y, first + 2)}`,
      label: `Kuartal ${q} ${y}`,
    }
  }
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${lastDay(y, m)}`,
    label: `${MONTH_NAMES_ID[m - 1]} ${y}`,
  }
}

type BreakdownRow = {
  policies: number
  sumInsured: number
  premium: number
  brokerage: number
}

function breakdownColumns<T extends BreakdownRow>(
  first: ExportColumn<T>
): ExportColumn<T>[] {
  return [
    first,
    { header: "Polis", value: (r) => r.policies, type: "number" },
    {
      header: "Total Sum Insured (IDR)",
      value: (r) => r.sumInsured,
      type: "money",
    },
    { header: "Premium (IDR)", value: (r) => r.premium, type: "money" },
    { header: "Brokerage (IDR)", value: (r) => r.brokerage, type: "money" },
  ]
}

function BreakdownTable<T extends BreakdownRow>({
  rows,
  label,
  keyOf,
}: {
  rows: T[]
  label: string
  keyOf: (row: T) => string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5">{label}</TableHead>
          <TableHead className="text-right">Polis</TableHead>
          <TableHead className="text-right">Total Sum Insured</TableHead>
          <TableHead className="text-right">Premium</TableHead>
          <TableHead className="pr-5 text-right">Brokerage</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty
            colSpan={5}
            message="Tidak ada produksi pada periode ini"
          />
        ) : (
          rows.map((r) => (
            <TableRow key={keyOf(r)}>
              <TableCell className="max-w-[280px] truncate pl-5 font-medium">
                {keyOf(r)}
              </TableCell>
              <TableCell className="tabular text-right">{r.policies}</TableCell>
              <TableCell className="tabular text-right">
                {rupiah(r.sumInsured)}
              </TableCell>
              <TableCell className="tabular text-right">
                {rupiah(r.premium)}
              </TableCell>
              <TableCell className="tabular pr-5 text-right">
                {rupiah(r.brokerage)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export function ReportView() {
  const today = useToday()
  const allPolicies = useCollection("policies")
  const allClaims = useCollection("claims")
  const months = React.useMemo(() => monthOptions(today), [today])

  const [period, setPeriod] = React.useState<Period>("yearly")
  const [anchor, setAnchor] = React.useState(months[0].value)

  const range = periodRange(period, anchor)
  const inRange = (date: string) => date >= range.start && date <= range.end

  // Produksi = polis yang mulai berlaku di periode; klaim = tanggal kejadian.
  const policies = allPolicies.filter((p) => inRange(p.inceptionDate))
  const claims = allClaims.filter((c) => inRange(c.lossDate))

  const cob = breakdownByCob(policies)
  const insurers = breakdownByInsurer(policies)
  const totalPremium = policies.reduce((a, p) => a + premiumIdr(p), 0)
  const totalBrokerage = policies.reduce((a, p) => a + brokerageIdr(p), 0)
  const totalSumInsured = policies.reduce(
    (a, p) => a + toIdr(p.sumInsured, p.currency),
    0
  )
  const claimValue = claims.reduce(
    (a, c) => a + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
    0
  )
  const countType = (type: Policy["type"]) =>
    policies.filter((p) => p.type === type).length

  const summary: [string, string][] = [
    ["Polis diproduksi", String(policies.length)],
    ["Total Premium", rupiah(totalPremium)],
    ["Total Brokerage", rupiah(totalBrokerage)],
    ["Total Sum Insured", rupiah(totalSumInsured)],
    ["Klaim dilaporkan", String(claims.length)],
    ["Nilai Klaim", rupiah(claimValue)],
    ["Polis Baru", String(countType("Baru"))],
    ["Polis Renewal", String(countType("Renewal"))],
    [
      "Endorsement & Pembatalan",
      String(countType("Endorsement") + countType("Cancellation")),
    ],
  ]

  const periodSlug = `${period}-${anchor}`

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-wrap items-end gap-3">
        <Field className="w-[150px]">
          <FieldLabel>Periode</FieldLabel>
          <Select
            items={PERIOD_ITEMS}
            value={period}
            onValueChange={(v) => setPeriod(v as Period)}
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
          <FieldLabel>Bulan acuan</FieldLabel>
          <Select
            items={months}
            value={anchor}
            onValueChange={(v) => setAnchor(v as string)}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {months.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <p className="pb-2 text-sm text-muted-foreground">
          {range.label} · {dateShort(range.start)} s/d {dateShort(range.end)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Polis Diproduksi"
          value={policies.length}
          sub={range.label}
          icon={ShieldCheck}
        />
        <StatCard
          label="Total Premium"
          value={`Rp ${compactMoney(totalPremium)}`}
          icon={Banknote}
        />
        <StatCard
          label="Brokerage Income"
          value={`Rp ${compactMoney(totalBrokerage)}`}
          icon={FileText}
        />
        <StatCard
          label="Klaim Dilaporkan"
          value={claims.length}
          sub={`Rp ${compactMoney(claimValue)}`}
          icon={TriangleAlert}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <SectionCard
          title="Premium per Class of Business"
          contentClassName="px-2"
        >
          {cob.length ? (
            <CobBar
              data={cob.map((c) => ({ cob: c.cob, premium: c.premium }))}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Tidak ada produksi pada periode ini
            </p>
          )}
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
        <TabsList className="no-print">
          <TabsTrigger value="production">Produksi Polis</TabsTrigger>
          <TabsTrigger value="policies">Polis ({policies.length})</TabsTrigger>
          <TabsTrigger value="claims">Klaim ({claims.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="flex flex-col gap-4">
          <SectionCard
            title={`Trend Produksi ${anchor.slice(0, 4)}`}
            description="Premium & brokerage per bulan mulai polis (juta IDR)"
            contentClassName="px-2"
          >
            <ProductionTrend
              data={monthlyProduction(allPolicies, Number(anchor.slice(0, 4)))}
            />
          </SectionCard>

          <SectionCard
            title="Produksi per Class of Business"
            action={
              <ExportButtons
                spec={{
                  filename: `produksi-cob-${periodSlug}`,
                  sheet: "Per COB",
                  rows: cob,
                  columns: breakdownColumns<(typeof cob)[number]>({
                    header: "Class of Business",
                    value: (r) => r.cob,
                  }),
                }}
              />
            }
            contentClassName="px-0"
          >
            <BreakdownTable
              rows={cob}
              label="Class of Business"
              keyOf={(r) => r.cob}
            />
          </SectionCard>

          <SectionCard
            title="Produksi per Insurer"
            action={
              <ExportButtons
                spec={{
                  filename: `produksi-insurer-${periodSlug}`,
                  sheet: "Per Insurer",
                  rows: insurers,
                  columns: breakdownColumns<(typeof insurers)[number]>({
                    header: "Insurer",
                    value: (r) => r.insurer,
                    width: 40,
                  }),
                }}
              />
            }
            contentClassName="px-0"
          >
            <BreakdownTable
              rows={insurers}
              label="Insurer"
              keyOf={(r) => r.insurer}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="policies" className="flex flex-col gap-3">
          <ExportButtons
            className="justify-end"
            spec={{
              filename: `polis-${periodSlug}`,
              sheet: "Polis",
              rows: policies,
              columns: [
                { header: "No. Polis", value: (p) => p.policyNo },
                {
                  header: "Tertanggung",
                  value: (p) => p.insuredName,
                  width: 36,
                },
                { header: "COB", value: (p) => p.cob },
                { header: "Tipe", value: (p) => p.type },
                {
                  header: "Mulai",
                  value: (p) => p.inceptionDate,
                  type: "date",
                },
                {
                  header: "Berakhir",
                  value: (p) => p.expiryDate,
                  type: "date",
                },
                { header: "Mata Uang", value: (p) => p.currency },
                { header: "Premium", value: (p) => p.premium, type: "money" },
                {
                  header: "Brokerage (IDR)",
                  value: (p) => brokerageIdr(p),
                  type: "money",
                },
                {
                  header: "Status",
                  value: (p) => policyStatus(p.expiryDate, today),
                },
              ],
            }}
          />
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
                {policies.length === 0 ? (
                  <TableEmpty
                    colSpan={7}
                    message="Tidak ada polis pada periode ini"
                  />
                ) : (
                  policies.map((p) => (
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
                        {rupiah(brokerageIdr(p))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={policyStatus(p.expiryDate, today)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="flex flex-col gap-3">
          <ExportButtons
            className="justify-end"
            spec={{
              filename: `klaim-${periodSlug}`,
              sheet: "Klaim",
              rows: claims,
              columns: [
                { header: "No. Klaim", value: (c: Claim) => c.claimNo },
                { header: "No. Polis", value: (c) => c.policyNo },
                {
                  header: "Tertanggung",
                  value: (c) => c.insuredName,
                  width: 36,
                },
                { header: "COB", value: (c) => c.cob },
                {
                  header: "Tgl Kejadian",
                  value: (c) => c.lossDate,
                  type: "date",
                },
                { header: "Mata Uang", value: (c) => c.currency },
                {
                  header: "Estimasi",
                  value: (c) => c.estimatedLoss,
                  type: "money",
                },
                {
                  header: "Dibayar",
                  value: (c) => c.paidAmount,
                  type: "money",
                },
                { header: "Status", value: (c) => c.status },
              ],
            }}
          />
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
                {claims.length === 0 ? (
                  <TableEmpty
                    colSpan={7}
                    message="Tidak ada klaim pada periode ini"
                  />
                ) : (
                  claims.map((c) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
