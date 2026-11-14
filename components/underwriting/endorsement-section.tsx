"use client"

import { SectionCard } from "@/components/shared/section-card"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { PlacingSlip } from "@/lib/data/types"
import { ENDORSEMENT_DAYS_PER_YEAR, slipEndorsementAdjustment } from "@/lib/endorsement-calc"
import { dateLong, money, num } from "@/lib/format"

/**
 * Isian khusus endorsement dan cancellation slip: tanggal efektif, uraian, premi sebelum/sesudah.
 * Admin cost, stamp duty, dan diskon tetap di bagian premi (Harry, 11 November 2026).
 */
export function EndorsementSection({
  slip,
  set,
}: {
  slip: PlacingSlip
  set: (patch: Partial<PlacingSlip>) => void
}) {
  const cancellation = slip.kind === "Cancellation"
  const adj = slipEndorsementAdjustment(slip)
  const currency = slip.currency
  const rows: [string, string, string?][] = adj
    ? [
        [
          "Prorata",
          adj.fromStart
            ? "Per awal polis, premi penuh"
            : `${adj.days} hari / ${ENDORSEMENT_DAYS_PER_YEAR} (${num(adj.factor * 100, 2, 2)}%)`,
        ],
        [
          "Perhitungan sebelumnya, dikembalikan",
          money(adj.beforeTotal, currency),
          `Premi setahun ${money(slip.beforeCalc?.premium ?? 0, currency)}`,
        ],
        ...(cancellation
          ? []
          : ([
              [
                "Perhitungan sesudah, ditagihkan",
                money(adj.afterTotal, currency),
                `Premi setahun ${money(adj.after.reduce((a, l) => a + l.premium, 0), currency)}`,
              ],
            ] as [string, string, string?][])),
        [adj.premium < 0 ? "Refund premi" : "Premi tambahan", money(adj.premium, currency)],
        ...(adj.discount
          ? ([[`Diskon ${num(adj.discountPct, 0, 2)}%`, money(adj.discount, currency)]] as [
              string,
              string,
            ][])
          : []),
        ...(adj.adminCost
          ? ([["Admin cost", money(adj.adminCost, currency)]] as [string, string][])
          : []),
        ...(adj.stampDuty
          ? ([["Stamp duty", money(adj.stampDuty, currency)]] as [string, string][])
          : []),
      ]
    : []

  return (
    <SectionCard
      title={cancellation ? "Cancellation" : "Endorsement"}
      description={`${cancellation ? "Pembatalan" : "Perubahan"} polis ${slip.parentPolicyNo ?? "—"}, dari slip ${slip.baseSlipNo ?? "—"}.`}
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          {cancellation
            ? "Semua perhitungan premi sebelumnya dikembalikan prorata, atau penuh kalau per awal polis."
            : "Ubah isian slip yang berubah, misalnya nilai pertanggungan, rate, atau objek. Premi dihitung dari perhitungan sebelum dan sesudah, prorata dari tanggal efektif."}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="effective-date">Tanggal Efektif *</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="effective-date"
                type="date"
                value={slip.effectiveDate ?? ""}
                onChange={(e) => set({ effectiveDate: e.target.value || null })}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!slip.inceptionDate}
                onClick={() => set({ effectiveDate: slip.inceptionDate ?? null })}
              >
                Per awal polis
              </Button>
            </div>
            <FieldDescription>
              Prorata s/d {dateLong(slip.expiryDate)}, dibagi {ENDORSEMENT_DAYS_PER_YEAR} hari.
              Per awal polis ({dateLong(slip.inceptionDate)}) memakai premi penuh.
            </FieldDescription>
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="change-description">Uraian Perubahan</FieldLabel>
            <Textarea
              id="change-description"
              rows={4}
              value={slip.changeDescription ?? ""}
              onChange={(e) => set({ changeDescription: e.target.value })}
              placeholder={
                cancellation
                  ? "Example: Effective 22 May 2026, this policy is CANCELLED on a pro-rata basis."
                  : "Example: The sum insured is amended from IDR 223,500,000 to IDR 200,000,000."
              }
            />
            <FieldDescription>
              Slip dicetak dalam bahasa Inggris, jadi tulis uraian dalam bahasa Inggris. Dicetak
              setelah kalimat &ldquo;It is hereby noted and agreed…&rdquo;.
            </FieldDescription>
          </Field>
        </div>

        {adj ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Nilai pertanggungan</span>
              <span className="tabular font-medium">
                {money(adj.sumInsuredBefore, currency)} → {money(adj.sumInsuredAfter, currency)}
              </span>
            </div>
            {rows.map(([label, value, hint]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">
                  {label}
                  {hint ? <span className="block text-xs">{hint}</span> : null}
                </span>
                <span className="tabular font-medium">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular">{money(adj.total, currency)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}
