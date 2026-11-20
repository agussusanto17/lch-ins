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

test("MV co-insurance: premi − brokerage − additional fee − PPN excl. VAT = net ke asuransi", () => {
  // Angka SIT-117: premi IDR 7.862.500, brokerage 15% incl. VAT, Astra Buana
  // 60% fee 12,5% termasuk PPN, Sinar Mas 40% fee 10% excl. VAT. Sejak 20 November 2026
  // PPN 2,2% fee Sinar Mas (6.919) ditambahkan dan ikut dipotong dari premi ke asuransi.
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
  assert.equal(s.brokerageVat, 0)
  assert.equal(s.feeVat, 6_919)
  assert.equal(s.net, 5_772_018.5)
  assert.equal(s.income, 2_090_481.5)
  // PPN di dalam brokerage 25.387,72 + di dalam fee Astra Buana 12.693,86 + ditambahkan 6.919.
  assert.equal(s.incomeVat, 45_000.58)
  assert.deepEqual(
    s.insurers.map((r) => [r.insurer, r.premium, r.brokerage, r.fee, r.vat, r.net]),
    [
      ["PT Asuransi Astra Buana", 4_717_500, 707_625, 589_687.5, 0, 3_420_187.5],
      ["PT Asuransi Sinar Mas", 3_145_000, 471_750, 314_500, 6_919, 2_351_831],
    ]
  )
})

test("COB tanpa additional fee: net = premi − brokerage − PPN excl. VAT, tanpa rincian untuk satu asuransi", () => {
  const s = closingSummary(
    slipWith("General Accident", 2_500_000, [row("PT Asuransi Chubb Syariah Indonesia", 100, 15)], {
      brokeragePct: 20,
      includeVat: false,
    })
  )
  assert.equal(s.fee, 0)
  // Brokerage 20% excl. VAT: 500.000 + PPN 2,2% 11.000.
  assert.equal(s.brokerageVat, 11_000)
  assert.equal(s.net, 1_989_000)
  assert.equal(s.income, 511_000)
  assert.equal(s.incomeVat, 11_000)
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
  const sum = (key: "premium" | "brokerage" | "fee" | "vat" | "net") =>
    Math.round(s.insurers.reduce((acc, r) => acc + r[key], 0) * 100) / 100
  assert.equal(sum("premium"), s.premium)
  assert.equal(sum("brokerage"), s.brokerage)
  assert.equal(sum("fee"), s.fee)
  // Fee A dan B excl. VAT: PPN-nya ditambahkan, dan rinciannya tetap sama dengan total.
  assert.ok(s.feeVat > 0)
  assert.equal(sum("vat"), Math.round((s.brokerageVat + s.feeVat) * 100) / 100)
  assert.equal(sum("net"), s.net)
})
