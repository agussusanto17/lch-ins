import assert from "node:assert/strict"
import test from "node:test"

import {
  LCH_LETTERHEAD_FROM,
  LETTERHEAD_COMPANY,
  documentDatesForStatus,
  letterheadFor,
  slipDocumentDate,
} from "../lib/document-dates"

test("letterhead switches to PT. LCH from 1 September 2025", () => {
  assert.equal(LCH_LETTERHEAD_FROM, "2025-09-01")
  assert.equal(letterheadFor("2024-03-15"), "lestari")
  assert.equal(letterheadFor("2025-08-31"), "lestari")
  assert.equal(letterheadFor("2025-09-01"), "lch")
  assert.equal(letterheadFor("2026-11-10"), "lch")
  assert.equal(LETTERHEAD_COMPANY.lestari, "PT. Lestari Cipta Hokindo")
  assert.equal(LETTERHEAD_COMPANY.lch, "PT. LCH Insurance Brokers")
})

test("each document prints its own date", () => {
  const slip = {
    releaseDate: "2025-08-04",
    quotedDate: "2025-08-11",
    closingDate: "2025-09-02",
    updatedAt: "2026-11-10T03:00:00.000Z",
  }
  assert.equal(slipDocumentDate(slip, "placing"), "2025-08-04")
  assert.equal(slipDocumentDate(slip, "quotation"), "2025-08-11")
  assert.equal(slipDocumentDate(slip, "coverNote"), "2025-08-11")
  assert.equal(slipDocumentDate(slip, "closing"), "2025-09-02")
})

test("a document without its date falls back to the last save, in WIB", () => {
  // 18.30 UTC on 9 November is already 10 November in Jakarta.
  const slip = { updatedAt: "2026-11-09T18:30:00.000Z" }
  assert.equal(slipDocumentDate(slip, "placing"), "2026-11-10")
  assert.equal(slipDocumentDate({ ...slip, quotedDate: null }, "quotation"), "2026-11-10")
})

test("status changes fill only the empty dates they reach", () => {
  const today = "2026-11-10"
  assert.deepEqual(documentDatesForStatus({}, "Draft", "Released", today), {
    releaseDate: today,
  })
  assert.deepEqual(
    documentDatesForStatus({ releaseDate: "2026-11-02" }, "Released", "Quoted", today),
    { quotedDate: today }
  )
  // Closing straight from Released also gives the quotation documents a date.
  assert.deepEqual(documentDatesForStatus({}, "Released", "Closed", today), {
    quotedDate: today,
    closingDate: today,
  })
  assert.deepEqual(
    documentDatesForStatus({ quotedDate: "2026-11-05" }, "Quoted", "Closed", today),
    { closingDate: today }
  )
})

test("manual dates and unchanged statuses are left alone", () => {
  const today = "2026-11-10"
  // A back-dated slip keeps the dates typed in before release.
  assert.deepEqual(
    documentDatesForStatus({ releaseDate: "2025-07-21" }, "Draft", "Released", today),
    {}
  )
  // Saving a revision of a Closed slip does not move its dates.
  assert.deepEqual(documentDatesForStatus({}, "Closed", "Closed", today), {})
  assert.deepEqual(documentDatesForStatus({}, "Quoted", "Cancelled", today), {})
  assert.deepEqual(documentDatesForStatus({}, "Released", "Draft", today), {})
})
