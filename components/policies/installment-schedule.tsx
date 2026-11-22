"use client"

import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Policy } from "@/lib/data/types"
import { dateShort, money, num } from "@/lib/format"
import {
  installmentAmounts,
  installmentLabel,
  policyInstallmentBase,
  policyInstallmentCharges,
} from "@/lib/premium-installments"

/**
 * Jadwal premi installment di Policy Database (Agus, 20 November 2026): "4x cicilan" di bawah
 * premi, diklik untuk melihat jatuh tempo dan nominal tiap cicilan.
 */
export function InstallmentSchedule({
  policy,
  today,
}: {
  policy: Pick<
    Policy,
    "premium" | "discountAmount" | "adminCost" | "stampDuty" | "currency" | "premiumInstallments"
  >
  /** Hari ini "YYYY-MM-DD" (WIB), untuk cicilan berikutnya. */
  today: string
}) {
  const rows = policy.premiumInstallments ?? []
  if (!rows.length) return null
  const charges = policyInstallmentCharges(policy)
  const amounts = installmentAmounts(rows, policyInstallmentBase(policy), charges)
  const next = rows.find((r) => r.dueDate && r.dueDate >= today)
  return (
    <Popover>
      <PopoverTrigger className="mt-0.5 block cursor-pointer text-right text-xs font-normal text-primary underline-offset-2 hover:underline">
        {installmentLabel(rows)}
        {next ? ` · berikutnya ${dateShort(next.dueDate)}` : ""}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Premi installment</PopoverTitle>
        </PopoverHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 font-medium">Cicilan</th>
              <th className="py-1.5 font-medium">Jatuh Tempo</th>
              <th className="py-1.5 text-right font-medium">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.no} className="border-b last:border-0">
                <td className="py-1.5 tabular">
                  Ke-{r.no}
                  <span className="ml-1 text-xs text-muted-foreground">{num(r.pct, 0, 4)}%</span>
                </td>
                <td className="py-1.5 tabular">{dateShort(r.dueDate)}</td>
                <td className="py-1.5 text-right tabular">{money(amounts[i], policy.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground">
          Dari premi setelah diskon {money(policyInstallmentBase(policy), policy.currency)}.
          {charges > 0
            ? ` Cicilan ke-1 termasuk admin cost dan stamp duty ${money(charges, policy.currency)}.`
            : ""}
        </p>
      </PopoverContent>
    </Popover>
  )
}
