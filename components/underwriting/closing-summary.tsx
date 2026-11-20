"use client"

import { usesAdditionalFee } from "@/components/underwriting/slip-model"
import type { PlacingSlip } from "@/lib/data/types"
import { money, num } from "@/lib/format"
import { closingSummary } from "@/lib/closing-summary"
import { cn } from "@/lib/utils"

function Row({
  label,
  hint,
  value,
  strong,
}: {
  label: string
  hint?: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={cn("min-w-0", strong ? "font-semibold" : "text-muted-foreground")}>
        {label}
        {hint ? (
          <span className="block text-xs font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      <span className={cn("tabular shrink-0 text-right", strong && "font-semibold")}>{value}</span>
    </div>
  )
}

/**
 * Ringkasan penutupan sebelum Closing Instruction diterbitkan (Agus, 13 November 2026).
 * `compact` untuk dialog konfirmasi: tanpa rincian per asuransi.
 */
export function ClosingSummaryPanel({
  slip,
  compact = false,
}: {
  slip: PlacingSlip
  compact?: boolean
}) {
  const s = closingSummary(slip)
  const currency = slip.currency || "IDR"
  const withFee = usesAdditionalFee(slip.cob)
  const vatText = slip.includeVat ? "incl. VAT" : "excl. VAT"

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="rounded-lg border bg-muted/50 px-4 py-2">
        {/* Gross Premium = total premi sebelum diskon, brokerage, dan additional fee (Team LCH, 19 November 2026). */}
        <Row
          label="Gross Premium"
          hint="Total premi sebelum diskon, brokerage, dan additional fee"
          value={money(s.gross, currency)}
        />
        {s.discount ? (
          <Row
            label={`Diskon ${num(slip.discountPct || 0, 2)}%`}
            value={`− ${money(s.discount, currency)}`}
          />
        ) : null}
        <Row
          label={`Brokerage ${num(slip.brokeragePct || 0, 2)}% (${vatText})`}
          hint={s.discount ? "Dari Gross Premium, sebelum diskon" : undefined}
          value={`− ${money(s.brokerage, currency)}`}
        />
        {/* Excl. VAT: PPN 2,2% ditambahkan di atas brokerage dan ikut dipotong (Agus, 20 November 2026). */}
        {s.brokerageVat ? (
          <Row
            label="PPN 2,2% atas brokerage"
            hint="Brokerage excl. VAT, PPN ditambahkan"
            value={`− ${money(s.brokerageVat, currency)}`}
          />
        ) : null}
        {withFee ? (
          <Row label="Additional fee" value={`− ${money(s.fee, currency)}`} />
        ) : null}
        {s.feeVat ? (
          <Row
            label="PPN 2,2% atas additional fee"
            hint="Fee asuransi yang excl. VAT, PPN ditambahkan"
            value={`− ${money(s.feeVat, currency)}`}
          />
        ) : null}
        <div className="mt-1 border-t pt-1">
          <Row
            label="Nett Premium ke asuransi"
            hint={`Gross Premium${s.discount ? " − diskon" : ""} − brokerage${withFee ? " − additional fee" : ""}${s.brokerageVat || s.feeVat ? " − PPN excl. VAT" : ""}`}
            value={money(s.net, currency)}
            strong
          />
        </div>
        <div className="border-t pt-1">
          <Row
            label="Pendapatan LCH"
            hint={
              s.incomeVat
                ? `${withFee ? "Brokerage + additional fee" : "Brokerage"}${s.brokerageVat || s.feeVat ? " + PPN excl. VAT" : ""}, termasuk PPN 2,2% ${money(s.incomeVat, currency)} · sebelum PPN ${money(s.income - s.incomeVat, currency)}`
                : withFee
                  ? "Brokerage + additional fee"
                  : "Brokerage"
            }
            value={money(s.income, currency)}
            strong
          />
        </div>
      </div>

      {!compact && s.insurers.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Asuransi</th>
                <th className="px-3 py-2 text-right font-medium">Gross Premium</th>
                {s.discount ? <th className="px-3 py-2 text-right font-medium">Diskon</th> : null}
                <th className="px-3 py-2 text-right font-medium">Brokerage</th>
                {withFee ? <th className="px-3 py-2 text-right font-medium">Additional fee</th> : null}
                {s.brokerageVat || s.feeVat ? (
                  <th className="px-3 py-2 text-right font-medium">PPN 2,2% excl.</th>
                ) : null}
                <th className="px-3 py-2 text-right font-medium">Net ke asuransi</th>
              </tr>
            </thead>
            <tbody>
              {s.insurers.map((r) => (
                <tr key={r.insurer} className="border-t">
                  <td className="px-3 py-2">
                    {r.insurer}
                    <span className="ml-1 text-muted-foreground">{num(r.share, 2)}%</span>
                  </td>
                  <td className="tabular px-3 py-2 text-right whitespace-nowrap">{money(r.premium, currency)}</td>
                  {s.discount ? (
                    <td className="tabular px-3 py-2 text-right whitespace-nowrap">{money(r.discount, currency)}</td>
                  ) : null}
                  <td className="tabular px-3 py-2 text-right whitespace-nowrap">{money(r.brokerage, currency)}</td>
                  {withFee ? (
                    <td className="tabular px-3 py-2 text-right whitespace-nowrap">{money(r.fee, currency)}</td>
                  ) : null}
                  {s.brokerageVat || s.feeVat ? (
                    <td className="tabular px-3 py-2 text-right whitespace-nowrap">{money(r.vat, currency)}</td>
                  ) : null}
                  <td className="tabular px-3 py-2 text-right font-semibold whitespace-nowrap">{money(r.net, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!compact ? (
        <p className="text-xs text-muted-foreground">
          Hitungan internal LCH, tidak dicetak di dokumen.
          {s.discount
            ? " Brokerage dan additional fee dihitung dari Gross Premium; Nett Premium = Gross Premium − diskon − brokerage − additional fee."
            : ""}
          {s.brokerageVat || s.feeVat
            ? " Brokerage atau fee excl. VAT: PPN 2,2% ditambahkan di atasnya dan ikut dipotong dari premi ke asuransi; incl. VAT: PPN sudah di dalam nominalnya."
            : ""}
        </p>
      ) : null}
    </div>
  )
}
