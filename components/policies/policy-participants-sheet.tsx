"use client"

import * as React from "react"
import { Download, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { listPolicyParticipantsAction } from "@/app/(app)/policies/actions"
import { useToday } from "@/components/layout/today-provider"
import { TablePagination } from "@/components/shared/table-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Policy } from "@/lib/data"
import { dateShort, money } from "@/lib/format"
import { participantActiveOn, type PolicyParticipant } from "@/lib/policy-participants"
import { participantsTotal } from "@/lib/slip-participants"

const PAGE_SIZE = 25

/**
 * Daftar peserta PA grup sebuah polis: peserta awal dari slip, ditambah dan
 * dikurangi endorsement (jawaban Harry, 6 November 2026). Endorsement
 * menampilkan daftar polis induknya.
 */
export function PolicyParticipantsSheet({
  policy,
  onOpenChange,
}: {
  policy: Policy | null
  onOpenChange: (open: boolean) => void
}) {
  const [rows, setRows] = React.useState<PolicyParticipant[] | null>(null)
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null)
  const today = useToday()

  const policyId = policy?.id ?? null
  if (policyId !== loadedFor) {
    setLoadedFor(policyId)
    setRows(null)
    setQuery("")
    setPage(1)
  }

  React.useEffect(() => {
    if (!policyId) return
    let active = true
    listPolicyParticipantsAction(policyId).then((res) => {
      if (!active) return
      if (!res.ok) {
        toast.error("Gagal memuat peserta", { description: res.error })
        setRows([])
        return
      }
      setRows(res.data ?? [])
    })
    return () => {
      active = false
    }
  }, [policyId])

  const list = rows ?? []
  const active = list.filter((p) => p.endDate == null)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? list.filter((p) =>
        [p.name, p.idNumber, p.level, p.workLocation]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      )
    : list
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function exportExcel() {
    const { default: ExcelJS } = await import("exceljs")
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Peserta")
    ws.columns = [
      { header: "Nama", key: "name", width: 28 },
      { header: "No. Identitas", key: "idNumber", width: 20 },
      { header: "Tanggal Lahir", key: "birthDate", width: 14 },
      { header: "Jenis Kelamin", key: "gender", width: 12 },
      { header: "Jabatan", key: "position", width: 22 },
      { header: "Level Jabatan", key: "level", width: 18 },
      { header: "Lokasi Kerja", key: "workLocation", width: 20 },
      { header: "Sum Insured", key: "sumInsured", width: 18 },
      { header: "Ahli Waris", key: "beneficiary", width: 20 },
      { header: "Mulai Dijamin", key: "startDate", width: 14 },
      { header: "Berhenti", key: "endDate", width: 14 },
      { header: "Ditambah oleh", key: "addedByPolicyNo", width: 22 },
      { header: "Dikurangi oleh", key: "removedByPolicyNo", width: 22 },
    ]
    ws.getRow(1).font = { bold: true }
    for (const p of list) ws.addRow(p)
    ws.getColumn("sumInsured").numFmt = "#,##0.00"
    const buffer = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    )
    const a = document.createElement("a")
    a.href = url
    a.download = `peserta-${policy?.policyNo.replace(/[^\w-]+/g, "-") ?? "polis"}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <Sheet open={policy != null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-[60rem]">
        <SheetHeader className="border-b py-5">
          <SheetTitle className="text-base">Peserta Polis</SheetTitle>
          <SheetDescription>
            {policy?.policyNo} · {policy?.insuredName}
            {policy?.type === "Endorsement" || policy?.type === "Cancellation" ? (
              <span className="block">
                Daftar peserta polis induk. Perubahan dari endorsement ditandai
                nomor endorsement-nya.
              </span>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
          {rows === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat peserta…
            </p>
          ) : list.length === 0 ? (
            <p className="rounded-lg bg-muted/60 px-3 py-6 text-center text-sm text-muted-foreground">
              Polis ini belum punya daftar peserta. Peserta disalin dari placing
              slip saat polis dibuat, lalu bisa ditambah atau dikurangi lewat
              endorsement.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm">
                  <span className="font-medium">
                    {active.length.toLocaleString("id-ID")} peserta aktif
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · UP {money(participantsTotal(active), policy?.currency ?? "IDR")}
                    {list.length > active.length
                      ? ` · ${(list.length - active.length).toLocaleString("id-ID")} berhenti`
                      : ""}
                  </span>
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => void exportExcel()}>
                  <Download data-icon="inline-start" />
                  Unduh Excel
                </Button>
              </div>
              <InputGroup className="h-9 sm:max-w-sm">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={query}
                  placeholder="Cari nama, identitas, level, atau lokasi…"
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                />
              </InputGroup>
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Lokasi Kerja</TableHead>
                      <TableHead className="text-right">Sum Insured</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground tabular">
                          {list.indexOf(p) + 1}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.name}
                          {p.idNumber ? (
                            <span className="block text-xs text-muted-foreground">
                              {p.idNumber}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">{p.level}</TableCell>
                        <TableCell className="text-sm">{p.workLocation}</TableCell>
                        <TableCell className="tabular text-right text-sm">
                          {money(p.sumInsured, policy?.currency ?? "IDR")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.endDate ? (
                            <Badge variant="outline">
                              Berhenti {dateShort(p.endDate)}
                              {p.removedByPolicyNo ? ` · ${p.removedByPolicyNo}` : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              {participantActiveOn(p, today) ? "Aktif" : "Mulai"} sejak{" "}
                              {dateShort(p.startDate)}
                              {p.addedByPolicyNo ? ` · ${p.addedByPolicyNo}` : ""}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!shown.length ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                          Tidak ada peserta yang cocok.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              {filtered.length > PAGE_SIZE ? (
                <TablePagination
                  page={safePage}
                  pageSize={PAGE_SIZE}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  itemName="peserta"
                />
              ) : null}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
