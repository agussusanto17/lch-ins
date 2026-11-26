import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip } from "../components/underwriting/slip-model"
import { recalcSlip } from "../lib/calc"
import type { PlacingSlip } from "../lib/data/types"
import {
  fromHmInstallments,
  hullInstallmentBreakdown,
  hullInstallmentParts,
  hullSchedulePatch,
  toHmInstallments,
} from "../lib/hull-installments"
import { emptyVessel, type Vessel } from "../lib/marine-hull"
import { cleanInstallments, installmentAmounts } from "../lib/premium-installments"

/** Jadwal PT PATRIA MARITIME_BULK CARRIER - FINALISED: premi H&M, IV, War sama dengan sheet. */
function patriaSlip(extra: Partial<PlacingSlip> = {}, ivWarInAdvance = true): PlacingSlip {
  const rows: [number, number, number][] = [
    [158_339_797_559.2, 39_584_949_389.8, 197_924_746_949],
    [222_303_452_560, 55_575_863_140, 277_879_315_700],
    [233_047_841_181.6, 58_261_960_295.4, 291_309_801_477],
    [205_063_760_072, 51_265_940_018, 256_329_700_090],
  ]
  const vessels: Vessel[] = rows.map(([hm, iv, war], i) => ({
    ...emptyVessel(`v${i + 1}`),
    name: `PATRIA NAWASENA ${i + 1}`,
    type: "BULK CARRIER",
    hmValue: hm,
    hmRate: 0.585,
    ivValue: iv,
    ivRate: 0.1,
    warValue: war,
    warRate: 0.01,
  }))
  return recalcSlip({
    ...emptySlip(),
    cob: "Marine Hull",
    hullSchedule: { format: "patria", vessels, ivWarInAdvance },
    ...extra,
  })
}

const quarterly = [
  { no: 1, dueDate: "2025-12-22", pct: 25 },
  { no: 2, dueDate: "2026-03-22", pct: 25 },
  { no: 3, dueDate: "2026-06-22", pct: 25 },
  { no: 4, dueDate: "2026-09-22", pct: 25 },
]

test("H&M per kuartal, IV & War di cicilan 1: rincian per section dan nominal polis sama", () => {
  const base = patriaSlip()
  const parts = hullInstallmentParts(base)!
  assert.deepEqual(parts.net, { hm: 4_789_715_880.53, iv: 204_688_712.85, war: 102_344_356.42 })
  // Editor mengisi 25% H&M per kuartal; yang disimpan persen dari premi total.
  const stored = cleanInstallments(fromHmInstallments(quarterly, parts))
  const slip = { ...base, premiumInstallments: stored }
  const rows = hullInstallmentBreakdown(slip)
  assert.deepEqual(
    rows.map((r) => [r.no, r.hm, r.iv, r.war, r.total]),
    [
      [1, 1_197_428_970.13, 204_688_712.85, 102_344_356.42, 1_504_462_039.4],
      [2, 1_197_428_970.13, 0, 0, 1_197_428_970.13],
      [3, 1_197_428_970.13, 0, 0, 1_197_428_970.13],
      [4, 1_197_428_970.14, 0, 0, 1_197_428_970.14],
    ]
  )
  // Polis dan report membagi premi total dengan persen tersimpan: nominalnya sama sampai sen.
  assert.deepEqual(
    installmentAmounts(stored, parts.total),
    rows.map((r) => r.total)
  )
  // Bolak-balik ke persen H&M tetap 25% per kuartal.
  for (const r of toHmInstallments(stored, parts)) assert.ok(Math.abs(r.pct - 25) < 1e-6)
})

test("tanpa pola IV & War di muka: semua section dibagi persen yang sama", () => {
  const slip = { ...patriaSlip({}, false), premiumInstallments: quarterly }
  const [first, , , last] = hullInstallmentBreakdown(slip)
  assert.equal(first.hm, 1_197_428_970.13)
  assert.equal(first.iv, 51_172_178.21)
  // 102.344.356,42 ÷ 4 = 25.586.089,105 → ,11; cicilan terakhir menampung sisa pembulatan.
  assert.equal(first.war, 25_586_089.11)
  assert.equal(last.war, 25_586_089.09)
})

test("diskon dibagi sesuai porsi premi, admin dan stamp duty masuk cicilan 1", () => {
  const base = patriaSlip({ discountPct: 10, adminCost: 50_000, stampDuty: 10_000 })
  const parts = hullInstallmentParts(base)!
  assert.equal(parts.total, 4_587_074_054.82)
  assert.equal(parts.net.hm + parts.net.iv + parts.net.war, parts.total)
  assert.equal(parts.charges, 60_000)
  const slip = { ...base, premiumInstallments: cleanInstallments(fromHmInstallments(quarterly, parts)) }
  const [first, second] = hullInstallmentBreakdown(slip)
  assert.equal(first.charges, 60_000)
  assert.equal(second.charges, 0)
  assert.equal(first.iv, parts.net.iv)
  assert.equal(second.iv, 0)
})

test("nilai kapal diubah setelah cicilan diisi: H&M tetap 25% per kuartal", () => {
  const base = patriaSlip()
  const slip = {
    ...base,
    premiumInstallments: cleanInstallments(fromHmInstallments(quarterly, hullInstallmentParts(base)!)),
  }
  const schedule = slip.hullSchedule!
  const changed = {
    ...schedule,
    vessels: schedule.vessels.map((v, i) => (i === 0 ? { ...v, ivValue: 80_000_000_000, warRate: 0.02 } : v)),
  }
  const next = recalcSlip({ ...slip, ...hullSchedulePatch(slip, changed) })
  const parts = hullInstallmentParts(next)!
  for (const r of toHmInstallments(next.premiumInstallments, parts)) assert.ok(Math.abs(r.pct - 25) < 1e-6)
  const [first, second] = hullInstallmentBreakdown(next)
  assert.equal(first.iv, parts.net.iv)
  assert.equal(first.war, parts.net.war)
  assert.equal(second.iv, 0)
  // Tanpa pola IV & War di muka, persen cicilan tidak diubah.
  const plain = { ...slip, hullSchedule: { ...schedule, ivWarInAdvance: false } }
  assert.deepEqual(Object.keys(hullSchedulePatch(plain, changed)), ["hullSchedule"])
})
