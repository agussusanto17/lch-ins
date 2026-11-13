import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import { closingSummary } from "../lib/closing-summary"
import type { PlacingSlip, SecurityPanelRow } from "../lib/data/types"

/** Slip dengan satu baris premi; ringkasan tidak menghitung ulang rate. */
function slipWith(
  cob: PlacingSlip["cob"],
  premium: number,
  panel: SecurityPanelRow[],
  extra: Partial<PlacingSlip> = {}
): PlacingSlip {
  const base = switchCob(emptySlip(), cob)
  return {
    ...base,
    rateLines: [{ id: "r1", label: "Rate", rate: null, premium }],
    tplLines: [],
    paLines: [],
    securityPanel: panel,
    ...extra,
  }
}

const row = (
  insurer: string,
  share: number,
  additionalFeePct = 0,
  additionalFeeIncludeVat = false
): SecurityPanelRow => ({
  id: insurer,
  insurer,
  share,
  role: share >= 50 ? "As Leader" : "As Member",
  additionalFeePct,
  additionalFeeIncludeVat,
})

test("MV co-insurance: premi − brokerage − additional fee = net ke asuransi; brokerage + fee = pendapatan LCH", () => {
  // Angka SIT-117: premi IDR 7.862.500, brokerage 15% incl. VAT, Astra Buana
  // 60% fee 12,5% termasuk PPN, Sinar Mas 40% fee 10%.
  const s = closingSummary(
    slipWith(
      "Motor Vehicle",
      7_862_500,
      [row("PT Asuransi Astra Buana", 60, 12.5, true), row("PT Asuransi Sinar Mas", 40, 10)],
      { brokeragePct: 15, includeVat: true }
    )
  )
  assert.equal(s.premium, 7_862_500)
  assert.equal(s.brokerage, 1_179_375)
  assert.equal(s.fee, 904_187.5)
  assert.equal(s.net, 5_778_937.5)
  assert.equal(s.income, 2_083_562.5)
  // PPN brokerage 25.387,72 + PPN fee Astra Buana 12.693,86.
  assert.equal(s.incomeVat, 38_081.58)
  assert.deepEqual(
    s.insurers.map((r) => [r.insurer, r.premium, r.brokerage, r.fee, r.net]),
    [
      ["PT Asuransi Astra Buana", 4_717_500, 707_625, 589_687.5, 3_420_187.5],
      ["PT Asuransi Sinar Mas", 3_145_000, 471_750, 314_500, 2_358_750],
    ]
  )
})

test("COB tanpa additional fee: net = premi − brokerage, tanpa rincian untuk satu asuransi", () => {
  const s = closingSummary(
    slipWith("General Accident", 2_500_000, [row("PT Asuransi Chubb Syariah Indonesia", 100, 15)], {
      brokeragePct: 20,
      includeVat: false,
    })
  )
  assert.equal(s.fee, 0)
  assert.equal(s.net, 2_000_000)
  assert.equal(s.income, 500_000)
  assert.equal(s.incomeVat, 0)
  assert.deepEqual(s.insurers, [])
})

test("rincian per asuransi selalu sama dengan total walau ada pembulatan", () => {
  const s = closingSummary(
    slipWith(
      "Property",
      1_000_000.01,
      [row("A", 33.33, 7.5), row("B", 33.33, 7.5), row("C", 33.34, 5, true)],
      { brokeragePct: 12.5, includeVat: true }
    )
  )
  const sum = (key: "premium" | "brokerage" | "fee" | "net") =>
    Math.round(s.insurers.reduce((acc, r) => acc + r[key], 0) * 100) / 100
  assert.equal(sum("premium"), s.premium)
  assert.equal(sum("brokerage"), s.brokerage)
  assert.equal(sum("fee"), s.fee)
  assert.equal(sum("net"), s.net)
})
