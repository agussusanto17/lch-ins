/**
 * Rincian premi per tahun polis untuk slip Motor Vehicle multi tahun: dipakai form (rincian per
 * kendaraan) dan dokumen (lampiran PREMIUM CALCULATION PER POLICY YEAR). Hitungannya sama dengan
 * recalcSlip: premi setahun dari nilai tahun itu, dikali porsi tahun, dibulatkan per tahun.
 */
import { premiumFromRate, rateModeFor } from "./calc"
import type { LineItem, PlacingSlip, RateLine } from "./data/types"
import { policyYears, yearlySumInsured, type PolicyYear } from "./multi-year"
import { itemGroups } from "./slip-items"

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export interface YearCoverRow {
  kind: "casco" | "tpl" | "pa"
  label: string
  /** Nilai kendaraan tahun itu untuk casco dan perluasan; limit untuk TPL dan PA. */
  basis: number
  rate: number
  premium: number
}

export interface VehicleYear {
  year: PolicyYear
  sumInsured: number
  rows: YearCoverRow[]
  total: number
}

export interface VehicleYearSchedule {
  /** Nomor kendaraan di form dan dokumen, mulai 1. */
  no: number
  item: LineItem
  years: VehicleYear[]
  total: number
}

/** Baris rate yang dikenai premi: rate terisi dan, untuk TPL dan PA, limit terisi. */
const priced = (l: RateLine, basis: number) => (l.rate ?? 0) > 0 && basis > 0

/** Rincian per tahun polis setiap kendaraan; kosong bila slip bukan Motor Vehicle multi tahun. */
export function multiYearSchedule(slip: PlacingSlip): VehicleYearSchedule[] {
  if (slip.cob !== "Motor Vehicle") return []
  const years = policyYears(slip)
  if (years.length < 2) return []
  const mode = rateModeFor(slip.cob)

  return itemGroups(slip).map((g) => {
    const values = yearlySumInsured(
      g.item.amount || 0,
      slip.multiYearDepreciationPct,
      years.length,
      g.item.yearValues
    )
    const perYear = years.map((year, i): VehicleYear => {
      const rows: YearCoverRow[] = [
        ...g.rateLines
          .filter((l) => priced(l, values[i]))
          .map((l) => ({
            kind: "casco" as const,
            label: l.label,
            basis: values[i],
            rate: l.rate!,
            premium: cents(premiumFromRate(values[i], l.rate, mode) * year.factor),
          })),
        ...([
          ["tpl", g.tplLines],
          ["pa", g.paLines],
        ] as const).flatMap(([kind, lines]) =>
          lines
            .filter((l) => priced(l, Number(l.basis ?? 0)))
            .map((l) => ({
              kind,
              label: l.label,
              basis: Number(l.basis ?? 0),
              rate: l.rate!,
              premium: cents(premiumFromRate(Number(l.basis ?? 0), l.rate, "percent") * year.factor),
            }))
        ),
      ]
      return {
        year,
        sumInsured: values[i],
        rows,
        total: cents(rows.reduce((sum, r) => sum + r.premium, 0)),
      }
    })
    return {
      no: g.no,
      item: g.item,
      years: perYear,
      total: cents(perYear.reduce((sum, y) => sum + y.total, 0)),
    }
  })
}
