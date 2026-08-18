"use client"

import * as React from "react"
import { Eye, Pencil, Trash2 } from "lucide-react"

import { ACTION_COL_CLASS, RowActions } from "@/components/shared/row-actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
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
import { CLASSES_OF_BUSINESS, CLIENTS } from "@/lib/data"

const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]
const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Prospect", value: "Prospect" },
  { label: "Inactive", value: "Inactive" },
]

export function ClientTable() {
  const [query, setQuery] = React.useState("")
  const [cob, setCob] = React.useState("all")
  const [status, setStatus] = React.useState("all")

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return CLIENTS.filter((c) => {
      if (cob !== "all" && c.cob !== cob) return false
      if (status !== "all" && c.status !== status) return false
      if (!q) return true
      return [c.name, c.contactPerson, c.email, c.phone, c.npwp].some((v) =>
        v.toLowerCase().includes(q)
      )
    })
  }, [query, cob, status])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
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
          <SelectTrigger size="sm" className="w-[150px]">
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
        <ExportButtons className="ml-auto" />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={ACTION_COL_CLASS}>
                <span className="sr-only">Aksi</span>
              </TableHead>
              <TableHead>Nama Perusahaan</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>NPWP</TableHead>
              <TableHead>COB</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message="Tidak ada klien yang cocok dengan filter"
              />
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className={ACTION_COL_CLASS}>
                    <RowActions
                      actions={[
                        { label: "Lihat detail", icon: Eye },
                        { label: "Edit klien", icon: Pencil },
                        { label: "Hapus", icon: Trash2, destructive: true },
                      ]}
                    />
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.email}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.contactPerson}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {c.phone}
                  </TableCell>
                  <TableCell className="tabular text-xs text-muted-foreground">
                    {c.npwp}
                  </TableCell>
                  <TableCell>{c.cob}</TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Menampilkan {rows.length} dari {CLIENTS.length} klien
      </p>
    </div>
  )
}
