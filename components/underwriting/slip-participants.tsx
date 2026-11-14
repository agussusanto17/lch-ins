"use client"

import * as React from "react"
import { Download, FileSpreadsheet, Plus, Search, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { TablePagination } from "@/components/shared/table-pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { NumberInput } from "@/components/ui/number-input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SlipParticipant } from "@/lib/data/types"
import { money } from "@/lib/format"
import {
  PARTICIPANT_COLUMNS,
  PARTICIPANT_LIMITS,
  participantsFromRows,
  participantsTotal,
} from "@/lib/slip-participants"

const PAGE_SIZES = [25, 50, 100]

let idSeq = 0
const newParticipantId = () => `peserta-${Date.now().toString(36)}-${(idSeq++).toString(36)}`

/** Unduh workbook ExcelJS sebagai file .xlsx. */
async function downloadWorkbook(
  build: (wb: import("exceljs").Workbook) => void,
  filename: string
) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  build(wb)
  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  )
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function participantsSheet(
  wb: import("exceljs").Workbook,
  list: readonly SlipParticipant[]
) {
  const ws = wb.addWorksheet("Peserta")
  ws.columns = PARTICIPANT_COLUMNS.map((c) => ({
    header: c.required ? `${c.header}*` : c.header,
    key: c.key,
    width: c.key === "name" ? 28 : c.key === "sumInsured" ? 18 : 20,
  }))
  ws.getRow(1).font = { bold: true }
  for (const p of list) {
    ws.addRow({
      ...p,
      birthDate: p.birthDate ? p.birthDate.split("-").reverse().join("/") : "",
    })
  }
  ws.getColumn("sumInsured").numFmt = "#,##0.00"
  return ws
}

/**
 * Peserta PA grup, diisi langsung atau diimpor dari Excel, dicetak sebagai lampiran slip.
 * Interest Insured ikut terisi dari jumlah peserta dan total UP (Harry, 6 November 2026).
 */
export function SlipParticipants({
  participants,
  currency,
  locked,
  onChange,
}: {
  participants: SlipParticipant[]
  currency: string
  locked: boolean
  onChange: (list: SlipParticipant[]) => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(PAGE_SIZES[0])
  const [errors, setErrors] = React.useState<string[]>([])
  const [pending, setPending] = React.useState<SlipParticipant[] | null>(null)
  const [confirmClear, setConfirmClear] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const q = query.trim().toLowerCase()
  const rows = React.useMemo(
    () =>
      participants
        .map((p, index) => ({ p, index }))
        .filter(
          ({ p }) =>
            !q ||
            [p.name, p.idNumber, p.position, p.level, p.workLocation]
              .filter(Boolean)
              .some((v) => v!.toLowerCase().includes(q))
        ),
    [participants, q]
  )
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const shown = rows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const total = participantsTotal(participants)

  const update = (index: number, patch: Partial<SlipParticipant>) =>
    onChange(participants.map((p, i) => (i === index ? { ...p, ...patch } : p)))

  async function importFile(file: File) {
    setBusy(true)
    setErrors([])
    try {
      const { default: ExcelJS } = await import("exceljs")
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      const sheetRows: unknown[][] = []
      ws?.eachRow({ includeEmpty: true }, (row, n) => {
        sheetRows[n - 1] = (row.values as unknown[]).slice(1)
      })
      const result = participantsFromRows(
        Array.from(sheetRows, (r) => r ?? []),
        () => newParticipantId()
      )
      if (result.errors.length) {
        setErrors(result.errors)
        return
      }
      if (participants.length) setPending(result.participants)
      else {
        onChange(result.participants)
        toast.success(`${result.participants.length.toLocaleString("id-ID")} peserta diimpor`)
      }
    } catch {
      setErrors(["File tidak bisa dibaca. Pakai file Excel (.xlsx) dari template peserta."])
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm">
          <span className="font-medium">
            {participants.length.toLocaleString("id-ID")} peserta
          </span>
          <span className="text-muted-foreground">
            {" "}
            · total UP {money(total, currency)}
          </span>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importFile(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            void downloadWorkbook((wb) => {
              participantsSheet(wb, [])
              const help = wb.addWorksheet("Petunjuk")
              help.getColumn(1).width = 100
              for (const line of [
                "Isi satu peserta per baris di sheet Peserta, mulai baris 2. Kolom bertanda * wajib diisi.",
                "Tanggal Lahir: DD/MM/YYYY, misalnya 30/06/1993, atau format tanggal Excel.",
                "Jenis Kelamin: Pria atau Wanita (L/P juga dikenali).",
                "Sum Insured: angka tanpa mata uang, misalnya 75000000.",
                "Judul kolom boleh dari lampiran lama, misalnya Tgl Lahir atau Lokasi Kerja.",
              ])
                help.addRow([line])
            }, "template-peserta-pa.xlsx")
          }
        >
          <FileSpreadsheet data-icon="inline-start" />
          Template Excel
        </Button>
        {!locked ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            {busy ? "Membaca…" : "Impor dari Excel"}
          </Button>
        ) : null}
        {participants.length ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              void downloadWorkbook(
                (wb) => participantsSheet(wb, participants),
                "daftar-peserta-pa.xlsx"
              )
            }
          >
            <Download data-icon="inline-start" />
            Unduh daftar
          </Button>
        ) : null}
      </div>

      {errors.length ? (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p className="font-medium">
            File belum bisa diimpor. Perbaiki dulu di Excel, lalu impor lagi:
          </p>
          <ul className="mt-1 list-disc pl-4">
            {errors.slice(0, 8).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {errors.length > 8 ? (
            <p className="mt-1">dan {errors.length - 8} kesalahan lain.</p>
          ) : null}
        </div>
      ) : null}

      {participants.length ? (
        <InputGroup className="h-9 sm:max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            placeholder="Cari nama, identitas, jabatan, atau lokasi…"
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </InputGroup>
      ) : null}

      {participants.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[1180px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">No</TableHead>
                <TableHead className="w-52">Nama *</TableHead>
                <TableHead className="w-36">No. Identitas</TableHead>
                <TableHead className="w-36">Tanggal Lahir</TableHead>
                <TableHead className="w-28">Jenis Kelamin</TableHead>
                <TableHead className="w-40">Jabatan</TableHead>
                <TableHead className="w-32">Level</TableHead>
                <TableHead className="w-36">Lokasi Kerja</TableHead>
                <TableHead className="w-40 text-right">Sum Insured *</TableHead>
                <TableHead className="w-36">Ahli Waris</TableHead>
                {!locked ? <TableHead className="w-10" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map(({ p, index }) => {
                const label = `peserta ${index + 1}`
                const text = (key: keyof SlipParticipant, list?: string) => (
                  <Input
                    className="h-8 text-xs"
                    aria-label={`${PARTICIPANT_COLUMNS.find((c) => c.key === key)?.header ?? key} ${label}`}
                    list={list}
                    maxLength={PARTICIPANT_LIMITS.text}
                    readOnly={locked}
                    value={(p[key] as string | undefined) ?? ""}
                    onChange={(e) => update(index, { [key]: e.target.value })}
                  />
                )
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground tabular">
                      {index + 1}
                    </TableCell>
                    <TableCell>{text("name")}</TableCell>
                    <TableCell>{text("idNumber")}</TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        aria-label={`Tanggal lahir ${label}`}
                        readOnly={locked}
                        value={p.birthDate ?? ""}
                        onChange={(e) => update(index, { birthDate: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell>{text("gender", "peserta-gender")}</TableCell>
                    <TableCell>{text("position")}</TableCell>
                    <TableCell>{text("level")}</TableCell>
                    <TableCell>{text("workLocation")}</TableCell>
                    <TableCell>
                      <NumberInput
                        className="ml-auto h-8 w-36 text-xs"
                        aria-label={`Sum insured ${label}`}
                        readOnly={locked}
                        value={p.sumInsured || null}
                        onValueChange={(v) => update(index, { sumInsured: v ?? 0 })}
                      />
                    </TableCell>
                    <TableCell>{text("beneficiary")}</TableCell>
                    {!locked ? (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Hapus ${label}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onChange(participants.filter((_, i) => i !== index))}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
              {!shown.length ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-6 text-center text-sm text-muted-foreground">
                    Tidak ada peserta yang cocok.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <datalist id="peserta-gender">
            <option value="Pria" />
            <option value="Wanita" />
          </datalist>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          Belum ada peserta. Impor dari Excel memakai template, atau tambah satu
          per satu.
        </p>
      )}

      {rows.length > pageSize ? (
        <TablePagination
          page={safePage}
          pageSize={pageSize}
          totalItems={rows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          pageSizeOptions={PAGE_SIZES}
          itemName="peserta"
        />
      ) : null}

      {!locked ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={participants.length >= PARTICIPANT_LIMITS.rows}
            onClick={() => {
              const next = [...participants, { id: newParticipantId(), name: "", sumInsured: 0 }]
              onChange(next)
              setQuery("")
              setPage(Math.ceil(next.length / pageSize))
            }}
          >
            <Plus data-icon="inline-start" />
            Tambah peserta
          </Button>
          {participants.length ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 data-icon="inline-start" />
              Hapus semua
            </Button>
          ) : null}
        </div>
      ) : null}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ganti daftar peserta?</AlertDialogTitle>
            <AlertDialogDescription>
              {participants.length.toLocaleString("id-ID")} peserta yang ada akan
              diganti {pending?.length.toLocaleString("id-ID")} peserta dari file
              Excel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) {
                  onChange(pending)
                  toast.success(`${pending.length.toLocaleString("id-ID")} peserta diimpor`)
                }
                setPending(null)
                setPage(1)
              }}
            >
              Ganti daftar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus semua peserta?</AlertDialogTitle>
            <AlertDialogDescription>
              {participants.length.toLocaleString("id-ID")} peserta dihapus dari slip
              ini setelah disimpan. Interest Insured dari daftar peserta ikut
              dikosongkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onChange([])
                setConfirmClear(false)
              }}
            >
              Hapus semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
