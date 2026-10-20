"use client"

import * as React from "react"
import Link from "next/link"
import { Ban, Eye, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
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
import {
  CLASSES_OF_BUSINESS,
  CLIENT_STATUSES,
  kycMissing,
  type Client,
} from "@/lib/data"
import type { ExportSpec } from "@/lib/export"
import { maskEmail, maskMiddle } from "@/lib/format"
import { store, useCollection } from "@/lib/store"

const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]
const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  ...CLIENT_STATUSES.map((s) => ({ label: s, value: s })),
]

export function ClientTable({ onEdit }: { onEdit: (client: Client) => void }) {
  const clients = useCollection("clients")
  const slips = useCollection("slips")
  const policies = useCollection("policies")
  const sppa = useCollection("sppa")
  const [query, setQuery] = React.useState("")
  const [cob, setCob] = React.useState("all")
  const [status, setStatus] = React.useState("all")

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((c) => {
      if (cob !== "all" && c.cob !== cob) return false
      if (status !== "all" && c.status !== status) return false
      if (!q) return true
      return [c.name, c.contactPerson, c.email, c.phone, c.npwp].some((v) =>
        (v ?? "").toLowerCase().includes(q)
      )
    })
  }, [clients, query, cob, status])

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 10)

  function actionsFor(c: Client): RowAction[] {
    // Klien yang sudah dipakai dokumen tidak dihapus, cukup dinonaktifkan (ERD).
    const used =
      slips.some((s) => s.clientId === c.id) ||
      policies.some((p) => p.clientId === c.id) ||
      sppa.some((s) => s.clientId === c.id)
    const actions: RowAction[] = [
      {
        label: "Lihat detail",
        icon: Eye,
        render: <Link href={`/marketing/clients/${c.id}`} />,
      },
      { label: "Edit klien", icon: Pencil, onSelect: () => onEdit(c) },
    ]
    if (used) {
      actions.push({
        label: c.status === "Inactive" ? "Sudah nonaktif" : "Nonaktifkan",
        icon: Ban,
        destructive: true,
        disabled: c.status === "Inactive",
        confirm: {
          title: `Nonaktifkan ${c.name}?`,
          description:
            "Klien ini sudah dipakai di SPPA, slip, atau polis, jadi tidak dihapus. Statusnya diubah menjadi Inactive dan tetap tampil di dokumen lama.",
          actionLabel: "Nonaktifkan",
        },
        onSelect: () => {
          store.update("clients", c.id, { status: "Inactive" })
          toast.success("Klien dinonaktifkan", { description: c.name })
        },
      })
    } else {
      actions.push({
        label: "Hapus klien",
        icon: Trash2,
        destructive: true,
        confirm: {
          title: `Hapus ${c.name}?`,
          description:
            "Data klien beserta alamat dan berkas KYC-nya dihapus permanen.",
          actionLabel: "Hapus",
        },
        onSelect: () => {
          store.remove("clients", c.id)
          toast.success("Klien dihapus", { description: c.name })
        },
      })
    }
    return actions
  }

  const exportSpec: ExportSpec<Client> = {
    filename: "klien-lch",
    sheet: "Klien",
    rows,
    columns: [
      { header: "Nama", value: (c) => c.name, width: 36 },
      { header: "Tipe", value: (c) => c.clientType },
      { header: "PIC", value: (c) => c.contactPerson },
      { header: "Email", value: (c) => c.email, width: 30 },
      { header: "Telepon", value: (c) => c.phone },
      { header: "NPWP", value: (c) => c.npwp },
      { header: "COB Utama", value: (c) => c.cob },
      { header: "Status", value: (c) => c.status },
      { header: "Tanggal KYC", value: (c) => c.kycDate, type: "date" },
      {
        header: "KYC Kurang",
        value: (c) => kycMissing(c).join(", "),
        width: 40,
      },
    ],
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari nama, kontak, email, NPWP…"
        />
        <Select
          items={COB_ITEMS}
          value={cob}
          onValueChange={(v) => setCob(v as string)}
        >
          <SelectTrigger
            size="sm"
            className="w-42"
            aria-label="Filter COB"
          >
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
          <SelectTrigger
            size="sm"
            className="w-37.5"
            aria-label="Filter status"
          >
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
        <ExportButtons className="ml-auto" spec={exportSpec} />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={ACTION_COL_CLASS}>
                <span className="sr-only">Aksi</span>
              </TableHead>
              <TableHead>Nama Klien</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>NPWP</TableHead>
              <TableHead>COB</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty
                colSpan={8}
                message="Tidak ada klien yang cocok dengan filter"
              />
            ) : (
              paginatedRows.map((c) => {
                const missing = kycMissing(c)
                return (
                  <TableRow key={c.id}>
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={actionsFor(c)} />
                    </TableCell>
                    <TableCell className="max-w-65">
                      <Link
                        href={`/marketing/clients/${c.id}`}
                        className="block truncate font-medium hover:text-primary"
                      >
                        {c.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.clientType} · {maskEmail(c.email)}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.contactPerson || "—"}
                    </TableCell>
                    <TableCell className="tabular text-muted-foreground">
                      {maskMiddle(c.phone, 4, 3)}
                    </TableCell>
                    <TableCell className="tabular text-xs text-muted-foreground">
                      {maskMiddle(c.npwp, 2, 3)}
                    </TableCell>
                    <TableCell>{c.cob}</TableCell>
                    <TableCell>
                      {missing.length ? (
                        <ToneBadge tone="warning" className="cursor-help">
                          <span title={`Kurang: ${missing.join(", ")}`}>
                            Kurang {missing.length}
                          </span>
                        </ToneBadge>
                      ) : (
                        <ToneBadge tone="success">Lengkap</ToneBadge>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge status={c.status} />
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
        itemName="klien"
      />

      <p className="text-xs text-muted-foreground">
        Telepon dan NPWP disamarkan, data lengkap ada di halaman detail.
      </p>
    </div>
  )
}
