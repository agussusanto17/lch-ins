import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import { brokerageAmount, brokerageVatAdded, brokerageVatAmount } from "../lib/calc"
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

test("MV co-insurance: premi − brokerage − additional fee − PPN = net ke asuransi", () => {
  // Angka SIT-117: premi IDR 7.862.500, brokerage 15% incl. VAT, Astra Buana
  // 60% fee 12,5% termasuk PPN, Sinar Mas 40% fee 10% excl. VAT. Sejak 20 November 2026
  // PPN 2,2% fee Sinar Mas (6.919) ditambahkan dan ikut dipotong dari premi ke asuransi.
  // Sejak 22 November 2026 brokerage dan fee ditulis sebelum PPN: incl. VAT = nominal ÷ 1,022,
  // PPN di dalamnya pindah ke kolom PPN; net dan pendapatan LCH tidak berubah.
  const s = closingSummary(
    slipWith(
      "Motor Vehicle",
      7_862_500,
      [row("PT Asuransi Astra Buana", 60, 12.5, true), row("PT Asuransi Sinar Mas", 40, 10)],
      { brokeragePct: 15, includeVat: true }
    )
  )
  assert.equal(s.premium, 7_862_500)
  // 1.179.375 ÷ 1,022 = 1.153.987,28 (14,6771%); PPN di dalamnya 25.387,72.
  assert.equal(s.brokerage, 1_153_987.28)
  assert.equal(s.brokerageVat, 25_387.72)
  // Fee Astra Buana 589.687,50 incl. VAT = 576.993,64 + PPN 12.693,86; Sinar Mas 314.500 + 6.919.
  assert.equal(s.fee, 891_493.64)
  assert.equal(s.feeVat, 19_612.86)
  assert.equal(s.net, 5_772_018.5)
  assert.equal(s.income, 2_090_481.5)
  // PPN di dalam brokerage 25.387,72 + di dalam fee Astra Buana 12.693,86 + ditambahkan 6.919.
  assert.equal(s.incomeVat, 45_000.58)
  assert.deepEqual(
    s.insurers.map((r) => [r.insurer, r.premium, r.brokerage, r.fee, r.vat, r.net]),
    [
      ["PT Asuransi Astra Buana", 4_717_500, 692_392.37, 576_993.64, 27_926.49, 3_420_187.5],
      ["PT Asuransi Sinar Mas", 3_145_000, 461_594.91, 314_500, 17_074.09, 2_351_831],
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

test("brokerage 15% incl. VAT ditulis 14,6771% sebelum PPN; excl. VAT tetap 15% + PPN", () => {
  // Contoh Agus (22 November 2026): premi 91.668.000, brokerage 15%.
  const panel = [row("PT Asuransi Multi Artha Guna Tbk", 100)]
  const incl = slipWith("Motor Vehicle", 91_668_000, panel, { brokeragePct: 15, includeVat: true })
  assert.equal(brokerageAmount(incl), 13_454_207.44)
  assert.equal(brokerageVatAmount(incl), 295_992.56)
  const inclSummary = closingSummary(incl)
  assert.equal(inclSummary.brokerage, 13_454_207.44)
  assert.equal(inclSummary.brokerageVat, 295_992.56)
  // Yang dipotong dari premi tetap 15% (brokerage + PPN di dalamnya).
  assert.equal(inclSummary.net, 91_668_000 - 13_750_200)

  const excl = slipWith("Motor Vehicle", 91_668_000, panel, { brokeragePct: 15, includeVat: false })
  assert.equal(brokerageAmount(excl), 13_750_200)
  assert.equal(brokerageVatAdded(excl), 302_504.4)
  assert.equal(closingSummary(excl).net, 91_668_000 - 13_750_200 - 302_504.4)
})

test("sharing komisi LCH Singapore: dari brokerage sebelum PPN, net ke asuransi tetap", () => {
  const panel = [row("PT Asuransi Multi Artha Guna Tbk", 100)]
  const base = slipWith("Motor Vehicle", 10_000_000, panel, { brokeragePct: 15, includeVat: false })
  const shared = closingSummary({ ...base, commissionShareSgPct: 50 })
  // Brokerage 1.500.000 excl. VAT; 50% ke LCH Singapore (Agus, 22 November 2026).
  assert.equal(shared.sgShare, 750_000)
  assert.equal(shared.net, closingSummary(base).net)
  assert.equal(closingSummary(base).sgShare, 0)
})
