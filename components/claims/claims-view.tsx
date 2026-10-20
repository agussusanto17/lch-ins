"use client"

import * as React from "react"
import { CircleCheck, Clock, Eye, Pencil, Plus, Receipt } from "lucide-react"

import { ClaimForm } from "@/components/claims/claim-form"
import { PageHeader } from "@/components/layout/page-header"
import { useToday } from "@/components/layout/today-provider"
import { ACTION_COL_CLASS, RowActions } from "@/components/shared/row-actions"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { ClaimDetailSheet } from "@/components/claims/claim-detail-sheet"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { toIdr } from "@/lib/calc"
import {
  CLAIM_STAGES,
  CLAIM_STATUSES,
  CLASSES_OF_BUSINESS,
  isOpenClaim,
  type Claim,
} from "@/lib/data"
import type { ExportSpec } from "@/lib/export"
import { compactMoney, dateShort, money } from "@/lib/format"
import { useCollection } from "@/lib/store"

const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  ...CLAIM_STATUSES.map((s) => ({ label: s, value: s })),
]
/** Tahapan dokumen berjalan sendiri, jadi filternya terpisah dari status. */
const STAGE_ITEMS = [
  { label: "Semua tahapan", value: "all" },
  ...CLAIM_STAGES.map((s) => ({ label: s, value: s })),
]
const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]

export function ClaimsView() {
  const today = useToday()
  const claims = useCollection("claims")
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [stage, setStage] = React.useState("all")
  const [cob, setCob] = React.useState("all")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<{
    key: number
    claim: Claim | null
  } | null>(null)
  const selected = claims.find((c) => c.id === selectedId) ?? null
  const year = today.slice(0, 4)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return claims.filter((c) => {
      if (status !== "all" && c.status !== status) return false
      if (stage !== "all" && c.stage !== stage) return false
      if (cob !== "all" && c.cob !== cob) return false
      if (!q) return true
      return [
        c.claimNo,
        c.insuredName,
        c.policyNo,
        c.insurer,
        c.lossDescription,
      ].some((v) => v.toLowerCase().includes(q))
    })
  }, [claims, query, status, stage, cob])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 10)

  const openCount = claims.filter(isOpenClaim).length
  const paidValue = claims
    .filter((c) => c.lossDate.startsWith(year))
    .reduce((a, c) => a + toIdr(c.paidAmount, c.currency), 0)
  const outstandingValue = claims
    .filter(isOpenClaim)
    .reduce(
      (a, c) => a + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
      0
    )

  const exportSpec: ExportSpec<Claim> = {
    filename: "klaim-lch",
    sheet: "Klaim",
    rows,
    columns: [
      { header: "No. Klaim", value: (c) => c.claimNo },
      { header: "No. Polis", value: (c) => c.policyNo },
      { header: "Tertanggung", value: (c) => c.insuredName, width: 36 },
      { header: "Asuransi", value: (c) => c.insurer, width: 36 },
      { header: "COB", value: (c) => c.cob },
      { header: "Tgl Kejadian", value: (c) => c.lossDate, type: "date" },
      { header: "Tgl Lapor", value: (c) => c.reportedDate, type: "date" },
      {
        header: "Tgl Dokumen Lengkap",
        value: (c) => c.documentCompleteDate,
        type: "date",
      },
      { header: "Tgl SPK/SPGR", value: (c) => c.spkDate, type: "date" },
      { header: "Mata Uang", value: (c) => c.currency },
      { header: "Estimasi", value: (c) => c.estimatedLoss, type: "money" },
      { header: "Diajukan", value: (c) => c.claimedAmount, type: "money" },
      { header: "Dibayar", value: (c) => c.paidAmount, type: "money" },
      { header: "Adjuster", value: (c) => c.adjuster },
      { header: "Status", value: (c) => c.status },
      {
        header: "Deskripsi Kerugian",
        value: (c) => c.lossDescription,
        width: 48,
      },
    ],
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Klaim"
        description="Manajemen klaim asuransi"
        actions={
          <Button
            onClick={() =>
              setForm((prev) => ({ key: (prev?.key ?? 0) + 1, claim: null }))
            }
          >
            <Plus data-icon="inline-start" />
            Input Klaim Baru
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Klaim"
            value={claims.length}
            sub="seluruh klaim tercatat"
            icon={Receipt}
          />
          <StatCard
            label="Klaim Terbuka"
            value={openCount}
            sub="belum selesai"
            icon={Clock}
          />
          <StatCard
            label="Outstanding"
            value={`Rp ${compactMoney(outstandingValue)}`}
            sub="nilai klaim berjalan"
            icon={Clock}
          />
          <StatCard
            label="Sudah Dibayar"
            value={`Rp ${compactMoney(paidValue)}`}
            sub={`dibayar, kejadian ${year}`}
            icon={CircleCheck}
          />
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari no. klaim, tertanggung, polis…"
          />
          <Select
            items={COB_ITEMS}
            value={cob}
            onValueChange={(v) => setCob(v as string)}
          >
            <SelectTrigger size="sm" className="w-42">
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
          <Select
            items={STATUS_ITEMS}
            value={status}
            onValueChange={(v) => setStatus(v as string)}
          >
            <SelectTrigger size="sm" className="w-42.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STATUS_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={STAGE_ITEMS}
            value={stage}
            onValueChange={(v) => setStage(v as string)}
          >
            <SelectTrigger size="sm" className="w-49">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STAGE_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ExportButtons className="ml-auto" spec={exportSpec} />
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={ACTION_COL_CLASS}>
                  <span className="sr-only">Aksi</span>
                </TableHead>
                <TableHead>No. Klaim</TableHead>
                <TableHead>Tertanggung</TableHead>
                <TableHead>COB</TableHead>
                <TableHead>Tgl Kejadian</TableHead>
                <TableHead className="text-right">Nilai Klaim</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7} message="Tidak ada klaim yang cocok" />
              ) : (
                paginatedRows.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell
                      className={ACTION_COL_CLASS}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions
                        actions={[
                          {
                            label: "Lihat detail",
                            icon: Eye,
                            onSelect: () => setSelectedId(c.id),
                          },
                          {
                            label: "Edit klaim",
                            icon: Pencil,
                            onSelect: () =>
                              setForm((prev) => ({
                                key: (prev?.key ?? 0) + 1,
                                claim: c,
                              })),
                          },
                        ]}
                      />
                    </TableCell>
                    <TableCell className="tabular font-medium">
                      {c.claimNo}
                    </TableCell>
                    <TableCell className="max-w-55">
                      <p className="truncate">{c.insuredName}</p>
                      <p className="tabular truncate text-xs text-muted-foreground">
                        {c.policyNo}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {c.cob}
                    </TableCell>
                    <TableCell className="tabular whitespace-nowrap">
                      {dateShort(c.lossDate)}
                    </TableCell>
                    <TableCell className="tabular text-right font-medium whitespace-nowrap">
                      {money(c.claimedAmount || c.estimatedLoss, c.currency)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge status={c.status} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.stage}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
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
          itemName="klaim"
        />

        <p className="text-xs text-muted-foreground">
          Klik baris untuk membuka detail lengkap. Klaim bernomor tidak dihapus,
          cukup ditutup dengan status Close atau Rejected.
        </p>

        <ClaimDetailSheet
          claim={selected}
          open={selected !== null}
          onOpenChange={(v) => {
            if (!v) setSelectedId(null)
          }}
          onEdit={(c) => {
            setSelectedId(null)
            setForm((prev) => ({ key: (prev?.key ?? 0) + 1, claim: c }))
          }}
        />
        {form ? (
          <ClaimForm
            key={form.key}
            open
            onOpenChange={(open) => {
              if (!open) setForm(null)
            }}
            claim={form.claim}
          />
        ) : null}
      </div>
    </div>
  )
}
