import assert from "node:assert/strict"
import test from "node:test"

import { BRANCH_SOURCE_CODES, branchSourceId, type SourceOption } from "../lib/form-options"

const SOURCES: SourceOption[] = [
  { id: "src-id", code: "LCH-ID", name: "PT. LCH Insurance Brokers" },
  { id: "src-sg", code: "LCH-SG", name: "LCH Insurance Brokers Pte Ltd" },
  { id: "src-direct", code: "DIRECT", name: "Direct Client / Nasabah Langsung" },
]

test("cabang klien menjadi Source awal placing slip", () => {
  assert.equal(branchSourceId("Jakarta", SOURCES), "src-id")
  assert.equal(branchSourceId("Singapore", SOURCES), "src-sg")
})

test("tanpa cabang atau Source nonaktif berarti tanpa isian awal", () => {
  assert.equal(branchSourceId(null, SOURCES), null)
  assert.equal(branchSourceId(undefined, SOURCES), null)
  assert.equal(branchSourceId("Singapore", SOURCES.slice(0, 1)), null)
})

test("setiap cabang punya Source", () => {
  assert.deepEqual(Object.keys(BRANCH_SOURCE_CODES).sort(), ["Jakarta", "Singapore"])
})
