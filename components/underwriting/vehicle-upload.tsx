"use client"

import * as React from "react"
import { FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"

import { FormDrawer } from "@/components/shared/form-drawer"
import { UploadSummary } from "@/components/shared/upload-summary"
import {
  importReplacesVehicles,
  importVehiclesPatch,
  isBlankVehicleGroup,
  isOutOfBounds,
  rateLinesWithBounds,
  recalc,
  vehicleRateLabels,
} from "@/components/underwriting/slip-model"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
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
import type { PlacingSlip, VehicleBrandOption } from "@/lib/data"
import { downloadWorkbook } from "@/lib/export"
import { money } from "@/lib/format"
import { itemGroups } from "@/lib/slip-items"
import {
  VEHICLE_IMPORT_LIMIT,
  chassisKey,
  fillVehicleTemplate,
  vehiclesFromRows,
} from "@/lib/vehicle-import"

/** Isi sheet Kendaraan, atau sheet pertama bila namanya diganti, sebagai larik baris. */
async function readSheetRows(file: File) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.getWorksheet("Kendaraan") ?? wb.worksheets[0]
  const rows: unknown[][] = []
  ws?.eachRow({ includeEmpty: true }, (row, n) => {
    rows[n - 1] = (row.values as unknown[]).slice(1)
  })
  return Array.from(rows, (r) => r ?? [])
}

async function downloadTemplate(slip: PlacingSlip, brands: readonly VehicleBrandOption[]) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "PT. LCH Insurance Brokers"
  fillVehicleTemplate(wb, {
    insuredName: slip.insuredName,
    currency: slip.currency || "IDR",
    rateLabels: vehicleRateLabels(slip),
    brands,
  })
  await downloadWorkbook(wb, "template-upload-kendaraan-mv")
}

const count = (n: number) => n.toLocaleString("id-ID")

/**
 * Upload daftar kendaraan slip Motor Vehicle dari Excel (MoM review Phase 1, poin 20). Isi file
 * dicek per baris dulu, lalu kendaraan yang benar masuk ke form; slip tersimpan saat Simpan Draft
 * seperti isian lain.
 */
export function VehicleUpload({
  slip,
  brands,
  open,
  onOpenChange,
  onImport,
}: {
  slip: PlacingSlip
  /** Merek dan tipe kendaraan dari Master Data. */
  brands: readonly VehicleBrandOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (patch: Partial<PlacingSlip>) => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [sheetRows, setSheetRows] = React.useState<unknown[][] | null>(null)
  const [readError, setReadError] = React.useState<string | null>(null)
  const [reading, setReading] = React.useState(false)
  const [replace, setReplace] = React.useState(false)

  const groups = itemGroups(slip)
  const hasVehicles = !(
    !groups.length ||
    (groups.length === 1 && isBlankVehicleGroup(groups[0]))
  )
  const replaceAll = importReplacesVehicles(slip, replace)
  // Slip yang kendaraannya masih kosong tidak "mengganti" apa pun di mata user.
  const replacing = hasVehicles && replace
  const rateLabels = vehicleRateLabels(slip)
  // Deductible yang disalin ke kendaraan baru bila file tanpa deductible.
  const firstHasDeductibles = Boolean(
    groups[0] &&
      [...groups[0].rateLines, ...groups[0].tplLines, ...groups[0].paLines].some(
        (l) => l.deductibles?.some((d) => d.trim())
      )
  )

  const result = React.useMemo(() => {
    if (!sheetRows) return null
    return vehiclesFromRows(sheetRows, {
      rateLabels,
      brands,
      existingChassis: replaceAll
        ? new Set<string>()
        : new Set(slip.interestItems.map((i) => chassisKey(i.chassisNumber)).filter(Boolean)),
    })
    // rateLabels berasal dari slip; slip ikut sebagai dependensi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRows, slip, brands, replaceAll])

  // Pratinjau memakai hitungan form: premi per kendaraan setelah kendaraan masuk ke slip.
  const preview = React.useMemo(() => {
    if (!result?.vehicles.length) return null
    const patch = importVehiclesPatch(slip, result.vehicles, {
      replace,
      fileDeductibles: result.hasDeductibles,
    })
    const next = recalc({ ...slip, ...patch })
    const all = itemGroups(next)
    const added = all.slice(all.length - result.vehicles.length)
    const addedLines = new Set(added.flatMap((g) => g.rateLines.map((l) => l.id)))
    const outOfBounds = rateLinesWithBounds(next).filter(
      (l) => addedLines.has(l.id) && isOutOfBounds(l)
    ).length
    return { patch, added, outOfBounds }
  }, [result, slip, replace])

  function reset() {
    setFileName(null)
    setSheetRows(null)
    setReadError(null)
  }

  async function readFile(file: File) {
    setReading(true)
    reset()
    setFileName(file.name)
    try {
      setSheetRows(await readSheetRows(file))
    } catch {
      setReadError("File tidak bisa dibaca. Pakai file Excel (.xlsx) dari template kendaraan.")
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  // File sudah dibaca tetapi tidak ada kendaraan baru (semua sudah ada atau gagal): tombol menutup.
  const nothingToAdd =
    Boolean(result?.read) && !result?.fileErrors.length && !result?.vehicles.length

  function submit() {
    if (nothingToAdd) {
      reset()
      onOpenChange(false)
      return
    }
    if (!preview || !result) {
      if (!readError && !result?.fileErrors.length)
        setReadError("Pilih file Excel kendaraan dulu.")
      return false
    }
    onImport(preview.patch)
    const n = result.vehicles.length
    toast.success(
      replacing
        ? `${count(n)} kendaraan menggantikan kendaraan sebelumnya`
        : `${count(n)} kendaraan ditambahkan`,
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
  const groupPremium = (g: (typeof groups)[number]) =>
    sumPremium(g.rateLines) + sumPremium(g.tplLines) + sumPremium(g.paLines)
  const totalPremium = preview ? preview.added.reduce((a, g) => a + groupPremium(g), 0) : 0
  const notes =
    result && !result.fileErrors.length
      ? [
          result.ignoredColumns.length
            ? `Kolom ${result.ignoredColumns.join(", ")} tidak cocok dengan cover slip ini dan diabaikan. Unduh template dari slip ini.`
            : "",
          result.vehicles.length && !result.hasDeductibles && firstHasDeductibles
            ? "File tanpa deductible: kendaraan baru memakai deductible Kendaraan 1."
            : "",
          result.noRateRows
            ? `${count(result.noRateRows)} kendaraan belum punya rate casco atau perluasan. Isi di form sebelum release.`
            : "",
          preview?.outOfBounds
            ? `${count(preview.outOfBounds)} rate di luar batas OJK. Isi alasannya di form sebelum release.`
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
      title="Upload Kendaraan dari Excel"
      description="Satu baris satu kendaraan. Kendaraan masuk ke form dan ikut tersimpan saat slip disimpan."
      submitLabel={
        nothingToAdd
          ? "Tutup"
          : result?.vehicles.length
            ? replacing
              ? `Ganti dengan ${count(result.vehicles.length)} kendaraan`
              : `Tambahkan ${count(result.vehicles.length)} kendaraan`
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
          <dt className="text-muted-foreground">Cover</dt>
          <dd>{rateLabels.join(", ")}</dd>
          <dt className="text-muted-foreground">Kendaraan sekarang</dt>
          <dd>{hasVehicles ? `${count(groups.length)} kendaraan` : "Belum ada"}</dd>
        </dl>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void downloadTemplate(slip, brands)}
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
          <p className="text-xs text-muted-foreground">
            Data kendaraan, sum insured, rate, TPL, PA, dan deductible diisi per kendaraan;
            premi dihitung sistem. Merek dan tipe harus ada di Master Data. Maksimal{" "}
            {count(VEHICLE_IMPORT_LIMIT)} kendaraan per file.
          </p>
        </div>

        {hasVehicles ? (
          <Field orientation="horizontal">
            <Switch id="vehicle-upload-replace" checked={replace} onCheckedChange={setReplace} />
            <FieldContent>
              <FieldLabel htmlFor="vehicle-upload-replace" className="font-normal">
                Ganti semua kendaraan yang ada
              </FieldLabel>
              <FieldDescription>
                {replace
                  ? `${count(groups.length)} kendaraan sekarang, beserta rate, TPL, PA, dan deductible-nya, diganti isi file.`
                  : "Kendaraan dari file ditambahkan di akhir daftar. Kendaraan yang nomor rangkanya sudah ada dilewati."}
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
            ok={result.vehicles.length}
            okLabel={replacing ? "Siap mengganti" : "Siap ditambahkan"}
            failed={result.failed}
            skipped={result.skipped.length}
            errors={result.errors}
            hint="Baris berikut gagal dan tidak ikut ditambahkan. Perbaiki di file yang sama lalu upload lagi; kendaraan yang sudah ada akan dilewati."
            note={
              !result.vehicles.length && !result.failed
                ? "Semua kendaraan di file sudah ada di slip. Tidak ada yang baru untuk ditambahkan."
                : undefined
            }
          />
        ) : null}

        {result?.skipped.length && !fileErrors.length ? (
          <p className="text-xs text-muted-foreground">
            {count(result.skipped.length)} kendaraan sudah ada di slip dan dilewati:{" "}
            {result.skipped
              .slice(0, 3)
              .map((s) => `baris ${s.row}`)
              .join(", ")}
            {result.skipped.length > 3
              ? `, dan ${count(result.skipped.length - 3)} lainnya`
              : ""}
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
                {count(result.vehicles.length)} kendaraan siap{" "}
                {replacing ? "mengganti kendaraan sekarang" : "ditambahkan"}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · sum insured {money(totalSumInsured, slip.currency)} · premi{" "}
                {money(totalPremium, slip.currency)}
              </span>
            </p>
            <div className="max-h-[22rem] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead className="text-right">Sum Insured</TableHead>
                    <TableHead className="text-right">Premi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.added.map((g, i) => {
                    const row = result.vehicles[i]
                    const name = [row.brandName, row.typeName, row.model].filter(Boolean).join(" ")
                    const facts = [row.plate, row.year, row.color].filter(Boolean).join(" · ")
                    return (
                      <TableRow key={row.row}>
                        <TableCell className="tabular-nums">{row.row}</TableCell>
                        <TableCell className="max-w-64 whitespace-normal">
                          <div className="truncate font-medium" title={name}>
                            {name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {facts ? `${facts} · ` : ""}
                            {row.chassis}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(g.item.amount || 0, slip.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(groupPremium(g), slip.currency)}
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
