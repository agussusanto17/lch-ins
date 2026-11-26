"use client"

import { InstallmentEditor } from "@/components/shared/installment-editor"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { roundCents } from "@/lib/calc"
import type { PlacingSlip } from "@/lib/data"
import { dateShort, money } from "@/lib/format"
import {
  fromHmInstallments,
  hullInstallmentBreakdown,
  hullInstallmentParts,
  toHmInstallments,
  usesIvWarInAdvance,
} from "@/lib/hull-installments"
import { HULL_SECTION_LABELS, activeHullSections } from "@/lib/marine-hull"
import { equalInstallmentPcts } from "@/lib/premium-installments"

/**
 * Premi installment slip Marine Hull dengan jadwal kapal: pola "IV & War in advance" (persen untuk
 * H&M, IV dan War di cicilan 1) dan rincian tiap cicilan per section (Harry, 26 November 2026).
 */
export function HullInstallments({
  slip,
  locked,
  onChange,
}: {
  slip: PlacingSlip
  locked: boolean
  onChange: (patch: Partial<PlacingSlip>) => void
}) {
  const parts = hullInstallmentParts(slip)
  if (!parts || !slip.hullSchedule) return null
  const schedule = slip.hullSchedule
  const advance = usesIvWarInAdvance(slip, parts)
  const rows = slip.premiumInstallments ?? []
  const breakdown = hullInstallmentBreakdown(slip)
  const sections = activeHullSections(schedule)
  const currency = slip.currency || "IDR"

  // Ganti pola: jumlah cicilan dan jatuh tempo tetap, persennya dibagi rata pada dasar yang baru.
  function setAdvance(on: boolean) {
    const pcts = equalInstallmentPcts(rows.length)
    const equal = rows.map((r, i) => ({ ...r, pct: pcts[i] }))
    onChange({
      hullSchedule: { ...schedule, ivWarInAdvance: on },
      premiumInstallments: rows.length && on ? fromHmInstallments(equal, parts!) : equal,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Field orientation="horizontal">
        <Switch
          id="hull-iv-war-advance"
          checked={advance}
          disabled={locked || !(parts.net.hm > 0)}
          onCheckedChange={setAdvance}
        />
        <FieldLabel htmlFor="hull-iv-war-advance" className="font-normal">
          IV &amp; War dibayar penuh di cicilan 1, persen cicilan untuk premi H&amp;M (H&amp;M payable
          quarterly in advance, IV &amp; War in advance)
        </FieldLabel>
      </Field>
      <InstallmentEditor
        value={advance ? toHmInstallments(rows, parts) : rows}
        onChange={(next) =>
          onChange({ premiumInstallments: advance ? fromHmInstallments(next, parts) : next })
        }
        base={advance ? parts.net.hm : parts.total}
        charges={advance ? roundCents(parts.net.iv + parts.net.war + parts.charges) : parts.charges}
        currency={currency}
        inceptionDate={slip.periodTba ? null : slip.inceptionDate}
        expiryDate={slip.periodTba ? null : slip.expiryDate}
        disabled={locked}
        hint="Tidak dicetak di slip; jadwalnya ikut ke Policy Database saat polis dicatat dari CI."
        note={
          advance
            ? "Persen cicilan dari premi H&M setelah diskon. IV, War, admin cost, dan stamp duty masuk cicilan 1."
            : undefined
        }
      />
      {breakdown.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Rincian cicilan per section ({currency})</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Cicilan</th>
                  <th className="px-2 py-1.5 text-left font-medium">Jatuh tempo</th>
                  {sections.map((s) => (
                    <th key={s.key} className="px-2 py-1.5 text-right font-medium">
                      {s.code} {HULL_SECTION_LABELS[s.key]}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-right font-medium">Admin &amp; stamp</th>
                  <th className="px-2 py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((r) => (
                  <tr key={r.no} className="border-t">
                    <td className="px-2 py-1.5">{r.no}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.dueDate ? dateShort(r.dueDate) : "—"}</td>
                    {sections.map((s) => (
                      <td key={s.key} className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                        {money(r[s.key], currency)}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                      {money(r.charges, currency)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums whitespace-nowrap">
                      {money(r.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
