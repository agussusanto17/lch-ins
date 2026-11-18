"use client"

import * as React from "react"
import { FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"

import { FormDrawer } from "@/components/shared/form-drawer"
import { UploadSummary } from "@/components/shared/upload-summary"
import {
  importLocationsPatch,
  importReplacesLocations,
  isBlankLocationGroup,
  isOutOfBounds,
  occupationParts,
  rateLinesWithBounds,
  recalc,
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
import { BI_RATE_LABELS, sumItems, sumPremium } from "@/lib/calc"
import { constructionClassLabel, type PlacingSlip } from "@/lib/data"
import { money } from "@/lib/format"
import {
  LOCATION_IMPORT_LIMIT,
  fillLocationTemplate,
  locationsFromRows,
} from "@/lib/location-import"
import {
  isFloatingSumInsured,
  locationGroups,
  locationKey,
  oneLineAddress,
  slipLocations,
} from "@/lib/slip-locations"

/** Isi sheet Lokasi, atau sheet pertama bila namanya diganti, sebagai larik baris. */
async function readSheetRows(file: File) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.getWorksheet("Lokasi") ?? wb.worksheets[0]
  const rows: unknown[][] = []
  ws?.eachRow({ includeEmpty: true }, (row, n) => {
    rows[n - 1] = (row.values as unknown[]).slice(1)
  })
  return Array.from(rows, (r) => r ?? [])
}

async function downloadTemplate(slip: PlacingSlip) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "PT. LCH Insurance Brokers"
  fillLocationTemplate(wb, {
    insuredName: slip.insuredName,
    currency: slip.currency || "IDR",
  })
  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  )
  const a = document.createElement("a")
  a.href = url
  a.download = "template-upload-lokasi-property.xlsx"
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const count = (n: number) => n.toLocaleString("id-ID")

/**
 * Upload lokasi slip Property dari Excel (MoM review Phase 1, poin 6). Isi file dicek per baris
 * dulu, lalu lokasi yang benar masuk ke form; slip tersimpan saat Simpan Draft seperti isian lain.
 */
export function LocationUpload({
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
  const [sheetRows, setSheetRows] = React.useState<unknown[][] | null>(null)
  const [readError, setReadError] = React.useState<string | null>(null)
  const [reading, setReading] = React.useState(false)
  const [replace, setReplace] = React.useState(false)

  const floating = isFloatingSumInsured(slip)
  const groups = locationGroups(slip)
  const hasLocations = !(groups.length === 1 && isBlankLocationGroup(groups[0]))
  const replaceAll = importReplacesLocations(slip, replace)
  // Slip yang lokasinya masih kosong tidak "mengganti" apa pun di mata user.
  const replacing = hasLocations && replace
  const rateLabels = groups[0].rateLines.map((l) => l.label)
  const covers = rateLabels.filter((l) => !BI_RATE_LABELS.includes(l))

  const result = React.useMemo(() => {
    if (!sheetRows) return null
    return locationsFromRows(sheetRows, {
      rateLabels,
      floating,
      existingKeys: replaceAll
        ? new Set<string>()
        : new Set(slipLocations(slip).map(locationKey)),
    })
    // rateLabels berasal dari slip; slip ikut sebagai dependensi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRows, slip, floating, replaceAll])

  // Pratinjau memakai hitungan form: premi per lokasi setelah lokasi masuk ke slip.
  const preview = React.useMemo(() => {
    if (!result?.locations.length) return null
    const patch = importLocationsPatch(slip, result.locations, {
      replace,
      indemnityMonths: result.indemnityMonths,
      fileDeductibles: result.hasDeductibles,
    })
    const next = recalc({ ...slip, ...patch })
    const all = locationGroups(next)
    const added = all.slice(all.length - result.locations.length)
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
      setReadError("File tidak bisa dibaca. Pakai file Excel (.xlsx) dari template lokasi.")
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  // File sudah dibaca tetapi tidak ada lokasi baru (semua sudah ada atau gagal): tombol menutup.
  const nothingToAdd = Boolean(result?.read) && !result?.fileErrors.length && !result?.locations.length

  function submit() {
    if (nothingToAdd) {
      reset()
      onOpenChange(false)
      return
    }
    if (!preview || !result) {
      if (!readError && !result?.fileErrors.length)
        setReadError("Pilih file Excel lokasi dulu.")
      return false
    }
    onImport(preview.patch)
    const n = result.locations.length
    toast.success(
      replacing ? `${count(n)} lokasi menggantikan lokasi sebelumnya` : `${count(n)} lokasi ditambahkan`,
      { description: "Belum tersimpan. Klik Simpan Draft untuk menyimpan slip." }
    )
    reset()
    setReplace(false)
    onOpenChange(false)
  }

  const fileErrors = readError ? [readError] : (result?.fileErrors ?? [])
  const totalSumInsured = preview
    ? preview.added.reduce((a, g) => a + sumItems(g.section1) + sumItems(g.section2), 0)
    : 0
  const totalPremium = preview
    ? preview.added.reduce((a, g) => a + sumPremium(g.rateLines), 0)
    : 0
  const notes = result && !result.fileErrors.length
    ? [
        floating && result.floatingIgnoredRows
          ? `Slip floating: sum insured, rate, dan deductible di ${count(result.floatingIgnoredRows)} baris tidak dipakai. Isi sekali di blok Sum insured & rate semua lokasi.`
          : "",
        result.biRateRows
          ? `Rate BI di ${count(result.biRateRows)} baris tidak dipakai: rate BI PAR dan BI EQVET dihitung sistem dari rate lokasi dan Period of Indemnity.`
          : "",
        result.indemnityMonths
          ? `Period of Indemnity slip menjadi ${result.indemnityMonths} bulan.`
          : "",
        !floating && result.locations.length && !result.hasDeductibles
          ? "File tanpa deductible: lokasi baru memakai deductible Lokasi 1."
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
      title="Upload Lokasi dari Excel"
      description="Satu baris satu lokasi. Lokasi masuk ke form dan ikut tersimpan saat slip disimpan."
      submitLabel={
        nothingToAdd
          ? "Tutup"
          : result?.locations.length
          ? replacing
            ? `Ganti dengan ${count(result.locations.length)} lokasi`
            : `Tambahkan ${count(result.locations.length)} lokasi`
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
          <dd>{covers.join(", ") || "—"}</dd>
          <dt className="text-muted-foreground">Lokasi sekarang</dt>
          <dd>
            {hasLocations ? `${count(groups.length)} lokasi` : "Belum ada"}
            {floating ? " · Floating Sum Insured" : ""}
          </dd>
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
          <p className="text-xs text-muted-foreground">
            {floating
              ? "Slip floating hanya memakai kolom Data Lokasi: tertanggung, alamat, okupasi, dan kelas konstruksi."
              : "Sum insured, rate, dan deductible diisi per lokasi; premi dihitung sistem."}{" "}
            Maksimal {count(LOCATION_IMPORT_LIMIT)} lokasi per file.
          </p>
        </div>

        {hasLocations ? (
          <Field orientation="horizontal">
            <Switch id="location-upload-replace" checked={replace} onCheckedChange={setReplace} />
            <FieldContent>
              <FieldLabel htmlFor="location-upload-replace" className="font-normal">
                Ganti semua lokasi yang ada
              </FieldLabel>
              <FieldDescription>
                {replace
                  ? `${count(groups.length)} lokasi sekarang${floating ? "" : ", beserta sum insured, rate, dan deductible-nya,"} diganti isi file.`
                  : "Lokasi dari file ditambahkan di akhir daftar. Lokasi yang alamat dan tertanggungnya sudah ada dilewati."}
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
            ok={result.locations.length}
            okLabel={replacing ? "Siap mengganti" : "Siap ditambahkan"}
            failed={result.failed}
            skipped={result.skipped.length}
            errors={result.errors}
            hint="Baris berikut gagal dan tidak ikut ditambahkan. Perbaiki di file yang sama lalu upload lagi; lokasi yang sudah ada akan dilewati."
            note={
              !result.locations.length && !result.failed
                ? "Semua lokasi di file sudah ada di slip. Tidak ada yang baru untuk ditambahkan."
                : undefined
            }
          />
        ) : null}

        {result?.skipped.length && !fileErrors.length ? (
          <p className="text-xs text-muted-foreground">
            {count(result.skipped.length)} lokasi sudah ada di slip dan dilewati:{" "}
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
          <ul role="note" className="flex list-disc flex-col gap-1 rounded-lg bg-warning/10 px-4 py-3 pl-8 text-sm text-warning">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}

        {preview && result ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <span className="font-medium">
                {count(result.locations.length)} lokasi siap{" "}
                {replacing ? "mengganti lokasi sekarang" : "ditambahkan"}
              </span>
              {floating ? null : (
                <span className="text-muted-foreground">
                  {" "}
                  · sum insured {money(totalSumInsured, slip.currency)} · premi{" "}
                  {money(totalPremium, slip.currency)}
                </span>
              )}
            </p>
            <div className="max-h-[22rem] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Lokasi</TableHead>
                    {floating ? null : (
                      <>
                        <TableHead className="text-right">Sum Insured</TableHead>
                        <TableHead className="text-right">Premi</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.added.map((g, i) => {
                    const row = result.locations[i]
                    return (
                      <TableRow key={row.row}>
                        <TableCell className="tabular-nums">{row.row}</TableCell>
                        <TableCell className="max-w-64 whitespace-normal">
                          {row.insuredName ? (
                            <div className="truncate text-xs font-medium" title={row.insuredName}>
                              {row.insuredName}
                            </div>
                          ) : null}
                          <div className="line-clamp-2" title={row.riskLocation}>
                            {oneLineAddress(row.riskLocation)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {occupationParts(row.occupation).code}
                            {row.constructionClass
                              ? ` · ${constructionClassLabel(row.constructionClass)}`
                              : ""}
                          </div>
                        </TableCell>
                        {floating ? null : (
                          <>
                            <TableCell className="text-right tabular-nums">
                              {money(sumItems(g.section1) + sumItems(g.section2), slip.currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(sumPremium(g.rateLines), slip.currency)}
                            </TableCell>
                          </>
                        )}
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
