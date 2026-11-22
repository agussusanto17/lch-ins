import assert from "node:assert/strict"
import test from "node:test"

import { recalcSlip } from "../lib/calc"
import type { PlacingSlip } from "../lib/data/types"
import { changedSlipFields, policyFieldsFromSlip } from "../lib/policy-from-slip"
import {
  cleanInstallments,
  defaultInstallments,
  equalInstallmentPcts,
  installmentAmounts,
  installmentAuditLines,
  installmentLabel,
  installmentScheduleText,
  installmentsError,
  policyInstallmentBase,
  slipInstallmentBase,
} from "../lib/premium-installments"
import { emptySlip, switchCob } from "../components/underwriting/slip-model"

/** Premi installment 2 sampai 10 kali (Agus, 20 November 2026). */

test("persen rata dua desimal, sisanya di cicilan terakhir", () => {
  assert.deepEqual(equalInstallmentPcts(2), [50, 50])
  assert.deepEqual(equalInstallmentPcts(3), [33.33, 33.33, 33.34])
  assert.deepEqual(equalInstallmentPcts(4), [25, 25, 25, 25])
  assert.deepEqual(equalInstallmentPcts(6), [16.66, 16.66, 16.66, 16.66, 16.66, 16.7])
  assert.deepEqual(equalInstallmentPcts(10), Array(10).fill(10))
})

test("jadwal bawaan berjarak sama dalam periode polis", () => {
  // 4x setahun: tiap 3 bulan; tanggal 31 jatuh ke akhir bulan pendek.
  assert.deepEqual(
    defaultInstallments(4, "2026-01-31", "2027-01-31").map((r) => [r.no, r.dueDate, r.pct]),
    [
      [1, "2026-01-31", 25],
      [2, "2026-04-30", 25],
      [3, "2026-07-31", 25],
      [4, "2026-10-31", 25],
    ]
  )
  // 10x setahun: tiap bulan.
  assert.deepEqual(
    defaultInstallments(10, "2026-11-20", "2027-11-20").map((r) => r.dueDate),
    [
      "2026-11-20", "2026-12-20", "2027-01-20", "2027-02-20", "2027-03-20",
      "2027-04-20", "2027-05-20", "2027-06-20", "2027-07-20", "2027-08-20",
    ]
  )
  // Tanpa tanggal mulai: jatuh tempo diisi sendiri.
  assert.deepEqual(
    defaultInstallments(2, null, null).map((r) => r.dueDate),
    [null, null]
  )
})

test("jadwal dari form dan JSON dibersihkan", () => {
  assert.deepEqual(
    cleanInstallments([
      { no: 7, pct: "40", dueDate: "2026-12-01" },
      { pct: 60.123456, dueDate: "01/02/2027" },
    ]),
    [
      { no: 1, dueDate: "2026-12-01", pct: 40 },
      { no: 2, dueDate: null, pct: 60.1235 },
    ]
  )
  // Satu baris atau bukan daftar berarti sekaligus.
  assert.deepEqual(cleanInstallments([{ pct: 100, dueDate: "2026-12-01" }]), [])
  assert.deepEqual(cleanInstallments(null), [])
  assert.equal(cleanInstallments(defaultInstallments(10).concat(defaultInstallments(2))).length, 10)
})

test("jadwal valid: 2 sampai 10 kali, persen 100%, jatuh tempo urut", () => {
  const valid = defaultInstallments(4, "2026-11-20", "2027-11-20")
  assert.equal(installmentsError(valid), null)
  assert.equal(installmentsError([]), null)
  assert.equal(
    installmentsError(valid.map((r) => (r.no === 4 ? { ...r, pct: 20 } : r))),
    "Jumlah persen cicilan harus 100%, sekarang 95%."
  )
  assert.equal(
    installmentsError(valid.map((r) => (r.no === 2 ? { ...r, pct: 0 } : r))),
    "Persen cicilan ke-2 harus lebih dari 0."
  )
  assert.equal(
    installmentsError(valid.map((r) => (r.no === 3 ? { ...r, dueDate: null } : r))),
    "Isi jatuh tempo cicilan ke-3."
  )
  assert.equal(
    installmentsError(valid.map((r) => (r.no === 3 ? { ...r, dueDate: "2026-12-01" } : r))),
    "Jatuh tempo cicilan ke-3 tidak boleh sebelum cicilan ke-2."
  )
  assert.equal(
    installmentsError(defaultInstallments(10).concat(defaultInstallments(2))),
    "Jumlah cicilan 2 sampai 10 kali."
  )
})

test("nominal cicilan dibulatkan ke sen, sisa pembulatan di cicilan terakhir", () => {
  const rows = defaultInstallments(3, "2026-11-20", "2027-11-20")
  assert.deepEqual(installmentAmounts(rows, 1_000_000), [333_300, 333_300, 333_400])
  const amounts = installmentAmounts(rows, 100_000.01)
  assert.deepEqual(amounts, [33_330, 33_330, 33_340.01])
  assert.equal(Math.round(amounts.reduce((a, b) => a + b, 0) * 100) / 100, 100_000.01)
  assert.equal(installmentLabel(rows), "3x cicilan")
  assert.equal(installmentLabel([]), "Sekaligus")
  assert.deepEqual(installmentAuditLines(rows.slice(0, 1)), ["1. 20 Nov 2026 · 33,33%"])
})

/** Slip Liability satu objek: premi 10.000.000, diskon 10%, admin cost 50.000. */
function liabilitySlip(patch: Partial<PlacingSlip> = {}): PlacingSlip {
  return recalcSlip({
    ...switchCob(emptySlip(), "Liability"),
    inceptionDate: "2026-11-20",
    expiryDate: "2027-11-20",
    interestItems: [{ id: "o1", description: "Limit", amount: 1_000_000_000 }],
    rateLines: [{ id: "o1-r1", label: "Rate (%)", rate: 1, premium: 0, vehicleId: "o1" }],
    discountPct: 10,
    adminCost: 50_000,
    premiumInstallments: defaultInstallments(4, "2026-11-20", "2027-11-20"),
    ...patch,
  })
}

test("dasar cicilan: premi setelah diskon, tanpa admin cost dan stamp duty", () => {
  const slip = liabilitySlip()
  assert.equal(slipInstallmentBase(slip), 9_000_000)
  assert.equal(policyInstallmentBase({ premium: 10_000_000, discountAmount: 1_000_000 }), 9_000_000)
  assert.equal(policyInstallmentBase({ premium: 10_000_000 }), 10_000_000)
})

test("jadwal ikut ke polis dari slip; open cover tetap sekaligus", () => {
  const slip = liabilitySlip()
  const fields = policyFieldsFromSlip(slip, null)
  assert.deepEqual(fields.premiumInstallments, slip.premiumInstallments)
  assert.equal(fields.premium, 10_000_000)
  assert.equal(fields.discountAmount, 1_000_000)
  // Admin cost dan stamp duty slip ikut ke polis dan masuk cicilan pertama (Agus, 22 November 2026).
  assert.equal((fields.adminCost ?? 0) + (fields.stampDuty ?? 0), 50_000)
  assert.equal(
    installmentScheduleText(fields),
    "1. 20 Nov 2026: 2.300.000,00; 2. 20 Feb 2027: 2.250.000,00; 3. 20 Mei 2027: 2.250.000,00; 4. 20 Agu 2027: 2.250.000,00"
  )

  const openCover = policyFieldsFromSlip(liabilitySlip({ openCover: true }), null)
  assert.deepEqual(openCover.premiumInstallments, [])
  assert.deepEqual([openCover.adminCost, openCover.stampDuty], [0, 0])

  // Revisi slip setelah CI terbit ikut mengubah jadwal di polis bernomor sementara.
  const revised = liabilitySlip({ premiumInstallments: defaultInstallments(2, "2026-11-20", "2027-11-20") })
  const changes = changedSlipFields(fields, policyFieldsFromSlip(revised, null))
  assert.deepEqual(Object.keys(changes), ["premiumInstallments"])
  assert.equal(changes.premiumInstallments?.length, 2)
})

test("admin cost dan stamp duty masuk cicilan pertama", () => {
  const rows = defaultInstallments(4, "2026-11-20", "2027-11-20")
  // Premi setelah diskon 9.000.000, admin cost + stamp duty 50.000 (Agus, 22 November 2026).
  const amounts = installmentAmounts(rows, 9_000_000, 50_000)
  assert.deepEqual(amounts, [2_300_000, 2_250_000, 2_250_000, 2_250_000])
  assert.equal(
    amounts.reduce((sum, a) => sum + a, 0),
    9_050_000
  )
  assert.deepEqual(installmentAmounts(rows, 9_000_000), [2_250_000, 2_250_000, 2_250_000, 2_250_000])
})
