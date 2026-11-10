/**
 * Deductible slip per kelompok, sama dengan blok DEDUCTIBLE & CONDITIONS di
 * dokumen slip. Dipakai juga form klaim untuk menampilkan deductible polis
 * (meeting LCH, 10 November 2026).
 */

import { BI_RATE_LABELS } from "@/lib/calc"
import type { PlacingSlip, SlipPart } from "@/lib/data/types"
import {
  deductibleRows,
  slipSectionTitles,
} from "@/components/underwriting/slip-model"

export interface DeductibleGroupText {
  /** Judul kelompok, misalnya "Section 1 — Material Damage"; kosong untuk satu daftar. */
  heading: string | null
  texts: string[]
}

type Row = ReturnType<typeof deductibleRows>[number]

/**
 * Teks deductible tidak lagi mencetak kolom cover karena sudah menyebut
 * perilnya; teks yang sama dari beberapa cover tampil sekali.
 * - Property mengikuti CI LCH (contoh SISKA RAHARJA): per section, cover BI
 *   masuk Section 2.
 * - Slip ber-section (CAR, EAR): satu kelompok per section.
 * - COB lain: satu daftar.
 *
 * `part` membatasi slip PAR + EQVET ke bagian yang menjadi polis itu, dengan
 * aturan yang sama seperti premi per bagian: baris rate berlabel EQVET masuk
 * polis EQVET, sisanya polis PAR.
 */
export function deductibleGroups(
  slip: PlacingSlip,
  part?: SlipPart | null
): DeductibleGroupText[] {
  const eqvetLines = new Set(
    (slip.rateLines ?? []).filter((l) => /eqvet/i.test(l.label)).map((l) => l.id)
  )
  const rows = deductibleRows(slip).filter(
    (r) => !part || (part === "EQVET") === eqvetLines.has(r.lineId)
  )
  const texts = (pick: (row: Row) => boolean) => [
    ...new Set(
      rows
        .filter(pick)
        .flatMap((r) => r.deductibles)
        .map((text) => text.trim())
        .filter(Boolean)
    ),
  ]
  const property = slip.cob === "Property"
  const sectioned = !property && slipSectionTitles(slip) !== null
  const groups: DeductibleGroupText[] = sectioned
    ? rows.map((r) => ({ heading: r.cover, texts: texts((x) => x === r) }))
    : property
      ? [
          {
            heading: "Section 1 — Material Damage",
            texts: texts((r) => !BI_RATE_LABELS.includes(r.cover)),
          },
          {
            heading: "Section 2 — Business Interruption",
            texts: texts((r) => BI_RATE_LABELS.includes(r.cover)),
          },
        ]
      : [{ heading: null, texts: texts(() => true) }]
  return groups.filter((g) => g.texts.length > 0)
}
