export const CURRENCY_SYMBOL: Record<string, string> = {
  IDR: "IDR",
  USD: "USD",
  SGD: "SGD",
  EUR: "EUR",
}

/** 13440000 -> "13.440.000" */
export function num(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value ?? 0)
}

/** 13440000 -> "IDR 13.440.000" */
export function money(value: number, currency = "IDR") {
  return `${CURRENCY_SYMBOL[currency] ?? currency} ${num(value)}`
}

/** 13440000 -> "Rp 13.440.000" */
export function rupiah(value: number) {
  return `Rp ${num(value)}`
}

/** 13440000 -> "13,4 jt" · 1340000000 -> "1,34 M" */
export function compactMoney(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${num(value / 1_000_000_000, 2)} M`
  if (abs >= 1_000_000) return `${num(value / 1_000_000, 1)} jt`
  if (abs >= 1_000) return `${num(value / 1_000, 0)} rb`
  return num(value)
}

export function rate(value: number, digits = 6) {
  return num(value, digits)
}

export function percent(value: number, digits = 2) {
  return `${num(value, digits)}%`
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
]

function parse(input: string | Date) {
  return typeof input === "string" ? new Date(`${input}T00:00:00`) : input
}

/** Format standar aplikasi: "10 Agu 2026" */
export function dateShort(input?: string | Date | null) {
  if (!input) return "—"
  const d = parse(input)
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** "10 Agustus 2026" */
export function dateLong(input?: string | Date | null) {
  if (!input) return "—"
  const d = parse(input)
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

/** Dokumen berbahasa Inggris: "11 August 2026" */
export function dateEn(input?: string | Date | null) {
  if (!input) return "—"
  const d = parse(input)
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`
}

/** Untuk input type="date" */
export function dateInput(input?: string | Date | null) {
  if (!input) return ""
  const d = parse(input)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function monthLabel(monthIndex: number, year: number) {
  return `${MONTHS_ID[monthIndex]} ${year}`
}

export const MONTH_NAMES_ID = MONTHS_ID
export const MONTH_NAMES_SHORT = MONTHS_SHORT

const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
]
export function romanMonth(monthIndex: number) {
  return ROMAN[monthIndex]
}

/** 001/LCH-PLCMT/PS-PAREQ/VIII/2026 */
export function slipNumber(
  seq: number,
  coverCode: string | null,
  date: Date,
  kind: "PS" | "CI" | "CN" = "PS"
) {
  const code = coverCode ? `${kind}-${coverCode}` : kind
  return `${String(seq).padStart(3, "0")}/LCH-PLCMT/${code}/${romanMonth(date.getMonth())}/${date.getFullYear()}`
}

export function daysUntil(input: string | Date, from: Date) {
  const d = parse(input)
  return Math.ceil((d.getTime() - from.getTime()) / 86_400_000)
}
