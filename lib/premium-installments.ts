/**
 * Premi installment (Agus, 20 November 2026): premi setelah diskon dibayar dalam 2 sampai 10
 * cicilan. Jadwalnya disimpan sebagai persen dan jatuh tempo di slip, lalu ikut ke polis saat CI
 * terbit. Nominal tiap cicilan dihitung dari premi masing-masing, jadi dua polis slip PAR + EQVET
 * memakai jadwal yang sama.
 */
import { roundCents, slipDiscountAmount, totalPayable, totalPremium } from "./calc"
import type { PlacingSlip, PremiumInstallment } from "./data/types"
import { dateShort, num } from "./format"

export const MIN_INSTALLMENTS = 2
export const MAX_INSTALLMENTS = 10

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Tambah bulan kalender; tanggal 31 jatuh ke akhir bulan pendek, bukan ke bulan berikutnya. */
function addMonthsClamped(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number)
  const first = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
  ).getUTCDate()
  first.setUTCDate(Math.min(d, lastDay))
  return first.toISOString().slice(0, 10)
}

/** Selisih bulan penuh dari `from` ke `to`, minimal 0. */
function monthsBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  return Math.max(0, (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0))
}

/** Persen rata dua desimal; cicilan terakhir menampung sisa supaya jumlahnya tepat 100%. */
export function equalInstallmentPcts(count: number): number[] {
  const each = Math.floor((100 / count) * 100) / 100
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? cents(100 - each * (count - 1)) : each
  )
}

/**
 * Jadwal bawaan: persen rata, cicilan pertama jatuh tempo di tanggal mulai polis, berikutnya
 * berjarak sama dalam periode polis (4x setahun = tiap 3 bulan, 10x = tiap bulan). Tanpa tanggal
 * mulai, jatuh tempo dikosongkan untuk diisi.
 */
export function defaultInstallments(
  count: number,
  inceptionDate?: string | null,
  expiryDate?: string | null
): PremiumInstallment[] {
  const start = inceptionDate && ISO_DATE.test(inceptionDate) ? inceptionDate : null
  const end = expiryDate && ISO_DATE.test(expiryDate) ? expiryDate : null
  const periodMonths = start && end ? monthsBetween(start, end) : 12
  const step = Math.max(1, Math.floor((periodMonths || 12) / count))
  return equalInstallmentPcts(count).map((pct, i) => ({
    no: i + 1,
    dueDate: start ? addMonthsClamped(start, i * step) : null,
    pct,
  }))
}

/**
 * Jadwal bersih dari form atau kolom JSON: nomor urut ulang, persen 10 desimal, tanggal ISO atau
 * kosong. Kurang dari dua baris berarti premi dibayar sekaligus, disimpan sebagai daftar kosong.
 */
export function cleanInstallments(raw: unknown): PremiumInstallment[] {
  if (!Array.isArray(raw)) return []
  const rows = raw
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .slice(0, MAX_INSTALLMENTS)
    .map((r, i) => {
      const pct = Number(r.pct)
      const dueDate = typeof r.dueDate === "string" && ISO_DATE.test(r.dueDate) ? r.dueDate : null
      return {
        no: i + 1,
        dueDate,
        // 10 desimal: persen turunan rincian Marine Hull (IV & War di cicilan 1) tetap memberi
        // nominal tepat sampai sen, juga untuk premi miliaran.
        pct: Number.isFinite(pct) ? Math.round(pct * 1e10) / 1e10 : 0,
      }
    })
  return rows.length >= MIN_INSTALLMENTS ? rows : []
}

/** Kesalahan jadwal cicilan untuk form dan server; null bila valid atau premi dibayar sekaligus. */
export function installmentsError(rows: readonly PremiumInstallment[] | undefined): string | null {
  if (!rows?.length) return null
  if (rows.length < MIN_INSTALLMENTS || rows.length > MAX_INSTALLMENTS) {
    return `Jumlah cicilan ${MIN_INSTALLMENTS} sampai ${MAX_INSTALLMENTS} kali.`
  }
  const zero = rows.find((r) => !(r.pct > 0))
  if (zero) return `Persen cicilan ke-${zero.no} harus lebih dari 0.`
  const total = rows.reduce((sum, r) => sum + r.pct, 0)
  if (Math.abs(total - 100) > 0.0001) {
    return `Jumlah persen cicilan harus 100%, sekarang ${cents(total)}%.`
  }
  const empty = rows.find((r) => !r.dueDate)
  if (empty) return `Isi jatuh tempo cicilan ke-${empty.no}.`
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].dueDate! < rows[i - 1].dueDate!) {
      return `Jatuh tempo cicilan ke-${rows[i].no} tidak boleh sebelum cicilan ke-${rows[i - 1].no}.`
    }
  }
  return null
}

/**
 * Nominal tiap cicilan dari premi setelah diskon. Dibulatkan ke sen, dan cicilan terakhir
 * menampung selisih pembulatan supaya jumlahnya tepat sama dengan premi. Admin cost dan stamp
 * duty (`charges`) otomatis masuk cicilan pertama (Agus, 22 November 2026).
 */
export function installmentAmounts(
  rows: readonly PremiumInstallment[],
  netPremium: number,
  charges = 0
): number[] {
  let left = cents(netPremium)
  return rows.map((r, i) => {
    const amount = i === rows.length - 1 ? left : cents((netPremium * r.pct) / 100)
    left = cents(left - amount)
    return i === 0 ? cents(amount + charges) : amount
  })
}

/**
 * Dasar cicilan slip: premi setelah diskon. Slip PAR + EQVET menjumlah kedua bagiannya; tiap
 * polisnya nanti membagi premi bagiannya sendiri dengan persen yang sama.
 */
export function slipInstallmentBase(slip: PlacingSlip) {
  return roundCents(totalPremium(slip) - slipDiscountAmount(slip))
}

/** Dasar cicilan polis: premi setelah diskon. */
export function policyInstallmentBase(p: { premium: number; discountAmount?: number }) {
  return roundCents(p.premium - (p.discountAmount ?? 0))
}

/** Admin cost dan stamp duty slip yang dibayar bersama cicilan pertama (PAR + EQVET: per polis). */
export function slipInstallmentCharges(slip: PlacingSlip) {
  return roundCents(totalPayable(slip) - slipInstallmentBase(slip))
}

/** Admin cost dan stamp duty polis, dibayar bersama cicilan pertama. */
export function policyInstallmentCharges(p: { adminCost?: number; stampDuty?: number }) {
  return roundCents((p.adminCost ?? 0) + (p.stampDuty ?? 0))
}

/** Label singkat jadwal: "Sekaligus" atau "4x cicilan". */
export function installmentLabel(rows: readonly PremiumInstallment[] | undefined) {
  return rows?.length ? `${rows.length}x cicilan` : "Sekaligus"
}

/** Satu baris per cicilan untuk Audit Trail, misalnya "1. 20 Nov 2026 · 33,33%". */
export function installmentAuditLines(rows: readonly PremiumInstallment[] | undefined) {
  return (rows ?? []).map(
    (r) => `${r.no}. ${r.dueDate ? dateShort(r.dueDate) : "—"} · ${num(r.pct, 0, 4)}%`
  )
}

/** Jadwal cicilan polis dalam satu teks untuk export, misalnya "1. 20 Nov 2026: 2.500.000,00". */
export function installmentScheduleText(p: {
  premium: number
  discountAmount?: number
  adminCost?: number
  stampDuty?: number
  premiumInstallments?: readonly PremiumInstallment[]
}) {
  const rows = p.premiumInstallments ?? []
  const amounts = installmentAmounts(rows, policyInstallmentBase(p), policyInstallmentCharges(p))
  return rows
    .map((r, i) => `${r.no}. ${r.dueDate ? dateShort(r.dueDate) : "—"}: ${num(amounts[i], 2)}`)
    .join("; ")
}
