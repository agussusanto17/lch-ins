import assert from "node:assert/strict"
import test from "node:test"

import {
  cleanPaBenefitLimits,
  effectivePaBenefitLimits,
  paBenefitLimitAmount,
  paClaimWarnings,
} from "../lib/pa-benefits"
import { participantPidText, participantsInterestItem } from "../lib/slip-participants"

test("limit manfaat: bawaan contoh LCH, isian slip menimpa, isian rusak dibuang", () => {
  assert.deepEqual(effectivePaBenefitLimits(null), { death: 100, disability: 100, medical: 10 })
  assert.deepEqual(effectivePaBenefitLimits({ medical: 20 }), { death: 100, disability: 100, medical: 20 })
  assert.deepEqual(cleanPaBenefitLimits({ medical: -1, death: "abc", funeral: 5, " ": 3, x: null }), { funeral: 5 })
  assert.deepEqual(cleanPaBenefitLimits([1, 2]), {})
  assert.equal(paBenefitLimitAmount(100_000_000, 10), 10_000_000)
  assert.equal(paBenefitLimitAmount(150_000, 12.5), 18_750)
})

test("peringatan klaim PA: melebihi UP, melebihi limit manfaat, atau aman", () => {
  const ctx = { sumInsured: 100_000_000, limitPct: 10, benefitName: "Biaya Medis" }
  const claim = (claimedAmount: number, paidAmount = 0) => ({
    estimatedLoss: 0,
    claimedAmount,
    paidAmount,
    currency: "IDR",
  })
  assert.deepEqual(paClaimWarnings(claim(10_000_000), ctx), [])
  const [overLimit] = paClaimWarnings(claim(12_000_000), ctx)
  assert.match(overLimit, /^Nilai diajukan IDR 12\.000\.000 melebihi limit Biaya Medis \(10% × UP IDR 100\.000\.000 = IDR 10\.000\.000\)\.$/)
  const [overUp] = paClaimWarnings(claim(150_000_000), { ...ctx, limitPct: 100, benefitName: "Meninggal Dunia" })
  assert.match(overUp, /melebihi UP peserta IDR 100\.000\.000/)
  // Setiap nilai diperiksa sendiri; tanpa limit hanya UP yang dicek.
  assert.equal(paClaimWarnings(claim(12_000_000, 11_000_000), ctx).length, 2)
  assert.deepEqual(paClaimWarnings(claim(50_000_000), { ...ctx, limitPct: null }), [])
  assert.deepEqual(paClaimWarnings(claim(50_000_000), { ...ctx, sumInsured: 0 }), [])
})

test("peserta tunggal: baris PID dan Interest Sum Insured (per PID)", () => {
  const p = { id: "1", name: "Govind", idNumber: "P1234567", birthDate: "1980-02-01", position: "Chief Engineer", sumInsured: 150_000 }
  assert.equal(
    participantPidText(p),
    "Name : Govind\nID / Passport No. : P1234567\nDate of Birth : 01/02/1980\nOccupation : Chief Engineer"
  )
  assert.equal(participantPidText({ id: "2", name: "Budi", sumInsured: 1 }), "Name : Budi")
  assert.equal(participantsInterestItem([p]).description, "Sum Insured (per PID)")
  assert.equal(participantsInterestItem([p, { ...p, id: "2" }]).description, "2 participants as attached")
})
