"use client"

import * as React from "react"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { productionRecapAction } from "@/app/(app)/reports/actions"
import { usePermission } from "@/components/auth/permission-provider"
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
import { exportXlsx } from "@/lib/export"
import { dateShort } from "@/lib/format"
import { RECAP_COLUMNS, recapRows } from "@/lib/production-recap"
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

/** Pembuat file Excel per report untuk periode yang dipilih. */
const GENERATORS: Record<ReportId, (start: string, end: string) => Promise<ReportResult>> = {
  "rekap-produksi": async (start, end) => {
    const res = await productionRecapAction(start, end)
    if (!res.ok || !res.data) throw new Error(res.error ?? "Gagal mengambil rekap produksi.")
    if (res.data.length) {
      await exportXlsx({
        filename: `rekap-produksi-${start}-sd-${end}`,
        sheet: "Rekap Produksi",
        columns: RECAP_COLUMNS,
        rows: recapRows(res.data),
      })
    }
    return { count: res.data.length, unit: "polis" }
  },
}

export function ReportCatalog() {
  const permission = usePermission()
  const today = useToday()
  const groups = visibleReports(permission.canAccess)
  const [active, setActive] = React.useState<ReportDefinition | null>(null)
  const [period, setPeriod] = React.useState(() => defaultReportPeriod(today))
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  function openReport(report: ReportDefinition) {
    setActive(report)
    setError(null)
  }

  function setDate(key: "start" | "end", value: string) {
    setPeriod((p) => ({ ...p, [key]: value }))
    setError(null)
  }

  async function download(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!active) return
    const problem = reportPeriodError(period.start, period.end)
    if (problem) {
      setError(problem)
      return
    }
    const range = `${dateShort(period.start)} s/d ${dateShort(period.end)}`
    setBusy(true)
    try {
      const result = await GENERATORS[active.id](period.start, period.end)
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
