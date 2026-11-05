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

const cargo = { cobName: "MARINE CARGO", coverTypeName: null, sourceGroup: "Cargo" }
const engineering = { cobName: "ENGINEERING", coverTypeName: null, sourceGroup: "MB" }

test("general Cargo clauses are hidden on a Cash In Transit slip", () => {
  assert.equal(clauseFitsSlip(cargo, "MARINE CARGO", ["Cash In Transit"]), false)
  assert.equal(clauseFitsSlip(cit, "MARINE CARGO", ["Cash In Transit"]), true)
})

test("general Cargo clauses still show on other Marine Cargo slips", () => {
  assert.equal(clauseFitsSlip(cargo, "MARINE CARGO", ["Marine Cargo Open Cover"]), true)
  assert.equal(clauseFitsSlip(cargo, "MARINE CARGO", ["Cash In Transit", "Marine Cargo"]), true)
  assert.equal(clauseFitsSlip(cargo, "MARINE CARGO", []), true)
})

test("Engineering clauses without a type of cover fit every Engineering slip", () => {
  for (const cover of [
    "Contractors All Risk",
    "Erection All Risk",
    "Machinery Breakdown Insurance",
    "Electronic Equipment Insurance",
  ]) {
    assert.equal(clauseFitsSlip(engineering, "ENGINEERING", [cover]), true)
  }
})

const hull = { cobName: "MARINE HULL", coverTypeName: "Marine Hull" }
const HULL_COVERS = ["Marine Hull", "Marine Hull Single Voyage", "Marine Builder Risk"]

test("klausul satu type of cover tidak bocor ke type of cover yang namanya mirip", () => {
  assert.equal(clauseFitsSlip(hull, "MARINE HULL", ["Marine Hull"], HULL_COVERS), true)
  assert.equal(
    clauseFitsSlip(hull, "MARINE HULL", ["Marine Hull Single Voyage"], HULL_COVERS),
    false
  )
  const singleVoyage = { cobName: "MARINE HULL", coverTypeName: "Marine Hull Single Voyage" }
  assert.equal(clauseFitsSlip(singleVoyage, "MARINE HULL", ["Marine Hull"], HULL_COVERS), false)
})

test("slip lama dengan nama type of cover di luar master tetap cocok sebagian", () => {
  const marineCargo = { cobName: "MARINE CARGO", coverTypeName: "Marine Cargo" }
  const known = ["Marine Cargo", "Marine Cargo Open Cover", "Cash In Transit"]
  assert.equal(
    clauseFitsSlip(marineCargo, "MARINE CARGO", ["Marine Cargo — Institute Cargo Clauses (A)"], known),
    true
  )
  assert.equal(clauseFitsSlip(marineCargo, "MARINE CARGO", ["Marine Cargo Open Cover"], known), false)
})
