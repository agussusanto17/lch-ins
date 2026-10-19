/**
 * Utilitas tanggal. Semua tanggal bisnis disimpan sebagai string ISO
 * "YYYY-MM-DD" dan "hari ini" dihitung di zona WIB (PRD bagian 8), bukan zona
 * server, supaya status polis dan jatuh tempo tidak bergeser saat server
 * berjalan di UTC.
 */

export const APP_TIME_ZONE = "Asia/Jakarta"

/** Tanggal hari ini di WIB, format "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()) {
  // en-CA menghasilkan format YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** Nomor hari sejak epoch untuk tanggal ISO, bebas zona waktu. */
function dayNumber(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/** Selisih hari dari `from` ke `to` (positif bila `to` di masa depan). */
export function daysBetween(from: string, to: string) {
  return dayNumber(to) - dayNumber(from)
}

/** Tambah atau kurangi hari dari tanggal ISO. */
export function addDays(iso: string, days: number) {
  const date = new Date((dayNumber(iso) + days) * 86_400_000)
  return date.toISOString().slice(0, 10)
}

/** Tambah bulan kalender, dipakai untuk default periode satu tahun. */
export function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1 + months, d))
  return date.toISOString().slice(0, 10)
}

/** Bagian tahun dan bulan (1-12) dari tanggal ISO, untuk penomoran dokumen. */
export function yearMonth(iso: string) {
  const [y, m] = iso.slice(0, 10).split("-").map(Number)
  return { year: y, month: m }
}
