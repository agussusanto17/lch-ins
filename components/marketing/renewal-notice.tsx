"use client"

import * as React from "react"
import { CalendarClock } from "lucide-react"

import { useToday } from "@/components/layout/today-provider"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
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
import {
  CLASSES_OF_BUSINESS,
  policyStatus,
  premiumIdr,
  type Policy,
} from "@/lib/data"
import { daysBetween } from "@/lib/date"
import type { ExportSpec } from "@/lib/export"
import { dateShort, rupiah } from "@/lib/format"
import { useCollection } from "@/lib/store"

const PERIOD_ITEMS = [
  { label: "30 hari", value: "30" },
  { label: "60 hari", value: "60" },
  { label: "90 hari", value: "90" },
  { label: "180 hari", value: "180" },
]
const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]

export function RenewalNotice() {
  const today = useToday()
  const policies = useCollection("policies")
  const [period, setPeriod] = React.useState("90")
  const [cob, setCob] = React.useState("all")

  const rows = React.useMemo(() => {
    const limit = Number(period)
    return policies
      .filter((p) => {
        // Endorsement dan pembatalan ikut polis induknya, tidak di-renew sendiri.
        if (p.type === "Endorsement" || p.type === "Cancellation") return false
        if (cob !== "all" && p.cob !== cob) return false
        const d = daysBetween(today, p.expiryDate)
        return d >= 0 && d <= limit
      })
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
  }, [policies, period, cob, today])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 10)

  const totalPremium = rows.reduce((a, p) => a + premiumIdr(p), 0)

  const exportSpec: ExportSpec<Policy> = {
    filename: "renewal-notice",
    sheet: "Renewal",
    rows,
    columns: [
      { header: "No. Polis", value: (p) => p.policyNo },
      { header: "Tertanggung", value: (p) => p.insuredName, width: 36 },
      { header: "COB", value: (p) => p.cob },
      { header: "Asuransi", value: (p) => p.insurer, width: 36 },
      { header: "Tanggal Berakhir", value: (p) => p.expiryDate, type: "date" },
      {
        header: "Sisa Hari",
        value: (p) => daysBetween(today, p.expiryDate),
        type: "number",
      },
      { header: "Mata Uang", value: (p) => p.currency },
      { header: "Premium", value: (p) => p.premium, type: "money" },
    ],
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-35">
          <FieldLabel>Jatuh tempo dalam</FieldLabel>
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
        <Field className="w-45">
          <FieldLabel>Class of Business</FieldLabel>
          <Select
            items={COB_ITEMS}
            value={cob}
            onValueChange={(v) => setCob(v as string)}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {COB_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <ExportButtons className="ml-auto" spec={exportSpec} />
      </div>

      <Card className="flex-row items-center gap-3 px-5 py-4">
        <CalendarClock className="size-5 shrink-0 text-primary" />
        <p className="text-sm">
          <span className="font-semibold">{rows.length} polis</span> jatuh tempo
          dalam {period} hari ke depan dengan total premium{" "}
          <span className="tabular font-semibold">{rupiah(totalPremium)}</span>.
        </p>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>No. Polis</TableHead>
              <TableHead>Nama Tertanggung</TableHead>
              <TableHead>COB</TableHead>
              <TableHead>Asuransi</TableHead>
              <TableHead>Tanggal Berakhir</TableHead>
              <TableHead className="text-right">Premium</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message="Tidak ada polis jatuh tempo pada periode ini"
              />
            ) : (
              paginatedRows.map((p) => {
                const days = daysBetween(today, p.expiryDate)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="tabular font-medium">
                      {p.policyNo}
                    </TableCell>
                    <TableCell className="max-w-55 truncate">
                      {p.insuredName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.cob}
                    </TableCell>
                    <TableCell className="max-w-55 truncate text-xs text-muted-foreground">
                      {p.insurer}
                    </TableCell>
                    <TableCell>
                      <span className="tabular">{dateShort(p.expiryDate)}</span>
                      <ToneBadge
                        tone={days <= 30 ? "warning" : "info"}
                        className="ml-2"
                      >
                        {days} hari
                      </ToneBadge>
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {rupiah(premiumIdr(p))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={policyStatus(p.expiryDate, today)} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemName="polis"
      />
    </div>
  )
}
