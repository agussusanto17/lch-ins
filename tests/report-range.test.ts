import assert from "node:assert/strict"
import test from "node:test"

import { customRange, rangeDays } from "../lib/report-range"

test("rentang tanggal bebas: satu tahun, tiga bulan, dan beberapa bulan", () => {
  assert.deepEqual(customRange("2025-01-01", "2025-12-31", "2026-11-13"), {
    start: "2025-01-01",
    end: "2025-12-31",
    label: "01 Jan 2025 s/d 31 Des 2025",
  })
  assert.equal(rangeDays(customRange("2025-01-01", "2025-12-31", "2026-11-13")), 365)
  assert.equal(rangeDays(customRange("2026-01-01", "2026-03-31", "2026-11-13")), 90)
  assert.equal(rangeDays(customRange("2025-11-01", "2026-02-28", "2026-11-13")), 120)
  assert.equal(rangeDays(customRange("2026-11-13", "2026-11-13", "2026-11-13")), 1)
})

test("isian tertukar dibalik, isian kosong memakai tanggal lain", () => {
  assert.deepEqual(
    [customRange("2026-03-31", "2026-01-01", "x").start, customRange("2026-03-31", "2026-01-01", "x").end],
    ["2026-01-01", "2026-03-31"]
  )
  const onlyFrom = customRange("2026-02-01", "", "2026-11-13")
  assert.deepEqual([onlyFrom.start, onlyFrom.end], ["2026-02-01", "2026-02-01"])
  const empty = customRange("", "", "2026-11-13")
  assert.deepEqual([empty.start, empty.end], ["2026-11-13", "2026-11-13"])
})
