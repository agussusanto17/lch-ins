/**
 * Bentuk teks deductible yang dicetak dokumen slip, endorsement, dan form
 * klaim. Dipisah dari lib/slip-deductibles supaya komponen klien cukup
 * memuat modul kecil ini.
 */

export interface DeductibleGroupText {
  /**
   * Lokasi, kendaraan, atau objek pemilik kelompok, misalnya "Location 2",
   * bila deductible-nya berbeda per unit. Kosong bila berlaku untuk semua.
   */
  unit?: string | null
  /** Judul kelompok, misalnya "Section 1 — Material Damage"; kosong untuk satu daftar. */
  heading: string | null
  texts: string[]
}

/** Kelompok deductible berurutan per unit, supaya judul unit dicetak sekali. */
export function deductiblesByUnit(groups: DeductibleGroupText[]) {
  const out: { unit: string | null; groups: DeductibleGroupText[] }[] = []
  for (const group of groups) {
    const unit = group.unit ?? null
    const last = out.at(-1)
    if (last && last.unit === unit) last.groups.push(group)
    else out.push({ unit, groups: [group] })
  }
  return out
}
