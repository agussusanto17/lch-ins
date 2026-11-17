"use client"

import * as React from "react"
import { FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"

import { importDeclarationsAction } from "@/app/(app)/policies/actions"
import { FormDrawer } from "@/components/shared/form-drawer"
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
import { openCoverRateText } from "@/lib/open-cover"
import { store } from "@/lib/store"

/** Pesan kesalahan yang ditampilkan; sisanya cukup jumlahnya. */
const SHOWN_ERRORS = 30

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
  const [errors, setErrors] = React.useState<string[]>([])
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

  async function readFile(file: File) {
    setReading(true)
    setFileName(file.name)
    setRows([])
    setSkipped([])
    setSwappedDates(0)
    setOtherMocNos([])
    setErrors([])
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
      if (result.errors.length) setErrors(result.errors)
      else setRows(result.declarations)
    } catch {
      setErrors([
        "File tidak bisa dibaca. Pakai file Excel (.xlsx) dari template deklarasi.",
      ])
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function submit() {
    if (!rows.length) {
      if (!errors.length && !skipped.length)
        setErrors(["Pilih file Excel deklarasi dulu."])
      return false
    }
    let done = 0
    setErrors([])
    setProgress({ done, total: rows.length })
    try {
      while (done < rows.length) {
        const batch = rows.slice(done, done + DECLARATION_SAVE_BATCH)
        const res = await importDeclarationsAction(
          master.id,
          batch.map((r) => ({
            policyNo: r.policyNo,
            inceptionDate: r.inceptionDate,
            sumInsured: r.sumInsured,
            premium: r.premium,
            insuredName: r.insuredName,
            remarks: r.remarks,
          }))
        )
        if (!res.ok || !res.data) {
          // Kelompok sebelumnya sudah tersimpan; sisanya bisa disimpan ulang dari sini,
          // atau file yang sama diupload lagi karena yang tersimpan akan dilewati.
          setRows(rows.slice(done))
          setErrors([
            done
              ? `${done.toLocaleString("id-ID")} deklarasi sudah tersimpan. Mulai baris ${batch[0].row} belum: ${res.error ?? "gagal disimpan"}`
              : `Belum ada yang tersimpan: ${res.error ?? "gagal disimpan"}`,
          ])
          toast.error("Deklarasi belum tersimpan semua", {
            description: res.error,
          })
          return false
        }
        for (const record of res.data) store.upsert("policies", record)
        done += batch.length
        setProgress({ done, total: rows.length })
      }
    } finally {
      setProgress(null)
    }
    toast.success(`${done.toLocaleString("id-ID")} deklarasi tersimpan`, {
      description: `Di bawah polis MOP ${master.policyNo}`,
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

        {errors.length ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            <p className="font-medium text-destructive">
              File belum bisa disimpan. Perbaiki baris berikut lalu pilih file
              lagi.
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-xs">
              {errors.slice(0, SHOWN_ERRORS).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            {errors.length > SHOWN_ERRORS ? (
              <p className="text-xs text-muted-foreground">
                dan {(errors.length - SHOWN_ERRORS).toLocaleString("id-ID")}{" "}
                kesalahan lain.
              </p>
            ) : null}
          </div>
        ) : null}

        {skipped.length && !rows.length && !errors.length ? (
          <p
            role="status"
            className="rounded-lg border bg-muted/40 px-4 py-3 text-sm"
          >
            Semua deklarasi di file ini sudah tercatat di polis MOP ini. Tidak
            ada yang baru untuk disimpan.
          </p>
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
