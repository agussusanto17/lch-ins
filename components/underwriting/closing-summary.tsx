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
 * Ringkasan penutupan sebelum Closing Instruction diterbitkan (Agus, 13
 * November 2026). `compact` untuk dialog konfirmasi: tanpa rincian per
 * asuransi.
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
        <Row label="Premi bruto" value={money(s.premium, currency)} />
        <Row
          label={`Brokerage ${num(slip.brokeragePct || 0, 2)}% (${vatText})`}
          value={`− ${money(s.brokerage, currency)}`}
        />
        {withFee ? (
          <Row label="Additional fee" value={`− ${money(s.fee, currency)}`} />
        ) : null}
        <div className="mt-1 border-t pt-1">
          <Row
            label="Net premi ke asuransi"
            hint={withFee ? "Premi − brokerage − additional fee" : "Premi − brokerage"}
            value={money(s.net, currency)}
            strong
          />
        </div>
        <div className="border-t pt-1">
          <Row
            label="Pendapatan LCH"
            hint={
              s.incomeVat
                ? `${withFee ? "Brokerage + additional fee" : "Brokerage"}, termasuk PPN 2,2% ${money(s.incomeVat, currency)} · sebelum PPN ${money(s.income - s.incomeVat, currency)}`
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
                <th className="px-3 py-2 text-right font-medium">Premi</th>
                <th className="px-3 py-2 text-right font-medium">Brokerage</th>
                {withFee ? <th className="px-3 py-2 text-right font-medium">Additional fee</th> : null}
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
                  <td className="tabular px-3 py-2 text-right whitespace-nowrap">{money(r.brokerage, currency)}</td>
                  {withFee ? (
                    <td className="tabular px-3 py-2 text-right whitespace-nowrap">{money(r.fee, currency)}</td>
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
          {(slip.discountPct || 0) > 0
            ? ` Premi sebelum diskon ${num(slip.discountPct, 2)}%, sama dengan dasar brokerage dan additional fee.`
            : ""}
        </p>
      ) : null}
    </div>
  )
}
