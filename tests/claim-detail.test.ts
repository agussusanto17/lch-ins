import assert from "node:assert/strict"
import test from "node:test"

import {
  claimInsurerPortions,
  documentReceiptLocked,
  isCoInsurance,
} from "../lib/claim-detail"

test("bagian nilai dibayar mengikuti share, leader lebih dulu", () => {
  const rows = claimInsurerPortions(350_000_000, [
    { insurer: "PT Member", sharePct: 60, leader: false },
    { insurer: "PT Leader", sharePct: 40, leader: true },
  ])
  assert.deepEqual(
    rows.map((r) => [r.insurer, r.amount]),
    [
      ["PT Leader", 140_000_000],
      ["PT Member", 210_000_000],
    ]
  )
})

test("asuransi terakhir menampung selisih pembulatan", () => {
  const rows = claimInsurerPortions(100, [
    { insurer: "A", sharePct: 33.333333, leader: true },
    { insurer: "B", sharePct: 33.333333, leader: false },
    { insurer: "C", sharePct: 33.333334, leader: false },
  ])
  assert.deepEqual(
    rows.map((r) => r.amount),
    [33.33, 33.33, 33.34]
  )
  assert.equal(
    rows.reduce((sum, r) => sum + r.amount, 0),
    100
  )
})

test("co-insurance hanya bila dua asuransi atau lebih punya share", () => {
  assert.equal(isCoInsurance(undefined), false)
  assert.equal(isCoInsurance([{ insurer: "A", sharePct: 100, leader: true }]), false)
  assert.equal(
    isCoInsurance([
      { insurer: "A", sharePct: 100, leader: true },
      { insurer: "B", sharePct: 0, leader: false },
    ]),
    false
  )
  assert.equal(
    isCoInsurance([
      { insurer: "A", sharePct: 70, leader: true },
      { insurer: "B", sharePct: 30, leader: false },
    ]),
    true
  )
})

test("centang diterima terkunci hanya bila dokumen sudah punya file", () => {
  assert.equal(documentReceiptLocked({ isReceived: true, filePath: "claims/a.pdf" }), true)
  assert.equal(documentReceiptLocked({ isReceived: true, filePath: null }), false)
  assert.equal(documentReceiptLocked({ isReceived: false, filePath: null }), false)
})
