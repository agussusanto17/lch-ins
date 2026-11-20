"use client"

import * as React from "react"
import { FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"

import { FormDrawer } from "@/components/shared/form-drawer"
import { UploadSummary } from "@/components/shared/upload-summary"
import {
  importObjectsPatch,
  importReplacesObjects,
  isBlankObjectGroup,
  objectRateLabels,
  recalc,
} from "@/components/underwriting/slip-model"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { sumPremium } from "@/lib/calc"
import type { PlacingSlip } from "@/lib/data"
import { downloadWorkbook } from "@/lib/export"
import { money, num } from "@/lib/format"
import {
  LOW_RATE_PERCENT,
  OBJECT_IMPORT_LIMIT,
  existingSerialKeys,
  fillObjectTemplate,
  objectsFromRows,
  percentCellValue,
} from "@/lib/object-import"
import { GENERIC_RATE_LABEL, itemGroups, itemSection } from "@/lib/slip-items"

/**
 * Isi setiap sheet sebagai larik baris; sel berformat persen dibaca sebagai persen. Jadwal unit LCH
 * bisa berisi beberapa sheet, misalnya satu sheet per quotation, jadi sheet-nya dipilih di dialog.
 */
async function readWorkbook(file: File) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  return wb.worksheets.map((ws) => {
    const rows: unknown[][] = []
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const values: unknown[] = []
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        values[col - 1] = percentCellValue(cell.value, cell.numFmt)
      })
      rows[n - 1] = values
    })
    return { name: ws.name, rows: Array.from(rows, (r) => r ?? []) }
  })
}

/** Sheet yang dibaca lebih dulu: sheet Objek template, atau sheet pertama. */
const defaultSheet = (sheets: { name: string }[]) =>
  (sheets.find((s) => s.name === "Objek") ?? sheets[0])?.name ?? null

async function downloadTemplate(slip: PlacingSlip) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "PT. LCH Insurance Brokers"
  fillObjectTemplate(wb, {
    insuredName: slip.insuredName,
    currency: slip.currency || "IDR",
    typeOfCover: slip.typeOfCover,
    rateLabels: objectRateLabels(slip),
  })
  await downloadWorkbook(wb, "template-upload-objek-engineering")
}

const count = (n: number) => n.toLocaleString("id-ID")

/** Nama cover di layar; cover pertama tanpa nama ditampilkan sebagai rate objek. */
const coverText = (label: string) =>
  label.trim() && label.trim() !== GENERIC_RATE_LABEL ? label.trim() : "Rate objek"

/**
 * Upload daftar objek slip Engineering dari Excel (Agus, 20 November 2026), misalnya unit alat
 * berat Equipment All Risks. Isi file dicek per baris dulu, lalu objek yang benar masuk ke form;
 * slip tersimpan saat Simpan Draft seperti isian lain.
 */
export function ObjectUpload({
  slip,
  open,
  onOpenChange,
  onImport,
}: {
  slip: PlacingSlip
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (patch: Partial<PlacingSlip>) => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [sheets, setSheets] = React.useState<{ name: string; rows: unknown[][] }[]>([])
  const [sheetName, setSheetName] = React.useState<string | null>(null)
  const sheetRows = sheets.find((s) => s.name === sheetName)?.rows ?? null
  const [readError, setReadError] = React.useState<string | null>(null)
  const [reading, setReading] = React.useState(false)
  const [replace, setReplace] = React.useState(false)

  const objects = itemGroups(slip).filter((g) => itemSection(g.item) === 1)
  const hasObjects = !(
    !objects.length ||
    (objects.length === 1 && isBlankObjectGroup(objects[0]))
  )
  const replaceAll = importReplacesObjects(slip, replace)
  // Slip yang objeknya masih kosong tidak "mengganti" apa pun di mata user.
  const replacing = hasObjects && replace
  const rateLabels = objectRateLabels(slip)
  const sectioned = Boolean(slip.usesSections)

  const result = React.useMemo(() => {
    if (!sheetRows) return null
    return objectsFromRows(sheetRows, {
      rateLabels,
      existingSerials: replaceAll
        ? new Set<string>()
        : existingSerialKeys(slip.interestItems),
    })
    // rateLabels berasal dari slip; slip ikut sebagai dependensi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRows, slip, replaceAll])

  // Pratinjau memakai hitungan form: premi per objek setelah objek masuk ke slip.
  const preview = React.useMemo(() => {
    if (!result?.objects.length) return null
    const patch = importObjectsPatch(slip, result.objects, { replace })
    const next = recalc({ ...slip, ...patch })
    const all = itemGroups(next)
    const added = all.slice(all.length - result.objects.length)
    return { patch, added }
  }, [result, slip, replace])

  function reset() {
    setFileName(null)
    setSheets([])
    setSheetName(null)
    setReadError(null)
  }

  async function readFile(file: File) {
    setReading(true)
    reset()
    setFileName(file.name)
    try {
      const read = await readWorkbook(file)
      setSheets(read)
      setSheetName(defaultSheet(read))
    } catch {
      setReadError("File tidak bisa dibaca. Pakai file Excel (.xlsx) dari template objek.")
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  // File sudah dibaca tetapi tidak ada objek baru (semua sudah ada atau gagal): tombol menutup.
  const nothingToAdd =
    Boolean(result?.read) && !result?.fileErrors.length && !result?.objects.length

  function submit() {
    if (nothingToAdd) {
      reset()
      onOpenChange(false)
      return
    }
    if (!preview || !result) {
      if (!readError && !result?.fileErrors.length) setReadError("Pilih file Excel objek dulu.")
      return false
    }
    onImport(preview.patch)
    const n = result.objects.length
    toast.success(
      replacing ? `${count(n)} objek menggantikan objek sebelumnya` : `${count(n)} objek ditambahkan`,
      { description: "Belum tersimpan. Klik Simpan Draft untuk menyimpan slip." }
    )
    reset()
    setReplace(false)
    onOpenChange(false)
  }

  const fileErrors = readError ? [readError] : (result?.fileErrors ?? [])
  const totalSumInsured = preview
    ? preview.added.reduce((a, g) => a + (g.item.amount || 0), 0)
    : 0
  const totalPremium = preview
    ? preview.added.reduce((a, g) => a + sumPremium(g.rateLines), 0)
    : 0
  const skippedExisting = result?.skipped.filter((s) => s.reason === "existing") ?? []
  const skippedTotal = result?.skipped.filter((s) => s.reason === "total") ?? []
  const notes =
    result && !result.fileErrors.length
      ? [
          result.lowRateRows
            ? `${count(result.lowRateRows)} objek punya rate di bawah ${num(LOW_RATE_PERCENT, 2)}%. Pastikan rate diisi dalam persen (1,1 berarti 1,1%), bukan pecahan (0,011).`
            : "",
          result.noRateRows
            ? `${count(result.noRateRows)} objek belum punya rate. Isi di bagian Rate & Premium sebelum release.`
            : "",
          result.objects.length && sectioned
            ? "Objek dari file masuk ke Section 1 (Material Damage). Limit Section 2 tidak berubah."
            : "",
        ].filter(Boolean)
      : []

  return (
    <FormDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
      title="Upload Objek dari Excel"
      description="Satu baris satu objek, misalnya satu unit alat berat. Objek masuk ke form dan ikut tersimpan saat slip disimpan."
      submitLabel={
        nothingToAdd
          ? "Tutup"
          : result?.objects.length
            ? replacing
              ? `Ganti dengan ${count(result.objects.length)} objek`
              : `Tambahkan ${count(result.objects.length)} objek`
            : "Tambahkan"
      }
      onSubmit={submit}
    >
      <div className="flex flex-col gap-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Tertanggung slip</dt>
          <dd className="font-medium">{slip.insuredName.trim() || "—"}</dd>
          <dt className="text-muted-foreground">Mata uang</dt>
          <dd>{slip.currency || "IDR"}</dd>
          <dt className="text-muted-foreground">Cover objek</dt>
          <dd>{rateLabels.map(coverText).join(", ")}</dd>
          <dt className="text-muted-foreground">Objek sekarang</dt>
          <dd>{hasObjects ? `${count(objects.length)} objek` : "Belum ada"}</dd>
        </dl>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void downloadTemplate(slip)}
            >
              <FileSpreadsheet data-icon="inline-start" />
              Template Excel
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void readFile(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              {reading ? "Membaca…" : "Pilih file Excel"}
            </Button>
            {fileName ? (
              <span className="truncate text-xs text-muted-foreground">{fileName}</span>
            ) : null}
          </div>
          {sheets.length > 1 && sheetName ? (
            <div className="flex flex-wrap items-center gap-2">
              <span id="object-upload-sheet-label" className="text-xs text-muted-foreground">
                File ini punya {count(sheets.length)} sheet. Sheet yang dibaca:
              </span>
              <Select
                items={sheets.map((s) => ({ label: s.name, value: s.name }))}
                value={sheetName}
                onValueChange={(v) => v && setSheetName(v)}
              >
                <SelectTrigger
                  size="sm"
                  aria-labelledby="object-upload-sheet-label"
                  className="min-w-40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Merek, tipe, nomor seri, tahun, nilai pertanggungan, dan rate diisi per objek; premi
            dihitung sistem. Jadwal unit dengan kolom BRAND, TYPE, SERIAL NO., YEAR, SUM INSURED,
            dan RATE juga bisa langsung diupload. Maksimal {count(OBJECT_IMPORT_LIMIT)} objek per
            file.
          </p>
        </div>

        {hasObjects ? (
          <Field orientation="horizontal">
            <Switch id="object-upload-replace" checked={replace} onCheckedChange={setReplace} />
            <FieldContent>
              <FieldLabel htmlFor="object-upload-replace" className="font-normal">
                Ganti semua objek yang ada
              </FieldLabel>
              <FieldDescription>
                {replace
                  ? `${count(objects.length)} objek sekarang, beserta rate-nya, diganti isi file.${
                      sectioned ? " Limit Section 2 tetap." : ""
                    }`
                  : "Objek dari file ditambahkan di akhir daftar. Objek yang nomor serinya sudah ada dilewati."}
              </FieldDescription>
            </FieldContent>
          </Field>
        ) : null}

        {fileErrors.length ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            <p className="font-medium text-destructive">
              File belum bisa diproses. Perbaiki lalu pilih file lagi.
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-xs">
              {fileErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : result?.read ? (
          <UploadSummary
            title="Hasil baca file"
            read={result.read}
            ok={result.objects.length}
            okLabel={replacing ? "Siap mengganti" : "Siap ditambahkan"}
            failed={result.failed}
            skipped={result.skipped.length}
            errors={result.errors}
            hint="Baris berikut gagal dan tidak ikut ditambahkan. Perbaiki di file yang sama lalu upload lagi; objek yang sudah ada akan dilewati."
            note={
              !result.objects.length && !result.failed
                ? "Semua objek di file sudah ada di slip. Tidak ada yang baru untuk ditambahkan."
                : undefined
            }
          />
        ) : null}

        {result && !fileErrors.length && result.skipped.length ? (
          <p className="text-xs text-muted-foreground">
            {[
              skippedExisting.length
                ? `${count(skippedExisting.length)} objek sudah ada di slip dan dilewati (${skippedExisting
                    .slice(0, 3)
                    .map((s) => `baris ${s.row}`)
                    .join(", ")}${skippedExisting.length > 3 ? `, dan ${count(skippedExisting.length - 3)} lainnya` : ""})`
                : "",
              skippedTotal.length
                ? `baris total ${skippedTotal.map((s) => s.row).join(", ")} dilewati`
                : "",
            ]
              .filter(Boolean)
              .join("; ")}
            .
          </p>
        ) : null}

        {notes.length ? (
          <ul
            role="note"
            className="flex list-disc flex-col gap-1 rounded-lg bg-warning/10 px-4 py-3 pl-8 text-sm text-warning"
          >
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}

        {preview && result ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <span className="font-medium">
                {count(result.objects.length)} objek siap{" "}
                {replacing ? "mengganti objek sekarang" : "ditambahkan"}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · nilai {money(totalSumInsured, slip.currency)} · premi{" "}
                {money(totalPremium, slip.currency)}
              </span>
            </p>
            <div className="max-h-[22rem] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Objek</TableHead>
                    <TableHead className="text-right">Nilai</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Premi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.added.map((g, i) => {
                    const row = result.objects[i]
                    const [first, ...rest] = row.description.split("\n")
                    const rates = g.rateLines
                      .filter((l) => (l.rate ?? 0) > 0)
                      .map((l) => `${num(l.rate ?? 0, 2, 4)}%`)
                    return (
                      <TableRow key={row.row}>
                        <TableCell className="tabular-nums">{row.row}</TableCell>
                        <TableCell className="max-w-72 whitespace-normal">
                          <div className="font-medium">{first}</div>
                          {rest.length ? (
                            <div className="text-xs text-muted-foreground">{rest.join(" ")}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(g.item.amount || 0, slip.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {rates.length ? rates.join(" + ") : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(sumPremium(g.rateLines), slip.currency)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </div>
    </FormDrawer>
  )
}
