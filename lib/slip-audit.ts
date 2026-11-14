/**
 * Ringkasan isi placing slip untuk audit trail, tersusun seperti dokumen slip. recordAudit hanya
 * menyimpan isian yang teksnya berbeda, jadi ringkasan sebelum dan sesudah harus dibentuk sama.
 */

import { slipSectionTitles } from "@/components/underwriting/slip-model"
import { totalPremium, totalSumInsured } from "@/lib/calc"
import type { PlacingSlip } from "@/lib/data/types"
import { money } from "@/lib/format"
import { deductibleGroups, deductiblesByUnit } from "@/lib/slip-deductibles"

/** Judul klausul yang tersimpan di slip_clauses. */
export interface SlipClauseTitle {
  /** 0 tanpa section dan 2 Section 2 di slip ber-section; selain itu 1. */
  section: number
  title: string
  /** Judul kelompok di slip tanpa section, misalnya "Extensions". */
  groupTitle?: string | null
}

const bullet = (text: string) => `- ${text}`

/** Judul (bila ada) lalu satu butir per baris. */
function block(heading: string | null | undefined, items: string[]) {
  return heading ? [heading, ...items.map(bullet)] : items.map(bullet)
}

/**
 * Deductible seperti blok DEDUCTIBLE & CONDITIONS: judul unit bila berbeda per unit, judul
 * section, lalu satu butir per teks. Unit dipisah baris kosong.
 */
export function deductiblesText(slip: PlacingSlip) {
  return deductiblesByUnit(deductibleGroups(slip))
    .map(({ unit, groups }) =>
      [
        ...(unit ? [unit] : []),
        ...groups.flatMap((g) => block(g.heading, g.texts)),
      ].join("\n")
    )
    .join("\n\n")
}

/**
 * Judul klausul per kelompok, urut seperti CLAUSES di dokumen. Kelompok dipisah baris kosong
 * supaya kelompok tanpa judul tidak terbaca sebagai bagian kelompok di atasnya.
 */
export function clausesText(
  slip: Pick<PlacingSlip, "cob" | "usesSections">,
  clauses: readonly SlipClauseTitle[]
) {
  const titles = slipSectionTitles(slip)
  const of = (section: number) => clauses.filter((c) => c.section === section)
  const groups: { heading: string | null; rows: SlipClauseTitle[] }[] = []
  if (titles) {
    groups.push(
      { heading: null, rows: of(0) },
      { heading: titles[0], rows: of(1) },
      { heading: titles[1], rows: of(2) }
    )
  } else {
    for (const row of of(1)) {
      const heading = row.groupTitle?.trim() || null
      const group = groups.find((g) => g.heading === heading)
      if (group) group.rows.push(row)
      else groups.push({ heading, rows: [row] })
    }
  }
  return groups
    .filter((g) => g.rows.length > 0)
    .map((g) =>
      block(
        g.heading,
        g.rows.map((c) => c.title.trim())
      ).join("\n")
    )
    .join("\n\n")
}

/**
 * Isi slip yang dicatat audit trail saat slip diubah, satu teks per isian.
 * Total memakai mata uang slip, misalnya "IDR 1.250.000.000".
 */
export function slipAuditSummary(
  slip: PlacingSlip,
  clauses: readonly SlipClauseTitle[]
) {
  return {
    totalSumInsured: money(totalSumInsured(slip), slip.currency),
    totalPremium: money(totalPremium(slip), slip.currency),
    deductibles: deductiblesText(slip),
    specialConditions: slip.specialConditions?.trim() ?? "",
    clauses: clausesText(slip, clauses),
  }
}
