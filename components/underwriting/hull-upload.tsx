"use client"

import * as React from "react"
import { FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"

import { FormDrawer } from "@/components/shared/form-drawer"
import { UploadSummary } from "@/components/shared/upload-summary"
import { uid } from "@/components/underwriting/slip-model"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import type { PlacingSlip } from "@/lib/data"
import { downloadWorkbook } from "@/lib/export"
import { money } from "@/lib/format"
import {
  HULL_FORMAT_LABELS,
  hullPolicyYear,
  hullTotals,
  type HullSchedule,
  type HullScheduleFormat,
  type Vessel,
} from "@/lib/marine-hull"
import { HULL_IMPORT_LIMIT, fillHullTemplate, vesselsFromRows } from "@/lib/marine-hull-import"

const count = (n: number) => n.toLocaleString("id-ID")

/** Kunci kapal untuk melewati kapal yang sudah ada: IMO bila terisi, selain itu nama. */
const vesselKey = (v: Pick<Vessel, "imo" | "name">) =>
  (v.imo.trim() || v.name).replace(/\s+/g, " ").trim().toUpperCase()

const isBlankVessel = (v: Vessel) => !v.name.trim() && !v.hmValue && !v.ivValue && !v.warValue

/**
 * Baris sheet jadwal kapal: sheet "Jadwal Kapal" dari template, atau sheet pertama yang punya kolom
 * VESSEL (jadwal dari LCH Singapore), atau sheet pertama.
 */
async function readScheduleRows(file: File) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const toRows = (ws: (typeof wb.worksheets)[number]) => {
    const rows: unknown[][] = []
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      rows[n - 1] = (row.values as unknown[]).slice(1)
    })
    return Array.from(rows, (r) => r ?? [])
  }
  const hasVesselHeader = (rows: unknown[][]) =>
    rows.slice(0, 20).some((r) => r.some((c) => String(c ?? "").trim().toUpperCase() === "VESSEL"))
  const named = wb.getWorksheet("Jadwal Kapal")
  if (named) return toRows(named)
  for (const ws of wb.worksheets) {
    const rows = toRows(ws)
    if (hasVesselHeader(rows)) return rows
  }
  return wb.worksheets[0] ? toRows(wb.worksheets[0]) : []
}

async function downloadTemplate(format: HullScheduleFormat, policyYear: number) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "PT. LCH Insurance Brokers"
  fillHullTemplate(wb, format, policyYear)
  await downloadWorkbook(wb, `template-jadwal-kapal-${format}`)
}

/**
 * Upload jadwal kapal Marine Hull dari Excel: template sistem atau jadwal LCH Singapore format
 * Patria maupun MHL. Format jadwal slip mengikuti file. Kapal masuk ke form dan tersimpan saat
 * Simpan Draft.
 */
export function HullUpload({
  slip,
  schedule,
  open,
  onOpenChange,
  onImport,
}: {
  slip: PlacingSlip
  schedule: HullSchedule
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (schedule: HullSchedule) => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [sheetRows, setSheetRows] = React.useState<unknown[][] | null>(null)
  const [readError, setReadError] = React.useState<string | null>(null)
  const [reading, setReading] = React.useState(false)
  const [replace, setReplace] = React.useState(false)

  const current = schedule.vessels.filter((v) => !isBlankVessel(v))
  const replacing = current.length > 0 && replace
  const policyYear = hullPolicyYear(slip.inceptionDate)

  const result = React.useMemo(() => {
    if (!sheetRows) return null
    const read = vesselsFromRows(sheetRows, () => uid("vessel"))
    const existing = new Set(replacing ? [] : current.map(vesselKey))
    const seen = new Set<string>()
    const vessels: Vessel[] = []
    let skipped = 0
    for (const v of read.vessels) {
      const key = vesselKey(v)
      if (existing.has(key) || seen.has(key)) {
        skipped++
        continue
      }
      seen.add(key)
      vessels.push(v)
    }
    const failed = read.errors.filter((e) => e.endsWith("VESSEL kosong.")).length
    const fileError = !read.vessels.length || read.errors.some((e) => !e.startsWith("Baris "))
    return { ...read, vessels, skipped, failed, fileError, total: read.vessels.length + failed }
    // current berasal dari schedule; schedule ikut sebagai dependensi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRows, schedule, replacing])

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
      setSheetRows(await readScheduleRows(file))
    } catch {
      setReadError("File tidak bisa dibaca. Pakai file Excel (.xlsx) dari template jadwal kapal.")
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const nothingToAdd = Boolean(result) && !result?.fileError && !result?.vessels.length

  function submit() {
    if (nothingToAdd) {
      reset()
      onOpenChange(false)
      return
    }
    if (!result || result.fileError || !result.vessels.length) {
      if (!readError && !result) setReadError("Pilih file Excel jadwal kapal dulu.")
      return false
    }
    const vessels = replacing ? result.vessels : [...current, ...result.vessels]
    onImport({ ...schedule, format: result.format, vessels })
    const n = result.vessels.length
    toast.success(
      replacing ? `${count(n)} kapal menggantikan jadwal sebelumnya` : `${count(n)} kapal ditambahkan`,
      { description: "Belum tersimpan. Klik Simpan Draft untuk menyimpan slip." }
    )
    reset()
    setReplace(false)
    onOpenChange(false)
  }

  const fileErrors = readError ? [readError] : result?.fileError ? result.errors : []
  const added = result && !result.fileError ? hullTotals(result.vessels) : null

  return (
    <FormDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
      title="Upload Jadwal Kapal dari Excel"
      description="Satu baris satu kapal. Kapal masuk ke jadwal slip dan ikut tersimpan saat slip disimpan."
      submitLabel={
        nothingToAdd
          ? "Tutup"
          : result?.vessels.length && !result.fileError
            ? replacing
              ? `Ganti dengan ${count(result.vessels.length)} kapal`
              : `Tambahkan ${count(result.vessels.length)} kapal`
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
          <dt className="text-muted-foreground">Format jadwal</dt>
          <dd>{HULL_FORMAT_LABELS[schedule.format]}</dd>
          <dt className="text-muted-foreground">Kapal sekarang</dt>
          <dd>{current.length ? `${count(current.length)} kapal` : "Belum ada"}</dd>
        </dl>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {(["patria", "mhl"] as const).map((format) => (
              <Button
                key={format}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void downloadTemplate(format, policyYear)}
              >
                <FileSpreadsheet data-icon="inline-start" />
                Template {format === "patria" ? "Patria" : "MHL"}
              </Button>
            ))}
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
            {fileName ? <span className="truncate text-xs text-muted-foreground">{fileName}</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Nilai dan rate (%) diisi per kapal per section; premi dihitung sistem. Jadwal dari LCH
            Singapore format Patria atau MHL boleh diupload langsung setelah disimpan sebagai .xlsx.
            Maksimal {count(HULL_IMPORT_LIMIT)} kapal per file.
          </p>
        </div>

        {current.length ? (
          <Field orientation="horizontal">
            <Switch id="hull-upload-replace" checked={replace} onCheckedChange={setReplace} />
            <FieldContent>
              <FieldLabel htmlFor="hull-upload-replace" className="font-normal">
                Ganti semua kapal yang ada
              </FieldLabel>
              <FieldDescription>
                {replace
                  ? `${count(current.length)} kapal sekarang diganti isi file.`
                  : "Kapal dari file ditambahkan di akhir jadwal. Kapal yang IMO atau namanya sudah ada dilewati."}
              </FieldDescription>
            </FieldContent>
          </Field>
        ) : null}

        {fileErrors.length ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            <p className="font-medium text-destructive">File belum bisa diproses. Perbaiki lalu pilih file lagi.</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-xs">
              {fileErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : result ? (
          <UploadSummary
            title="Hasil baca file"
            read={result.total}
            ok={result.vessels.length}
            okLabel={replacing ? "Siap mengganti" : "Siap ditambahkan"}
            failed={result.failed}
            skipped={result.skipped}
            errors={result.errors}
            hint="Baris tanpa VESSEL dilewati. Kapal yang rate atau nilainya belum lengkap tetap masuk; lengkapi di form sebelum release."
            note={
              added
                ? `Format ${HULL_FORMAT_LABELS[result.format]}${
                    result.years.current ? `, tahun polis ${result.years.current}` : ""
                  }. Premi kapal dari file: H&M ${money(added.hmPremium, slip.currency)}, IV ${money(
                    added.ivPremium,
                    slip.currency
                  )}, War ${money(added.warPremium, slip.currency)}, total ${money(added.premium, slip.currency)}.`
                : undefined
            }
          />
        ) : null}
      </div>
    </FormDrawer>
  )
}
