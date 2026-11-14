/**
 * Open cover (Tahap 3 nomor 15): slip berisi rate per kategori tanpa TSI dan premi; premi
 * dicatat per deklarasi sebagai polis (Harry, 6 November 2026).
 */
import type { OpenCoverRate, PlacingSlip } from "./data/types"
import { money, num } from "./format"

export const OPEN_COVER_LIMITS = { rows: 30, text: 200, unit: 50 }

/** Open cover hanya untuk COB selain Property dan Motor Vehicle. */
export function usesOpenCover(slip: Pick<PlacingSlip, "cob" | "openCover">) {
  return (
    Boolean(slip.openCover) &&
    slip.cob !== "Property" &&
    slip.cob !== "Motor Vehicle"
  )
}

/** Baris rate open cover yang valid dari JSON tersimpan atau input. */
export function cleanOpenCoverRates(input: unknown): OpenCoverRate[] {
  if (!Array.isArray(input)) return []
  const rows: OpenCoverRate[] = []
  for (const item of input) {
    if (!item || typeof item !== "object") continue
    const r = item as Record<string, unknown>
    const label =
      typeof r.label === "string"
        ? r.label.trim().slice(0, OPEN_COVER_LIMITS.text)
        : ""
    const rate =
      typeof r.rate === "number" && Number.isFinite(r.rate) && r.rate >= 0
        ? r.rate
        : null
    const basis = r.basis === "per_unit" ? "per_unit" : "percent"
    const unit =
      typeof r.unit === "string"
        ? r.unit.trim().slice(0, OPEN_COVER_LIMITS.unit)
        : ""
    if (!label && rate == null) continue
    rows.push({
      id:
        typeof r.id === "string" && r.id
          ? r.id.slice(0, 80)
          : `oc${rows.length + 1}`,
      label,
      basis,
      rate,
      ...(basis === "per_unit" && unit ? { unit } : {}),
    })
  }
  return rows.slice(0, OPEN_COVER_LIMITS.rows)
}

/** Rate tercetak: "0,075%" atau "IDR 150.000 per container". */
export function openCoverRateText(rate: OpenCoverRate, currency: string) {
  if (rate.rate == null) return "—"
  if (rate.basis === "percent") return `${num(rate.rate, 0, 6)}%`
  const unit = rate.unit?.trim()
  return `${money(rate.rate, currency)}${unit ? ` per ${unit}` : ""}`
}

/** Isian open cover yang wajib sebelum release: minimal satu rate berkategori. */
export function openCoverIssues(
  slip: Pick<PlacingSlip, "openCoverRates">
): string[] {
  const rows = slip.openCoverRates ?? []
  const issues: string[] = []
  rows.forEach((r, i) => {
    if ((r.rate ?? 0) > 0 && !r.label.trim())
      issues.push(`Isi kategori rate open cover nomor ${i + 1}.`)
  })
  if (!rows.some((r) => (r.rate ?? 0) > 0 && r.label.trim())) {
    issues.push("Isi minimal satu rate open cover.")
  }
  return issues
}

/**
 * Premi satu deklarasi dari satu baris rate: nilai deklarasi × persen, atau
 * jumlah unit × tarif per unit. Dibulatkan ke sen.
 */
export function openCoverPremium(
  rate: Pick<OpenCoverRate, "basis" | "rate">,
  quantity: number
) {
  if (!(quantity > 0) || !(rate.rate != null && rate.rate > 0)) return 0
  const raw =
    rate.basis === "percent"
      ? (quantity * rate.rate) / 100
      : quantity * rate.rate
  return Math.round(raw * 100) / 100
}
