/**
 * Generator Terbilang Bahasa Indonesia presisi sampai sen.
 * Digunakan untuk dokumen resmi keuangan: Debit Note, Credit Note, Kwitansi.
 *
 * Contoh:
 * 13440000.50 -> "tiga belas juta empat ratus empat puluh ribu rupiah lima puluh sen"
 * 1000000 -> "satu juta rupiah"
 */

const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
]

function terbilangBulat(n: number): string {
  if (n === 0) return ""
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${terbilangBulat(n - 10)} belas`
  if (n < 100) return `${terbilangBulat(Math.floor(n / 10))} puluh ${terbilangBulat(n % 10)}`.trim()
  if (n < 200) return `seratus ${terbilangBulat(n - 100)}`.trim()
  if (n < 1000) return `${terbilangBulat(Math.floor(n / 100))} ratus ${terbilangBulat(n % 100)}`.trim()
  if (n < 2000) return `seribu ${terbilangBulat(n - 1000)}`.trim()
  if (n < 1000000)
    return `${terbilangBulat(Math.floor(n / 1000))} ribu ${terbilangBulat(n % 1000)}`.trim()
  if (n < 1000000000)
    return `${terbilangBulat(Math.floor(n / 1000000))} juta ${terbilangBulat(n % 1000000)}`.trim()
  if (n < 1000000000000)
    return `${terbilangBulat(Math.floor(n / 1000000000))} milyar ${terbilangBulat(n % 1000000000)}`.trim()
  if (n < 1000000000000000)
    return `${terbilangBulat(Math.floor(n / 1000000000000))} triliun ${terbilangBulat(n % 1000000000000)}`.trim()
  return String(n)
}

export function terbilang(nominal: number | string, currency = "IDR"): string {
  const num = typeof nominal === "string" ? parseFloat(nominal) : nominal
  if (isNaN(num) || num === 0) return "nol rupiah"

  const isNegatif = num < 0
  const absNum = Math.abs(num)

  const bagianBulat = Math.floor(absNum)
  const bagianSen = Math.round((absNum - bagianBulat) * 100)

  let hasil = terbilangBulat(bagianBulat)

  // Tambahkan mata uang
  if (currency === "IDR") {
    hasil = `${hasil} rupiah`.trim()
  } else if (currency === "USD") {
    hasil = `${hasil} dolar AS`.trim()
  } else {
    hasil = `${hasil} ${currency}`.trim()
  }

  // Tambahkan sen bila ada desimal
  if (bagianSen > 0) {
    hasil = `${hasil} ${terbilangBulat(bagianSen)} sen`.trim()
  }

  if (isNegatif) {
    hasil = `minus ${hasil}`
  }

  // Huruf kapital di awal kalimat (Sentence case)
  return hasil.charAt(0).toUpperCase() + hasil.slice(1)
}
