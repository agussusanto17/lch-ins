"use client"

import * as React from "react"
import { FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"

import { importDeclarationsAction } from "@/app/(app)/policies/actions"
import { FormDrawer } from "@/components/shared/form-drawer"
import { UploadSummary } from "@/components/shared/upload-summary"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PlacingSlip, Policy } from "@/lib/data"
import {
  DECLARATION_IMPORT_LIMIT,
  DECLARATION_SAVE_BATCH,
  declarationsFromRows,
  fillDeclarationTemplate,
  usableRates,
  type DeclarationImportRow,
} from "@/lib/declaration-import"
import { dateShort, money, num } from "@/lib/format"
import { declarationMargin, openCoverRateText } from "@/lib/open-cover"
import { store } from "@/lib/store"

/** Isi sheet Deklarasi, atau sheet pertama bila namanya diganti, sebagai larik baris. */
async function readSheetRows(file: File) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.getWorksheet("Deklarasi") ?? wb.worksheets[0]
  const rows: unknown[][] = []
  ws?.eachRow({ includeEmpty: true }, (row, n) => {
    rows[n - 1] = (row.values as unknown[]).slice(1)
  })
  return Array.from(rows, (r) => r ?? [])
}

async function downloadTemplate(master: Policy, slip: PlacingSlip | null) {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "PT. LCH Insurance Brokers"
  fillDeclarationTemplate(wb, {
    policyNo: master.policyNo,
    insuredName: master.insuredName,
    period: { start: master.inceptionDate, end: master.expiryDate },
    currency: master.currency,
    rates: slip?.openCoverRates ?? [],
  })
  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  )
  const a = document.createElement("a")
  a.href = url
  a.download = `template-deklarasi-${master.policyNo.replace(/[^A-Za-z0-9-]+/g, "-")}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Upload deklarasi MOP dari Excel (Agus, 17 November 2026). File dicek per baris dulu; deklarasi
 * baru disimpan setelah semua baris benar, per kelompok 100 baris karena bisa ratusan sekaligus.
 */
export function DeclarationUpload({
  master,
  slip,
  existingNos,
  savedNos,
  open,
  onOpenChange,
}: {
  master: Policy
  /** Slip open cover polis MOP, sumber rate per kategori. */
  slip: PlacingSlip | null
  /** No. polis yang sudah ada di Policy Database, huruf kecil. */
  existingNos: ReadonlySet<string>
  /** No. deklarasi yang sudah tercatat di polis MOP ini, huruf kecil; barisnya dilewati. */
  savedNos: ReadonlySet<string>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<DeclarationImportRow[]>([])
  const [skipped, setSkipped] = React.useState<
    { row: number; policyNo: string }[]
  >([])
  const [swappedDates, setSwappedDates] = React.useState(0)
  const [otherMocNos, setOtherMocNos] = React.useState<string[]>([])
  /** Kesalahan per baris; baris itu tidak ikut disimpan. */
  const [errors, setErrors] = React.useState<string[]>([])
  /** Kesalahan tingkat file; seluruh file tidak diproses. */
  const [fileErrors, setFileErrors] = React.useState<string[]>([])
  const [read, setRead] = React.useState(0)
  const [failed, setFailed] = React.useState(0)
  /** Hasil simpan, ditampilkan bila ada baris yang gagal atau belum tersimpan. */
  const [result, setResult] = React.useState<{
    saved: number
    failed: number
    skipped: number
    errors: string[]
  } | null>(null)
  const [reading, setReading] = React.useState(false)
  const [progress, setProgress] = React.useState<{
    done: number
    total: number
  } | null>(null)
  const rates = usableRates(slip?.openCoverRates ?? [])
  // General Marine Report tidak memakai kategori rate; kolomnya disembunyikan supaya tabel muat.
  const showRate = rows.some((r) => r.rateLabel)
  const totalValue = rows.reduce((sum, r) => sum + r.sumInsured, 0)
  const totalPremium = rows.reduce((sum, r) => sum + r.premium, 0)
  const totalAdminFee = rows.reduce((sum, r) => sum + (r.adminFee ?? 0), 0)
  // Margin rate: premi dari file (rate ke klien) dikurangi premi menurut rate MOP (Agus, 20 November 2026).
  const totalMargin = rows.reduce((sum, r) => sum + (declarationMargin(r) ?? 0), 0)

  async function readFile(file: File) {
    setReading(true)
    setFileName(file.name)
    setRows([])
    setSkipped([])
    setSwappedDates(0)
    setOtherMocNos([])
    setErrors([])
    setFileErrors([])
    setRead(0)
    setFailed(0)
    setResult(null)
    try {
      const result = declarationsFromRows(await readSheetRows(file), {
        rates: slip?.openCoverRates ?? [],
        period: { start: master.inceptionDate, end: master.expiryDate },
        currency: master.currency,
        masterPolicyNo: master.policyNo,
        existingNos,
        savedNos,
      })
      setSkipped(result.skipped)
      setSwappedDates(result.swappedDates)
      setOtherMocNos(result.otherMocNos)
      if (result.fileErrors.length) {
        setFileErrors(result.fileErrors)
        return
      }
      // Baris yang benar tetap disimpan; baris yang gagal dilaporkan per nomor baris.
      setRows(result.declarations)
      setErrors(result.errors)
      setRead(result.read)
      setFailed(result.failed)
    } catch {
      setFileErrors([
        "File tidak bisa dibaca. Pakai file Excel (.xlsx) dari template deklarasi.",
      ])
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const count = (n: number) => n.toLocaleString("id-ID")

  async function submit() {
    // Hasil upload sudah tampil dan tidak ada yang tersisa: tombol utama menutup drawer.
    if (result && !rows.length) {
      onOpenChange(false)
      return
    }
    if (!rows.length) {
      if (!fileErrors.length && !read)
        setFileErrors(["Pilih file Excel deklarasi dulu."])
      return false
    }
    let done = 0
    const total = rows.length
    setProgress({ done, total })
    try {
      while (done < total) {
        const batch = rows.slice(done, done + DECLARATION_SAVE_BATCH)
        const res = await importDeclarationsAction(
          master.id,
          batch.map((r) => ({
            policyNo: r.policyNo,
            inceptionDate: r.inceptionDate,
            sumInsured: r.sumInsured,
            premium: r.premium,
            insurerPremium: r.insurerPremium,
            insuredName: r.insuredName,
            adminFee: r.adminFee,
            remarks: r.remarks,
          }))
        )
        if (!res.ok || !res.data) {
          // Kelompok sebelumnya sudah tersimpan; sisanya bisa disimpan ulang dari sini,
          // atau file yang sama diupload lagi karena yang tersimpan akan dilewati.
          const remaining = rows.slice(done)
          setRows(remaining)
          setResult({
            saved: done,
            failed: failed + remaining.length,
            skipped: skipped.length,
            errors: [
              ...errors,
              `Baris ${remaining[0].row} sampai ${remaining.at(-1)!.row} belum tersimpan: ${res.error ?? "gagal disimpan"}`,
            ],
          })
          toast.error(
            done
              ? `${count(done)} deklarasi tersimpan, ${count(remaining.length)} belum`
              : "Deklarasi belum tersimpan",
            { description: res.error }
          )
          return false
        }
        for (const record of res.data) store.upsert("policies", record)
        done += batch.length
        setProgress({ done, total })
      }
    } finally {
      setProgress(null)
    }
    const skippedNote = skipped.length
      ? `${count(skipped.length)} baris sudah tercatat dan dilewati. `
      : ""
    if (failed) {
      // Ada baris gagal: drawer tetap terbuka dengan ringkasan supaya baris yang belum masuk terlihat.
      setRows([])
      setResult({ saved: done, failed, skipped: skipped.length, errors })
      toast.warning(
        `${count(done)} deklarasi tersimpan, ${count(failed)} baris gagal`,
        {
          description: `${skippedNote}Polis MOP ${master.policyNo}`,
        }
      )
      return false
    }
    toast.success(`${count(done)} deklarasi tersimpan`, {
      description: `${skippedNote}Polis MOP ${master.policyNo}`,
    })
    onOpenChange(false)
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Deklarasi dari Excel"
      description="Satu baris satu pengiriman. Tertanggung, asuransi, brokerage, dan fee ikut polis MOP."
      submitLabel={
        rows.length
          ? `Simpan ${rows.length.toLocaleString("id-ID")} deklarasi`
          : result
            ? "Tutup"
            : "Simpan"
      }
      onSubmit={submit}
    >
      <div className="flex flex-col gap-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Polis MOP</dt>
          <dd className="font-medium">{master.policyNo}</dd>
          <dt className="text-muted-foreground">Tertanggung</dt>
          <dd>{master.insuredName}</dd>
          <dt className="text-muted-foreground">Periode</dt>
          <dd>
            {dateShort(master.inceptionDate)} s/d {dateShort(master.expiryDate)}
          </dd>
          <dt className="text-muted-foreground">Rate slip</dt>
          <dd>
            {rates.length
              ? rates
                  .map(
                    (r) =>
                      `${r.label.trim()} ${openCoverRateText(r, master.currency)}`
                  )
                  .join(" · ")
              : "Belum ada rate berkategori; isi kolom Premium di Excel."}
          </dd>
        </dl>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void downloadTemplate(master, slip)}
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
              <span className="truncate text-xs text-muted-foreground">
                {fileName}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Bisa memakai template ini atau General Marine Report dari asuransi
            (.xlsx). Premium memakai Gross Premium atau kolom Premium, kalau
            kosong dihitung dari rate slip. Maksimal{" "}
            {DECLARATION_IMPORT_LIMIT.toLocaleString("id-ID")} baris baru per
            file; no. sertifikat yang sudah tercatat di polis ini dilewati.
          </p>
        </div>

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
        ) : null}

        {result ? (
          <UploadSummary
            title="Hasil upload"
            read={read}
            ok={result.saved}
            okLabel="Tersimpan"
            failed={result.failed}
            skipped={result.skipped}
            errors={result.errors}
            hint="Baris berikut belum tersimpan. Perbaiki di file yang sama lalu upload lagi; baris yang sudah tersimpan akan dilewati."
          />
        ) : read ? (
          <UploadSummary
            title="Hasil baca file"
            read={read}
            ok={rows.length}
            okLabel="Siap disimpan"
            failed={failed}
            skipped={skipped.length}
            errors={errors}
            hint="Baris berikut gagal dan tidak ikut disimpan. Perbaiki di file yang sama lalu upload lagi; baris yang sudah tersimpan akan dilewati."
            note={
              !rows.length && !failed
                ? "Semua baris sudah tercatat di polis MOP ini. Tidak ada yang baru untuk disimpan."
                : undefined
            }
          />
        ) : null}

        {skipped.length ? (
          <p className="text-xs text-muted-foreground">
            {skipped.length.toLocaleString("id-ID")} baris sudah tercatat di
            polis MOP ini dan dilewati:{" "}
            {skipped
              .slice(0, 5)
              .map((s) => s.policyNo)
              .join(", ")}
            {skipped.length > 5
              ? `, dan ${(skipped.length - 5).toLocaleString("id-ID")} lainnya`
              : ""}
            .
          </p>
        ) : null}

        {otherMocNos.length && rows.length ? (
          <p
            role="note"
            className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning"
          >
            MOC No. di file {otherMocNos.join(", ")} berbeda dengan nomor polis
            MOP {master.policyNo}. Simpan bila file ini memang untuk polis MOP
            ini; MOC No. bisa nomor kontrak open cover, bukan nomor polisnya.
          </p>
        ) : null}

        {swappedDates ? (
          <p className="text-xs text-muted-foreground">
            {swappedDates.toLocaleString("id-ID")} tanggal dibaca ulang sebagai
            hari/bulan: Excel sempat mengubahnya ke bulan/hari saat file
            disimpan.
          </p>
        ) : null}

        {progress ? (
          <p role="status" className="text-sm font-medium">
            Menyimpan {progress.done.toLocaleString("id-ID")} dari{" "}
            {progress.total.toLocaleString("id-ID")} deklarasi…
          </p>
        ) : null}

        {rows.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <span className="font-medium">
                {rows.length.toLocaleString("id-ID")} deklarasi siap disimpan
              </span>
              <span className="text-muted-foreground">
                {" "}
                · nilai {money(totalValue, master.currency)} · premi{" "}
                {money(totalPremium, master.currency)}
                {totalAdminFee
                  ? ` · admin fee ${money(totalAdminFee, master.currency)}`
                  : ""}
                {Math.abs(totalMargin) >= 0.01
                  ? ` · margin rate ${money(totalMargin, master.currency)}`
                  : ""}
              </span>
            </p>
            <div className="max-h-[22rem] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Sertifikat</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Nilai</TableHead>
                    {showRate ? <TableHead>Kategori Rate</TableHead> : null}
                    <TableHead className="text-right">Premium</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.row}>
                      <TableCell>
                        <div className="font-medium">{r.policyNo}</div>
                        {r.insuredName ? (
                          <div
                            className="max-w-52 truncate text-xs text-muted-foreground"
                            title={r.insuredName}
                          >
                            {r.insuredName}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{dateShort(r.inceptionDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(r.sumInsured, master.currency)}
                      </TableCell>
                      {showRate ? (
                        <TableCell>
                          {r.rateLabel ?? "—"}
                          {r.units != null
                            ? ` · ${num(r.units, 0, 2)} ${rates.find((x) => x.label.trim() === r.rateLabel)?.unit?.trim() || "unit"}`
                            : ""}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right tabular-nums">
                        {money(r.premium, master.currency)}
                        {declarationMargin(r) ? (
                          <div className="text-xs text-muted-foreground">
                            Margin {money(declarationMargin(r)!, master.currency)}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          File sertifikat diunggah per deklarasi lewat menu Berkas polis setelah
          tersimpan.
        </p>
      </div>
    </FormDrawer>
  )
}
