/**
 * Tanda tangan LCH di cetak Placing Slip, Quotation Slip, dan Closing Instruction (Harry,
 * 19 November 2026). Daftarnya dikelola di Master Data; di halaman cetak pengguna memilih
 * tanda tangan siapa, yang default terpilih otomatis, atau tanpa tanda tangan.
 */

export interface DocumentSignatory {
  id: string
  name: string
  fileName: string
  isDefault: boolean
  /** Gambar di /api/files: terbuka untuk menu Placement dan Master Data. */
  imageUrl: string | null
}

/** Nilai pilihan "Tanpa tanda tangan" di halaman cetak. */
export const NO_SIGNATURE = "none"

/** Pilihan awal di halaman cetak: yang default, atau yang pertama bila tidak ada default. */
export function initialSignatoryId(list: Pick<DocumentSignatory, "id" | "isDefault">[]) {
  return (list.find((s) => s.isDefault) ?? list[0])?.id ?? NO_SIGNATURE
}

/** Urutan tampil di Master Data dan halaman cetak: default dulu, lalu nama. */
export function sortSignatories<T extends { name: string; isDefault: boolean }>(list: T[]) {
  return [...list].sort(
    (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name, "id")
  )
}

/** Nama menjadi label pilihan di halaman cetak, jadi tidak boleh kembar walau beda huruf besar. */
export function sameSignatoryName(a: string, b: string) {
  return a.trim().toLocaleLowerCase("id") === b.trim().toLocaleLowerCase("id")
}
