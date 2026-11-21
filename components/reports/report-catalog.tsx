"use client"

import * as React from "react"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  claimStatisticsAction,
  lossRatioAccountsAction,
  lossRatioReportAction,
  productionRecapAction,
} from "@/app/(app)/reports/actions"
import { usePermission } from "@/components/auth/permission-provider"
import { useFormOptions } from "@/components/shared/form-options-provider"
import { SearchSelect } from "@/components/shared/form-fields"
import { useToday } from "@/components/layout/today-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { fillClaimStatistics } from "@/lib/claim-statistics"
import {
  accountLossRatio,
  fillAccountLossRatio,
  fillInsurerCobLossRatio,
  insurerCobLossRatio,
} from "@/lib/loss-ratio-report"
import { fillOjkProduction } from "@/lib/ojk-production"
import { downloadWorkbook } from "@/lib/export"
import { dateShort } from "@/lib/format"
import { fillProductionRecap } from "@/lib/production-recap"
import { fillReserveBasis, reserveBasis } from "@/lib/reserve-basis"
import {
  defaultReportPeriod,
  reportPeriodError,
  visibleReports,
  type ReportDefinition,
  type ReportId,
} from "@/lib/report-catalog"

/** Jumlah data yang masuk file, beserta satuannya untuk toast. */
interface ReportResult {
  count: number
  unit: string
}

/** Pilihan dialog selain periode: asuransi kosong berarti semua asuransi. */
interface ReportParams {
  insurer: string | null
  account: string | null
}

async function newWorkbook() {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  wb.creator = "PT. LCH Insurance Brokers"
  wb.created = new Date()
  return wb
}

/** Nama file dari teks bebas, misalnya nama akun. */
const fileSlug = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "akun"

/** Pembuat file Excel per report untuk periode yang dipilih; `today` dicetak sebagai tanggal buat. */
const GENERATORS: Record<
  ReportId,
  (start: string, end: string, today: string, params: ReportParams) => Promise<ReportResult>
> = {
  "rekap-produksi": async (start, end, today) => {
    const res = await productionRecapAction(start, end)
    if (!res.ok || !res.data) throw new Error(res.error ?? "Gagal mengambil rekap produksi.")
    if (res.data.length) {
      const wb = await newWorkbook()
      fillProductionRecap(wb, res.data, { start, end }, today)
      await downloadWorkbook(wb, `rekap-produksi-${start}-sd-${end}`)
    }
    return { count: res.data.length, unit: "polis" }
  },
  "statistik-klaim": async (start, end, today) => {
    const res = await claimStatisticsAction(start, end)
    if (!res.ok || !res.data) throw new Error(res.error ?? "Gagal mengambil data klaim.")
    if (res.data.claims.length) {
      const { default: ExcelJS } = await import("exceljs")
      const wb = new ExcelJS.Workbook()
      wb.creator = "PT. LCH Insurance Brokers"
      wb.created = new Date()
      fillClaimStatistics(wb, res.data, { start, end }, today)
      await downloadWorkbook(wb, `statistik-klaim-${start}-sd-${end}`)
    }
    return { count: res.data.claims.length, unit: "klaim" }
  },
  // Template report Team LCH (20 November 2026).
  "produksi-ojk": async (start, end, today) => {
    const res = await productionRecapAction(start, end)
    if (!res.ok || !res.data) throw new Error(res.error ?? "Gagal mengambil data produksi.")
    if (res.data.length) {
      const wb = await newWorkbook()
      fillOjkProduction(wb, res.data, { start, end }, today)
      await downloadWorkbook(wb, `produksi-ojk-${start}-sd-${end}`)
    }
    return { count: res.data.length, unit: "polis" }
  },
  "loss-ratio-asuransi": async (start, end, today, params) => {
    const res = await lossRatioReportAction(start, end)
    if (!res.ok || !res.data) throw new Error(res.error ?? "Gagal mengambil data loss ratio.")
    const results = insurerCobLossRatio(res.data, params.insurer)
    if (results.length) {
      const wb = await newWorkbook()
      fillInsurerCobLossRatio(wb, results, { start, end }, today)
      const name = params.insurer ? fileSlug(params.insurer) : "semua-asuransi"
      await downloadWorkbook(wb, `loss-ratio-${name}-${start}-sd-${end}`)
    }
    return { count: results.length, unit: "asuransi" }
  },
  "reserve-basis": async (start, end, today) => {
    const res = await productionRecapAction(start, end)
    if (!res.ok || !res.data) throw new Error(res.error ?? "Gagal mengambil data produksi.")
    const months = reserveBasis(res.data)
    if (months.length) {
      const wb = await newWorkbook()
      fillReserveBasis(wb, months, today)
      await downloadWorkbook(wb, `reserve-basis-${start}-sd-${end}`)
    }
    return { count: months.reduce((n, m) => n + m.rows.length, 0), unit: "akun" }
  },
  "loss-ratio-akun": async (start, end, today, params) => {
    if (!params.account) throw new Error("Pilih akun.")
    const res = await lossRatioReportAction(start, end)
    if (!res.ok || !res.data) throw new Error(res.error ?? "Gagal mengambil data loss ratio.")
    const result = accountLossRatio(res.data, params.account)
    if (result.years.length) {
      const wb = await newWorkbook()
      fillAccountLossRatio(wb, result, { start, end }, today)
      await downloadWorkbook(wb, `loss-ratio-${fileSlug(params.account)}-${start}-sd-${end}`)
    }
    return { count: result.years.length, unit: "tahun polis" }
  },
}

export function ReportCatalog() {
  const permission = usePermission()
  const today = useToday()
  const groups = visibleReports(permission.canAccess, permission.roles)
  const [active, setActive] = React.useState<ReportDefinition | null>(null)
  const [period, setPeriod] = React.useState(() => defaultReportPeriod(today))
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const masterOptions = useFormOptions()
  const [params, setParams] = React.useState<ReportParams>({ insurer: null, account: null })
  const [accounts, setAccounts] = React.useState<string[] | null>(null)
  const wants = (param: "insurer" | "account") => Boolean(active?.params?.includes(param))

  function openReport(report: ReportDefinition) {
    setActive(report)
    setError(null)
    setPeriod(defaultReportPeriod(today, report.defaultPeriod))
    setParams({ insurer: null, account: null })
    // Daftar akun dimuat saat dialog Loss Ratio Akun dibuka.
    if (report.params?.includes("account") && accounts === null) {
      lossRatioAccountsAction().then((res) => {
        if (res.ok && res.data) setAccounts(res.data)
        else toast.error("Gagal memuat daftar akun", { description: res.error })
      })
    }
  }

  function setDate(key: "start" | "end", value: string) {
    setPeriod((p) => ({ ...p, [key]: value }))
    setError(null)
  }

  async function download(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!active) return
    const problem =
      reportPeriodError(period.start, period.end) ??
      (wants("account") && !params.account ? "Pilih akun." : null)
    if (problem) {
      setError(problem)
      return
    }
    const range = `${dateShort(period.start)} s/d ${dateShort(period.end)}`
    setBusy(true)
    try {
      const result = await GENERATORS[active.id](period.start, period.end, today, params)
      if (!result.count) {
        toast.info(`Tidak ada ${result.unit} di periode ini`, { description: range })
        return
      }
      toast.success(`${active.title} terunduh`, {
        description: `${result.count} ${result.unit} · ${range}`,
      })
      setActive(null)
    } catch (err) {
      toast.error(`Gagal membuat ${active.title}`, {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {groups.length === 0 ? (
        <Card className="items-center px-5 text-center text-muted-foreground">
          Belum ada report yang bisa diunduh dengan role Anda.
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.division} className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {group.division}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => openReport(report)}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                    <FileSpreadsheet className="size-4.5" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-base font-semibold">{report.title}</span>
                    <span className="text-muted-foreground">{report.description}</span>
                    <span className="mt-1 inline-flex items-center gap-1.5 font-medium text-primary">
                      <Download className="size-3.5" aria-hidden />
                      Unduh Excel
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setActive(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          {/* Validasi periode memakai pesan aplikasi, bukan bubble bawaan browser dari min/max. */}
          <form noValidate onSubmit={download} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{active?.title}</DialogTitle>
              <DialogDescription>
                Periode berdasarkan {active?.dateBasis}. File Excel langsung terunduh.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="report-start">Tanggal mulai</FieldLabel>
                <Input
                  id="report-start"
                  type="date"
                  value={period.start}
                  max={period.end || undefined}
                  onChange={(e) => setDate("start", e.target.value)}
                />
              </Field>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="report-end">Tanggal akhir</FieldLabel>
                <Input
                  id="report-end"
                  type="date"
                  value={period.end}
                  min={period.start || undefined}
                  onChange={(e) => setDate("end", e.target.value)}
                />
              </Field>
            </div>
            {wants("insurer") ? (
              <SearchSelect
                label="Asuransi"
                items={[
                  { label: "Semua asuransi", value: "" },
                  ...masterOptions.insurers.map((i) => ({ label: i.name, value: i.name })),
                ]}
                value={params.insurer ?? ""}
                onValueChange={(v) => setParams((p) => ({ ...p, insurer: v || null }))}
                description="Semua asuransi: satu sheet per asuransi."
              />
            ) : null}
            {wants("account") ? (
              <SearchSelect
                label="Akun"
                items={(accounts ?? []).map((a) => ({ label: a, value: a }))}
                value={params.account}
                onValueChange={(v) => {
                  setParams((p) => ({ ...p, account: v }))
                  setError(null)
                }}
                placeholder={accounts === null ? "Memuat daftar akun…" : "Ketik nama akun…"}
                description="Grouping Insured polis, atau nama klien bila kosong."
              />
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setActive(null)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Download data-icon="inline-start" />
                )}
                {busy ? "Menyiapkan…" : "Unduh Excel"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
