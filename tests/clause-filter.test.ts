import assert from "node:assert/strict"
import test from "node:test"

import { clauseFitsSlip, isEarthquakeCover } from "../lib/clause-filter"

const eqvet = { cobName: "PROPERTY", coverTypeName: "PSAGBI" }
const par = { cobName: "PROPERTY", coverTypeName: null }
const cit = { cobName: "MARINE CARGO", coverTypeName: "Cash In Transit" }

const COMBINED =
  "PROPERTY ALL RISKS AND/OR BUSINESS INTERRUPTION + EARTHQUAKE, VOLCANIC ERUPTION AND TSUNAMI INSURANCE."

test("isEarthquakeCover recognises PSAGBI, combined, and legacy EQVET names", () => {
  assert.equal(isEarthquakeCover("PSAGBI"), true)
  assert.equal(isEarthquakeCover(COMBINED), true)
  assert.equal(isEarthquakeCover("PAR + EQVET"), true)
  assert.equal(isEarthquakeCover("Property All Risk"), false)
  assert.equal(isEarthquakeCover("Industrial All Risk"), false)
})

test("EQVET clauses are hidden on a Property All Risk slip without earthquake", () => {
  assert.equal(clauseFitsSlip(eqvet, "PROPERTY", ["Property All Risk"]), false)
  assert.equal(clauseFitsSlip(par, "PROPERTY", ["Property All Risk"]), true)
})

test("EQVET clauses show when the slip has an earthquake type of cover", () => {
  assert.equal(
    clauseFitsSlip(eqvet, "PROPERTY", ["Property All Risk", "PSAGBI"]),
    true
  )
  assert.equal(clauseFitsSlip(eqvet, "PROPERTY", [COMBINED]), true)
  assert.equal(clauseFitsSlip(eqvet, "PROPERTY", ["PAR + EQVET"]), true)
})

test("cover-specific clauses keep the COB filter and exact cover match", () => {
  assert.equal(clauseFitsSlip(eqvet, "MOTOR VEHICLE", ["PSAGBI"]), false)
  assert.equal(clauseFitsSlip(cit, "MARINE CARGO", ["Cash In Transit"]), true)
  assert.equal(clauseFitsSlip(cit, "MARINE CARGO", ["Cargo"]), false)
})

test("a slip without a type of cover yet shows every clause of its COB", () => {
  assert.equal(clauseFitsSlip(eqvet, "PROPERTY", []), true)
})
