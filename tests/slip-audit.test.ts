import assert from "node:assert/strict"
import test from "node:test"

import {
  addLocationPatch,
  deductibleRows,
  deductibleUnits,
  emptySlip,
  switchCob,
} from "../components/underwriting/slip-model"
import { recalcSlip } from "../lib/calc"
import type { PlacingSlip } from "../lib/data/types"
import {
  clausesText,
  deductiblesText,
  slipAuditSummary,
  type SlipClauseTitle,
} from "../lib/slip-audit"

/** Slip Property PAR + EQVET dengan deductible per cover, pola CI LCH. */
function propertySlip(): PlacingSlip {
  const slip = switchCob(emptySlip(), "Property")
  const deductibles: Record<string, string[]> = {
    FLEXAS: ["FLEXAS: Nil"],
    FWTWD: ["FWTWD: 10% of claim, minimum IDR 10.000.000"],
    "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)": ["BI: 7 days waiting period"],
  }
  return {
    ...slip,
    rateLines: slip.rateLines.map((l) => ({
      ...l,
      deductibles: deductibles[l.label] ?? [],
    })),
  }
}

/** Slip Property dua lokasi: lokasi 2 menyalin deductible lokasi 1. */
function twoLocations(): PlacingSlip {
  const slip = recalcSlip(propertySlip())
  return recalcSlip({ ...slip, ...addLocationPatch(slip) })
}

/** Ganti deductible satu cover milik satu unit. */
function setUnitDeductible(
  slip: PlacingSlip,
  unitNo: number,
  cover: string,
  deductibles: string[]
): PlacingSlip {
  const unit = deductibleUnits(slip)[unitNo - 1]
  const row = deductibleRows(slip, [], unit).find((r) => r.cover === cover)!
  return {
    ...slip,
    [row.group]: slip[row.group].map((l) =>
      l.id === row.lineId ? { ...l, deductibles } : l
    ),
  }
}

/** Isian ringkasan yang teksnya berbeda, seperti `changes` di audit trail. */
function changedFields(
  before: ReturnType<typeof slipAuditSummary>,
  after: ReturnType<typeof slipAuditSummary>
) {
  return (Object.keys(before) as (keyof typeof before)[]).filter(
    (k) => before[k] !== after[k]
  )
}

const clause = (
  section: number,
  title: string,
  groupTitle?: string
): SlipClauseTitle => ({
  section,
  title,
  groupTitle: groupTitle ?? null,
})

test("deductible satu daftar ditulis per butir tanpa judul, teks kosong dibuang", () => {
  const slip = switchCob(emptySlip(), "Liability")
  const withDeductibles: PlacingSlip = {
    ...slip,
    rateLines: slip.rateLines.map((l) => ({
      ...l,
      deductibles: [
        " IDR 25.000.000 each and every loss ",
        "",
        "Nil for bodily injury",
      ],
    })),
  }
  assert.equal(
    deductiblesText(withDeductibles),
    "- IDR 25.000.000 each and every loss\n- Nil for bodily injury"
  )
  assert.equal(deductiblesText(slip), "")
})

test("deductible Property ditulis per section, BI di Section 2", () => {
  assert.equal(
    deductiblesText(propertySlip()),
    [
      "Section 1 — Material Damage",
      "- FLEXAS: Nil",
      "- FWTWD: 10% of claim, minimum IDR 10.000.000",
      "Section 2 — Business Interruption",
      "- BI: 7 days waiting period",
    ].join("\n")
  )
})

test("deductible yang sama di semua lokasi ditulis sekali, yang berbeda per lokasi", () => {
  const shared = twoLocations()
  assert.equal(deductiblesText(shared), deductiblesText(propertySlip()))

  const perLocation = setUnitDeductible(shared, 2, "FLEXAS", [
    "FLEXAS: IDR 10.000.000 (gudang)",
  ])
  assert.equal(
    deductiblesText(perLocation),
    [
      "Location 1",
      "Section 1 — Material Damage",
      "- FLEXAS: Nil",
      "- FWTWD: 10% of claim, minimum IDR 10.000.000",
      "Section 2 — Business Interruption",
      "- BI: 7 days waiting period",
      "",
      "Location 2",
      "Section 1 — Material Damage",
      "- FLEXAS: IDR 10.000.000 (gudang)",
      "- FWTWD: 10% of claim, minimum IDR 10.000.000",
      "Section 2 — Business Interruption",
      "- BI: 7 days waiting period",
    ].join("\n")
  )
})

test("deductible per kendaraan memakai judul Vehicle", () => {
  let slip = recalcSlip({
    ...switchCob(emptySlip(), "Motor Vehicle"),
    interestItems: [
      { id: "v1", description: "Toyota Avanza", amount: 250_000_000 },
      { id: "v2", description: "Hino Dutro", amount: 600_000_000 },
    ],
  })
  slip = setUnitDeductible(slip, 1, "Comprehensive Casco", [
    "IDR 300.000 any one accident",
  ])
  slip = setUnitDeductible(slip, 2, "Comprehensive Casco", [
    "IDR 1.000.000 any one accident",
  ])
  assert.equal(
    deductiblesText(slip),
    "Vehicle 1\n- IDR 300.000 any one accident\n\nVehicle 2\n- IDR 1.000.000 any one accident"
  )
})

test("klausul slip tanpa section per kelompok, menurut urutan kemunculan", () => {
  const slip = switchCob(emptySlip(), "Liability")
  const rows = [
    clause(1, "Cancellation Clause"),
    clause(1, "72 Hours Clause ", "Extensions"),
    clause(1, "Claims Cooperation Clause", "General Conditions"),
    clause(1, "Automatic Reinstatement Clause", "Extensions"),
  ]
  assert.equal(
    clausesText(slip, rows),
    [
      "- Cancellation Clause",
      "",
      "Extensions",
      "- 72 Hours Clause",
      "- Automatic Reinstatement Clause",
      "",
      "General Conditions",
      "- Claims Cooperation Clause",
    ].join("\n")
  )
  assert.equal(clausesText(slip, []), "")
})

test("klausul slip ber-section: tanpa section dulu, lalu Section 1 dan 2", () => {
  // Urutan simpan insertSlipClauses: Section 1, tanpa section, lalu Section 2.
  const rows = [
    clause(1, "Reinstatement Value Clause"),
    clause(1, "72 Hours Clause"),
    clause(0, "Sanction Limitation and Exclusion Clause"),
    clause(2, "Accountants Clause"),
  ]
  const expected = [
    "- Sanction Limitation and Exclusion Clause",
    "",
    "Section 1 — Material Damage",
    "- Reinstatement Value Clause",
    "- 72 Hours Clause",
    "",
    "Section 2 — Business Interruption",
    "- Accountants Clause",
  ].join("\n")
  assert.equal(clausesText(propertySlip(), rows), expected)
  // Urutan baris dari database (sort_order saja) tidak mengubah teksnya.
  const fromDb = [rows[2], rows[0], rows[3], rows[1]]
  assert.equal(clausesText(propertySlip(), fromDb), expected)

  const car = { ...switchCob(emptySlip(), "Engineering"), usesSections: true }
  assert.equal(
    clausesText(car, [
      clause(1, "Maintenance Visits Clause"),
      clause(2, "Cross Liability Clause"),
    ]),
    [
      "Section 1 — Material Damage",
      "- Maintenance Visits Clause",
      "",
      "Section 2 — Third Party Liability",
      "- Cross Liability Clause",
    ].join("\n")
  )
})

test("total sum insured dan premi memakai mata uang slip", () => {
  const property: PlacingSlip = {
    ...propertySlip(),
    sumInsuredSection1: [
      { id: "m1", description: "Building", amount: 1_000_000_000 },
      { id: "m2", description: "Stock", amount: 250_000_000 },
    ],
    sumInsuredSection2: [
      { id: "b1", description: "Gross Profit", amount: 500_000_000 },
    ],
  }
  const priced: PlacingSlip = {
    ...property,
    rateLines: property.rateLines.map((l, i) => ({
      ...l,
      premium: i === 0 ? 1_250_000 : i === 1 ? 300_000.5 : 0,
    })),
  }
  const summary = slipAuditSummary(priced, [])
  assert.equal(summary.totalSumInsured, "IDR 1.750.000.000")
  assert.equal(summary.totalPremium, "IDR 1.550.000,50")

  // COB lain: objek "limit saja" tidak ikut TSI; premi TPL dan PA ikut.
  const liability: PlacingSlip = {
    ...switchCob(emptySlip(), "Liability"),
    currency: "USD",
    interestItems: [
      { id: "o1", description: "Public Liability", amount: 100_000 },
      {
        id: "o2",
        description: "Limit any one occurrence",
        amount: 50_000,
        limitOnly: true,
      },
    ],
    rateLines: [
      { id: "r1", label: "Rate (%)", rate: 1, premium: 1_000, vehicleId: "o1" },
    ],
    tplLines: [
      {
        id: "t1",
        label: "Third Party Liability",
        rate: 1,
        premium: 250,
        basis: "25000",
      },
    ],
  }
  const usd = slipAuditSummary(liability, [])
  assert.equal(usd.totalSumInsured, "USD 100.000,00")
  assert.equal(usd.totalPremium, "USD 1.250,00")
})

test("ringkasan slip yang tidak berubah sama persis, jadi tidak tercatat", () => {
  const saved = setUnitDeductible(twoLocations(), 2, "FLEXAS", [
    "FLEXAS: IDR 10.000.000",
  ])
  const clauses = [clause(0, "Sanction Clause"), clause(1, "72 Hours Clause")]
  // Input form: spasi di tepi dan isian deductible kosong dibuang saat disimpan.
  const input: PlacingSlip = {
    ...saved,
    specialConditions: "  Warranted fire extinguishers in good order.\n",
    rateLines: saved.rateLines.map((l) => ({
      ...l,
      deductibles: [...(l.deductibles ?? []).map((t) => ` ${t} `), ""],
    })),
  }
  const before = slipAuditSummary(
    {
      ...saved,
      specialConditions: "Warranted fire extinguishers in good order.",
    },
    clauses
  )
  assert.deepEqual(changedFields(before, slipAuditSummary(input, clauses)), [])
})

test("hanya isian yang teksnya berubah yang berbeda", () => {
  const saved = twoLocations()
  const clauses = [clause(1, "72 Hours Clause")]
  const before = slipAuditSummary(saved, clauses)

  const deductible = setUnitDeductible(saved, 2, "FWTWD", ["FWTWD: Nil"])
  assert.deepEqual(
    changedFields(before, slipAuditSummary(deductible, clauses)),
    ["deductibles"]
  )

  const special = { ...saved, specialConditions: "Warranted CCTV 24 hours." }
  const moreClauses = [...clauses, clause(0, "Sanction Clause")]
  assert.deepEqual(
    changedFields(before, slipAuditSummary(special, moreClauses)),
    ["specialConditions", "clauses"]
  )
})
