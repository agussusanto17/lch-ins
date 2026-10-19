"use client"

import * as React from "react"
import { CircleCheck, Clock, Eye, Pencil, Receipt, Trash2 } from "lucide-react"

import { ACTION_COL_CLASS, RowActions } from "@/components/shared/row-actions"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { ClaimDetailSheet } from "@/components/claims/claim-detail-sheet"
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
import { CLAIMS, CLASSES_OF_BUSINESS, type Claim } from "@/lib/data"
import { compactMoney, dateShort, money } from "@/lib/format"

const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  { label: "Outstanding", value: "Outstanding" },
  { label: "Settled", value: "Settled" },
  { label: "Closed", value: "Closed" },
  { label: "Rejected", value: "Rejected" },
]
/** Tahapan dokumen berjalan sendiri, jadi filternya terpisah dari status. */
const STAGE_ITEMS = [
  { label: "Semua tahapan", value: "all" },
  { label: "Tunggu Dokumen", value: "Tunggu Dokumen" },
  { label: "Dokumen Belum Lengkap", value: "Dokumen Belum Lengkap" },
  { label: "Dokumen Lengkap", value: "Dokumen Lengkap" },
  { label: "Proses Adjuster", value: "Proses Adjuster" },
  { label: "SPK / SPGR terbit", value: "SPK / SPGR terbit" },
]
const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]

export function ClaimsView() {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [stage, setStage] = React.useState("all")
  const [cob, setCob] = React.useState("all")
  const [selected, setSelected] = React.useState<Claim | null>(null)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return CLAIMS.filter((c) => {
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
  }, [query, status, stage, cob])

  const isOpen = (c: Claim) => c.status === "Outstanding"
  const openCount = CLAIMS.filter(isOpen).length
  const paidValue = CLAIMS.reduce(
    (a, c) => a + toIdr(c.paidAmount, c.currency),
    0
  )
  const outstandingValue = CLAIMS.filter(isOpen).reduce(
    (a, c) => a + toIdr(c.claimedAmount || c.estimatedLoss, c.currency),
    0
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Klaim"
          value={CLAIMS.length}
          sub="sepanjang 2026"
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
          sub="settled 2026"
          icon={CircleCheck}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
          <SelectTrigger size="sm" className="w-[168px]">
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
          <SelectTrigger size="sm" className="w-[170px]">
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
          <SelectTrigger size="sm" className="w-[196px]">
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
        <ExportButtons className="ml-auto" />
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
              rows.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(c)}
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
                          onSelect: () => setSelected(c),
                        },
                        { label: "Edit klaim", icon: Pencil },
                        {
                          label: "Hapus klaim",
                          icon: Trash2,
                          destructive: true,
                        },
                      ]}
                    />
                  </TableCell>
                  <TableCell className="tabular font-medium">
                    {c.claimNo}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
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

      <p className="text-xs text-muted-foreground">
        Menampilkan {rows.length} dari {CLAIMS.length} klaim · klik baris untuk
        membuka detail lengkap (17 kolom lama dipindah ke panel detail)
      </p>

      <ClaimDetailSheet
        claim={selected}
        open={selected !== null}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  )
}
