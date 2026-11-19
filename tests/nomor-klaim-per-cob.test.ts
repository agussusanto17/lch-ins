import assert from "node:assert/strict"
import test from "node:test"

import {
  counterKey,
  counterPeriod,
  formatDocumentNumber,
} from "../server/services/number-generator"

const CLAIM_PATTERN = "CLM-LCH{seq:3}/{COVER}/{MMROMAN}/{YYYY}"

test("counter klaim per kode COB di nomornya, counter lain tetap per periode", () => {
  const period = counterPeriod("monthly", { year: 2026, month: 11 })
  assert.equal(counterKey(period, { coverCode: "MV", perCover: true }), "2026-11/MV")
  assert.equal(counterKey(period, { coverCode: " PAR ", perCover: true }), "2026-11/PAR")
  // Klaim tanpa kode cover dan dokumen lain (misalnya Placing Slip) memakai counter periode.
  assert.equal(counterKey(period, { coverCode: null, perCover: true }), "2026-11")
  assert.equal(counterKey(period, { coverCode: "PAR" }), "2026-11")
  assert.equal(counterKey(counterPeriod("yearly", { year: 2026, month: 11 }), { coverCode: "MV", perCover: true }), "2026/MV")
})

test("nomor klaim tiap COB mulai dari 001", () => {
  const at = { year: 2026, month: 11 }
  assert.equal(
    formatDocumentNumber(CLAIM_PATTERN, { seq: 1, ...at, coverCode: "MV" }),
    "CLM-LCH001/MV/XI/2026"
  )
  assert.equal(
    formatDocumentNumber(CLAIM_PATTERN, { seq: 2, ...at, coverCode: "MV" }),
    "CLM-LCH002/MV/XI/2026"
  )
  assert.equal(
    formatDocumentNumber(CLAIM_PATTERN, { seq: 1, ...at, coverCode: "PAR" }),
    "CLM-LCH001/PAR/XI/2026"
  )
})
