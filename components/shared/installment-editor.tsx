"use client"

import { SelectInput } from "@/components/shared/form-fields"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import type { PremiumInstallment } from "@/lib/data/types"
import { money, num } from "@/lib/format"
import {
  MAX_INSTALLMENTS,
  MIN_INSTALLMENTS,
  defaultInstallments,
  installmentAmounts,
  installmentsError,
} from "@/lib/premium-installments"

const COUNT_ITEMS = [
  { label: "Sekaligus", value: "1" },
  ...Array.from({ length: MAX_INSTALLMENTS - MIN_INSTALLMENTS + 1 }, (_, i) => ({
    label: `${i + MIN_INSTALLMENTS}x cicilan`,
    value: String(i + MIN_INSTALLMENTS),
  })),
]

/**
 * Isian premi installment (Agus, 20 November 2026), dipakai form placing slip dan form polis.
 * Jumlah cicilan 2 sampai 10; persen dari premi setelah diskon, nominal dihitung otomatis.
 */
export function InstallmentEditor({
  value,
  onChange,
  base,
  currency,
  inceptionDate,
  expiryDate,
  disabled,
  hint,
  note,
  charges = 0,
}: {
  value: readonly PremiumInstallment[] | undefined
  onChange: (rows: PremiumInstallment[]) => void
  /** Premi setelah diskon, dasar nominal cicilan. */
  base: number
  currency: string
  inceptionDate?: string | null
  expiryDate?: string | null
  disabled?: boolean
  /** Kalimat tambahan di samping pilihan jumlah cicilan. */
  hint?: string
  /** Keterangan tambahan di bawah tabel, misalnya biaya polis dan meterai. */
  note?: string
  /** Admin cost dan stamp duty, otomatis masuk cicilan pertama (Agus, 22 November 2026). */
  charges?: number
}) {
  const rows = value ?? []
  const amounts = installmentAmounts(rows, base, charges)
  const totalPct = rows.reduce((sum, r) => sum + r.pct, 0)
  const error = installmentsError(rows)

  function setCount(count: number) {
    onChange(count >= MIN_INSTALLMENTS ? defaultInstallments(count, inceptionDate, expiryDate) : [])
  }
  function patch(index: number, change: Partial<PremiumInstallment>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...change } : r)))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
        <SelectInput
          label="Pembayaran Premi"
          items={COUNT_ITEMS}
          value={String(Math.max(1, rows.length))}
          onValueChange={(v) => setCount(Number(v) || 1)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground sm:col-span-2 sm:pt-7">
          Installment {MIN_INSTALLMENTS} sampai {MAX_INSTALLMENTS} kali dari premi setelah diskon
          ({money(base, currency)}).{hint ? ` ${hint}` : ""}
        </p>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Cicilan</th>
                <th className="px-3 py-2 font-medium">Jatuh Tempo</th>
                <th className="px-3 py-2 font-medium">Percentage (%)</th>
                <th className="px-3 py-2 text-right font-medium">Jumlah ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.no} className="border-b last:border-0">
                  <td className="px-3 py-1.5 tabular">Ke-{r.no}</td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="date"
                      aria-label={`Jatuh tempo cicilan ke-${r.no}`}
                      className="h-8 w-40"
                      value={r.dueDate ?? ""}
                      disabled={disabled}
                      onChange={(e) => patch(i, { dueDate: e.target.value || null })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <NumberInput
                      preset="percent"
                      aria-label={`Persen cicilan ke-${r.no}`}
                      className="h-8 w-24"
                      min={0}
                      max={100}
                      value={r.pct || null}
                      disabled={disabled}
                      invalid={!(r.pct > 0)}
                      onValueChange={(v) => patch(i, { pct: v ?? 0 })}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular">{num(amounts[i], 2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t text-sm font-medium">
                <td className="px-3 py-2" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2 tabular">{num(totalPct, 0, 4)}%</td>
                <td className="px-3 py-2 text-right tabular">{num(base + charges, 2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
      {rows.length && error ? <p className="text-xs text-destructive">{error}</p> : null}
      {rows.length && charges > 0 ? (
        <p className="text-xs text-muted-foreground">
          Cicilan ke-1 termasuk admin cost dan stamp duty {money(charges, currency)}.
        </p>
      ) : null}
      {rows.length && note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  )
}
