"use client"

import * as React from "react"
import Link from "next/link"
import {
  Copy,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { totalSumInsured } from "@/lib/calc"
import { CLASSES_OF_BUSINESS, SLIPS } from "@/lib/data"
import { dateShort, money } from "@/lib/format"

const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Released", value: "Released" },
  { label: "Quoted", value: "Quoted" },
  { label: "Closed", value: "Closed" },
]
const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]

export function SlipTable() {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [cob, setCob] = React.useState("all")

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return SLIPS.filter((s) => {
      if (status !== "all" && s.status !== status) return false
      if (cob !== "all" && s.cob !== cob) return false
      if (!q) return true
      return [
        s.slipNo ?? "",
        s.insuredName,
        s.typeOfCover,
        s.occupation ?? "",
      ].some((v) => v.toLowerCase().includes(q))
    })
  }, [query, status, cob])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari no. slip, tertanggung, type of cover…"
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

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>No. Slip</TableHead>
              <TableHead>Nama Tertanggung</TableHead>
              <TableHead>Type of Cover</TableHead>
              <TableHead className="text-right">Total Sum Insured</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message="Tidak ada placing slip yang cocok"
              />
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-[230px]">
                    {s.slipNo ? (
                      <span className="tabular text-xs font-semibold text-primary">
                        {s.slipNo}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Belum di-release
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <p className="truncate font-medium">{s.insuredName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.cob}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm">{s.typeOfCover}</p>
                    {s.occupation ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {s.occupation}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium whitespace-nowrap">
                    {money(totalSumInsured(s), s.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                    {dateShort(s.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Aksi"
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            render={
                              <Link href={`/underwriting/slip/${s.id}`} />
                            }
                          >
                            <Eye />
                            Lihat placing slip
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            render={
                              <Link href={`/underwriting/edit/${s.id}`} />
                            }
                          >
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          {s.status !== "Draft" ? (
                            <DropdownMenuItem
                              render={
                                <Link
                                  href={`/underwriting/quotation/edit/${s.id}`}
                                />
                              }
                            >
                              <FileText />
                              Draft quotation slip
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() =>
                              toast.success("Slip diduplikasi", {
                                description: "Demo statis.",
                              })
                            }
                          >
                            <Copy />
                            Duplikat
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem variant="destructive">
                            <Trash2 />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Menampilkan {rows.length} dari {SLIPS.length} placing slip · pola nomor{" "}
        <span className="tabular">
          {"{seq}/LCH-PLCMT/PS[-{kode}]/{bulan romawi}/{tahun}"}
        </span>{" "}
        digenerate saat release
      </p>
    </div>
  )
}
