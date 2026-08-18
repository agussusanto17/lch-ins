"use client"

import * as React from "react"
import { FileText, MoreHorizontal, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CLASSES_OF_BUSINESS, POLICIES, premiumIdr } from "@/lib/data"
import { dateShort, money, rupiah } from "@/lib/format"

const COB_ITEMS = [
  { label: "Semua COB", value: "all" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]
const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Expiring", value: "Expiring" },
  { label: "Expired", value: "Expired" },
]

export function PolicyDatabase() {
  const [query, setQuery] = React.useState("")
  const [cob, setCob] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [tab, setTab] = React.useState("all")

  const base = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return POLICIES.filter((p) => {
      if (cob !== "all" && p.cob !== cob) return false
      if (status !== "all" && p.status !== status) return false
      if (!q) return true
      return [p.policyNo, p.insuredName, p.insurer, p.riskLocation].some((v) =>
        v.toLowerCase().includes(q)
      )
    })
  }, [query, cob, status])

  const counts = {
    all: base.length,
    Baru: base.filter((p) => p.type === "Baru").length,
    Renewal: base.filter((p) => p.type === "Renewal").length,
  }

  const rows = tab === "all" ? base : base.filter((p) => p.type === tab)
  const totalPremium = rows.reduce((a, p) => a + premiumIdr(p), 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari no. polis, tertanggung, asuransi…"
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

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as string)}
        className="flex flex-col gap-3"
      >
        <TabsList>
          <TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
          <TabsTrigger value="Baru">Baru ({counts.Baru})</TabsTrigger>
          <TabsTrigger value="Renewal">Renewal ({counts.Renewal})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>No. Polis</TableHead>
                  <TableHead>Tertanggung</TableHead>
                  <TableHead>COB</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Softcopy</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmpty
                    colSpan={9}
                    message="Tidak ada polis yang cocok"
                  />
                ) : (
                  rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="tabular font-medium">
                        {p.policyNo}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate">{p.insuredName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.insurer}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {p.cob}
                      </TableCell>
                      <TableCell className="tabular text-xs whitespace-nowrap">
                        {dateShort(p.inceptionDate)}
                        <span className="block text-muted-foreground">
                          s/d {dateShort(p.expiryDate)}
                        </span>
                      </TableCell>
                      <TableCell className="tabular text-right font-medium whitespace-nowrap">
                        {money(p.premium, p.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell>
                        {p.softcopy ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-mx-2 text-primary"
                          >
                            <FileText data-icon="inline-start" />
                            Lihat file
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            Belum ada
                          </Badge>
                        )}
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
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.info("Membuka file polis…")
                                }
                              >
                                <FileText />
                                Lihat softcopy
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.success("Upload dimulai", {
                                    description: "Demo statis.",
                                  })
                                }
                              >
                                <Upload />
                                Upload ulang
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem variant="destructive">
                                <Trash2 />
                                Hapus polis
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
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Menampilkan {rows.length} dari {POLICIES.length} polis
        </span>
        <span>
          Total premium (setara IDR):{" "}
          <span className="tabular font-medium text-foreground">
            {rupiah(totalPremium)}
          </span>
        </span>
      </div>
    </div>
  )
}
