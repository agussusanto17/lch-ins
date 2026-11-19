"use client"

import { ToneBadge } from "@/components/shared/status-badge"
import { dateShort, money, num, percent } from "@/lib/format"
import {
  claimForLossRatio,
  lossRatioClaimValue,
  lossRatioTable,
  type LossRatioData,
  type LossRatioYearResult,
} from "@/lib/loss-ratio"
import { cn } from "@/lib/utils"

type ClaimValues = Parameters<typeof claimForLossRatio>[1]

const ratioText = (value: number | null) => (value === null ? "—" : percent(value))

function Ratio({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular text-xl font-semibold">{ratioText(value)}</span>
    </div>
  )
}

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
      <span className={cn("tabular shrink-0 text-right", strong && "font-semibold")}>
        {value}
      </span>
    </div>
  )
}

const yearOf = (y: Pick<LossRatioYearResult, "inceptionDate">) => y.inceptionDate.slice(0, 4)

/** Loss ratio per tahun polis seperti sheet Perhitungan LOSS RATIO, dengan baris total. */
function YearTable({
  years,
  total,
}: {
  years: LossRatioYearResult[]
  total: ReturnType<typeof lossRatioTable>["total"]
}) {
  const digits = total.currency === "IDR" ? 0 : 2
  const amount = (value: number) => num(value, digits)
  const cell = "tabular px-2 py-1.5 text-right whitespace-nowrap"
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <caption className="caption-top border-b px-2 py-1.5 text-left text-muted-foreground">
          Per tahun polis, nilai dalam {total.currency}
        </caption>
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-2 py-1.5 font-medium">
              Tahun polis
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              Gross Premium
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              Nett Premium
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              Klaim
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              Gross L/R
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">
              Nett L/R
            </th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.policyId} className={cn("border-t", y.current && "bg-primary/5")}>
              <th scope="row" className="px-2 py-1.5 text-left font-normal">
                <span
                  className="flex items-center gap-1.5 font-medium"
                  title={`${dateShort(y.inceptionDate)} – ${dateShort(y.expiryDate)}`}
                >
                  {yearOf(y)}
                  {y.current ? <ToneBadge tone="info">Klaim ini</ToneBadge> : null}
                </span>
                <span className="tabular block text-muted-foreground">{y.policyNo}</span>
              </th>
              <td className={cell}>{amount(y.grossPremium)}</td>
              <td className={cell}>{amount(y.nettPremium)}</td>
              <td className={cell}>{amount(y.incurred)}</td>
              <td className={cell}>{ratioText(y.grossRatio)}</td>
              <td className={cell}>{ratioText(y.nettRatio)}</td>
            </tr>
          ))}
          <tr className="border-t font-semibold">
            <th scope="row" className="px-2 py-1.5 text-left">
              Total
            </th>
            <td className={cell}>{amount(total.grossPremium)}</td>
            <td className={cell}>{amount(total.nettPremium)}</td>
            <td className={cell}>{amount(total.incurred)}</td>
            <td className={cell}>{ratioText(total.grossRatio)}</td>
            <td className={cell}>{ratioText(total.nettRatio)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Dari nilai mana klaim yang sedang dibuka ikut dihitung. */
function currentClaimText(claim: ClaimValues) {
  if (claim.status === "Rejected") return "Klaim ini Rejected, jadi tidak dihitung."
  const source =
    claim.status === "Settled" || claim.status === "Closed"
      ? "jumlah dibayar"
      : "estimasi kerugian"
  return `Klaim ini dihitung dari ${source}, ${money(lossRatioClaimValue(claim), claim.currency || "IDR")}.`
}

/**
 * Gross dan Nett Loss Ratio polis klaim (MoM review Phase 1, poin 13 dan 19), per tahun polis
 * dan totalnya. Nilai klaim yang sedang dibuka memakai isian terbaru, jadi angka di form ikut
 * berubah sebelum disimpan.
 */
export function LossRatioPanel({
  data,
  claimId,
  claim,
}: {
  data: LossRatioData
  /** Id klaim tersimpan; kosong untuk klaim baru. */
  claimId: string | null
  claim: ClaimValues
}) {
  const { years, total: r } = lossRatioTable(data, claimForLossRatio(claimId ?? "draft", claim))
  const cur = r.currency
  const minus = (value: number) => `− ${money(value, cur)}`
  const first = years[0]
  const last = years[years.length - 1]
  const scope =
    first && last && years.length > 1
      ? `Total ${years.length} tahun polis, ${yearOf(first)}–${yearOf(last)}`
      : first
        ? `Tahun polis ${yearOf(first)}`
        : null

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="rounded-lg border bg-muted/50 px-4 py-3">
        {scope ? <p className="mb-2 text-xs text-muted-foreground">{scope}</p> : null}
        <div className="grid grid-cols-2 gap-4">
          <Ratio label="Gross Loss Ratio" value={r.grossRatio} />
          <Ratio label="Nett Loss Ratio" value={r.nettRatio} />
        </div>
        {r.grossRatio === null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Loss ratio belum bisa dihitung karena Gross Premium polis ini 0.
          </p>
        ) : r.nettRatio === null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nett Loss Ratio belum bisa dihitung karena Nett Premium polis ini 0 atau minus.
          </p>
        ) : null}

        <div className="mt-3 border-t pt-1.5">
          <Row label="Klaim" hint={`${r.claimCount} klaim dihitung`} value={money(r.claimValue, cur)} />
          <Row label="Adjuster fee" value={`+ ${money(r.adjusterFee, cur)}`} />
          <Row label="Salvage" value={minus(r.salvage)} />
          <Row
            label="Total klaim"
            hint="Klaim + adjuster fee − salvage"
            value={money(r.incurred, cur)}
            strong
          />
        </div>
        <div className="mt-1 border-t pt-1.5">
          <Row
            label="Gross Premium"
            hint={
              r.discount
                ? `Premi ${money(r.premium, cur)} − diskon ${money(r.discount, cur)}`
                : "Premi, tanpa diskon"
            }
            value={money(r.grossPremium, cur)}
            strong
          />
          <Row
            label="Nett Premium"
            hint={`Gross Premium − brokerage ${money(r.brokerage, cur)}${
              r.additionalFee ? ` − additional fee ${money(r.additionalFee, cur)}` : ""
            }`}
            value={money(r.nettPremium, cur)}
            strong
          />
        </div>
      </div>

      {years.length > 1 ? <YearTable years={years} total={r} /> : null}

      <p className="text-xs text-muted-foreground">
        {currentClaimText(claim)} Satu tahun polis berisi polis Baru atau Renewal beserta
        endorsement, pembatalan, dan deklarasinya. Klaim Settled dan Closed dihitung dari jumlah
        dibayar, klaim berjalan dari estimasi kerugian, dan klaim Rejected tidak dihitung.
        {r.converted ? " Mata uang polis dan klaim berbeda, jadi semua nilai dikonversi ke IDR." : ""}
      </p>
    </div>
  )
}
