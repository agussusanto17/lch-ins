import type { SlipDetailRow } from "./data/types"

/** Batas Detail tambahan, sama di form, validasi server, dan Master Data. */
export const DETAIL_LIMITS = { rows: 40, labels: 30, label: 100, value: 2000 }

const keyOf = (label: string) => label.trim().toLowerCase()

/** Label bawaan type of cover: dirapikan, tanpa yang kosong atau dobel. */
export function cleanDetailLabels(labels: readonly string[] | undefined) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of labels ?? []) {
    const label = raw.trim()
    if (!label || seen.has(keyOf(label))) continue
    seen.add(keyOf(label))
    out.push(label)
  }
  return out
}

/**
 * Label bawaan type of cover yang baru dipilih masuk ke Detail tambahan.
 * Baris yang sudah berisi tetap; baris kosong (biasanya label bawaan type of
 * cover sebelumnya) dibuang; label bawaan yang belum ada ditambahkan di akhir.
 */
export function withDetailLabels(
  rows: readonly SlipDetailRow[] | undefined,
  labels: readonly string[]
): SlipDetailRow[] {
  const kept = (rows ?? []).filter((r) => r.value.trim())
  return [...kept, ...missingDetailLabels(kept, labels).map((label) => ({ label, value: "" }))]
}

/** Label bawaan yang belum ada di baris slip. */
export function missingDetailLabels(
  rows: readonly SlipDetailRow[] | undefined,
  labels: readonly string[]
) {
  const present = new Set((rows ?? []).map((r) => keyOf(r.label)))
  return cleanDetailLabels(labels).filter((l) => !present.has(keyOf(l)))
}

/**
 * Baris Existing Policy No. (nomor polis tahun lalu untuk renewal). Dokumen
 * mencetaknya di sisi kanan atas, bukan di tabel detail (Harry, 6 November
 * 2026).
 */
export function isExistingPolicyLabel(label: string) {
  return /^existing\s+policy(\s+no\.?|\s+number)?$/i.test(label.trim())
}

/**
 * Baris The Business (atau Business). Dokumen mencetaknya tepat di bawah
 * Correspondence Address, bukan bersama detail tambahan lain (LCH, slip GPA
 * PT. Salam Pacific, 13 November 2026).
 */
export function isBusinessLabel(label: string) {
  return /^(the\s+)?business$/i.test(label.trim())
}

/** Baris yang dicetak di dokumen: isi kosong dilewati. */
export function printedDetailRows(rows: readonly SlipDetailRow[] | undefined) {
  return (rows ?? [])
    .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
    .filter((r) => r.value)
}

/**
 * Baris dari input atau database (kolom JSON) menjadi daftar {label, value}.
 * Baris yang label dan isinya kosong dibuang; label bawaan tanpa isi tetap
 * disimpan supaya tidak hilang setelah slip dibuka lagi.
 */
export function cleanDetailRows(input: unknown): SlipDetailRow[] {
  if (!Array.isArray(input)) return []
  const rows: SlipDetailRow[] = []
  for (const item of input) {
    if (!item || typeof item !== "object") continue
    const { label, value } = item as Record<string, unknown>
    const row = {
      label: typeof label === "string" ? label.trim() : "",
      value: typeof value === "string" ? value.trimEnd() : "",
    }
    if (row.label || row.value.trim()) rows.push(row)
  }
  return rows.slice(0, DETAIL_LIMITS.rows)
}
