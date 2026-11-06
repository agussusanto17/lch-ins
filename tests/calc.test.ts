import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateParEqvet,
  recalcSlip,
  totalPayable,
  totalPremium,
  totalSumInsured,
} from "../lib/calc"
import {
  addLocationPatch,
  deductibleRows,
  emptySlip,
  locationRowsPatch,
  rateLinesWithBounds,
  removeLocationPatch,
  switchCob,
  updateLocationPatch,
  itemRowsPatch,
  sectionItemsPatch,
  slipOccupationText,
  slipSectionTitles,
  slipPeriodRow,
  nextPeriodLabel,
  releaseIssues,
  exclusionItems,
  locationIssues,
} from "../components/underwriting/slip-model"
import type { PlacingSlip, RateLine } from "../lib/data/types"
import {
  locationGroups,
  locationsShareRates,
  slipRiskLocationText,
} from "../lib/slip-locations"
import {
  addItemCover,
  coverNameIssues,
  itemGroups,
  missingRateIssue,
  removeItemCover,
} from "../lib/slip-items"

/** Slip Property dengan rate FLEXAS 0,5‰ dan Section 1 IDR 1 miliar. */
function propertySlip(section2: number): PlacingSlip {
  const base = emptySlip()
  return recalcSlip({
    ...base,
    indemnityPeriod: "12 months",
    sumInsuredSection1: [
      { id: "m1", description: "Building", amount: 1_000_000_000 },
    ],
    sumInsuredSection2: section2
      ? [{ id: "b1", description: "Gross Profit", amount: section2 }]
      : [],
    rateLines: base.rateLines.map((l) =>
      l.label === "FLEXAS" ? { ...l, rate: 0.5 } : l
    ),
  })
}

const biPar = (slip: PlacingSlip) =>
  slip.rateLines.find((l) => l.label.startsWith("BI PAR"))

test("slip tanpa Section 2 tidak punya rate dan premi BI", () => {
  const slip = propertySlip(0)
  assert.equal(biPar(slip)?.rate, null)
  assert.equal(totalPremium(slip), 500_000)

  // Dokumen dan Total Payable dulu memakai Section 1 untuk baris BI, sehingga
  // premi PAR menjadi dua kali lipat.
  const calc = calculateParEqvet(slip)
  assert.equal(calc.par.subtotal, 500_000)
  assert.equal(totalPayable(slip), 500_000)
})

test("rate BI dihitung dari Section 2 bila ada", () => {
  const slip = propertySlip(200_000_000)
  assert.equal(biPar(slip)?.rate, 0.5)
  assert.equal(biPar(slip)?.premium, 100_000)
  assert.equal(calculateParEqvet(slip).par.subtotal, 600_000)
  assert.equal(totalPayable(slip), 600_000)
})

test("rate BI lama tanpa Section 2 tidak dicetak", () => {
  // Rate BI yang tersimpan sebelum perbaikan, dari slip tanpa Section 2.
  const saved = propertySlip(0)
  const stale: PlacingSlip = {
    ...saved,
    rateLines: saved.rateLines.map((l) =>
      l.label.startsWith("BI PAR") ? { ...l, rate: 0.5, premium: 0 } : l
    ),
  }
  const line = calculateParEqvet(stale).par.lines.find((l) =>
    l.label.startsWith("BI PAR")
  )
  assert.equal(line?.ratePercent, null)
  assert.equal(line?.ratePermil, null)
  assert.equal(line?.rateText, "—")
  assert.equal(line?.premium, 0)
  assert.equal(totalPayable(stale), 500_000)
})

/** Slip contoh usulan multi lokasi: Ruko dan Gudang di Makassar. */
function twoLocationSlip(): PlacingSlip {
  const apply = (s: PlacingSlip, patch: Partial<PlacingSlip>) =>
    recalcSlip({ ...s, ...patch })
  let slip = recalcSlip({
    ...emptySlip(),
    indemnityPeriod: "12 months",
    discountPct: 10,
    adminCost: 30_000,
    stampDuty: 20_000,
  })
  const setRates = (no: number, rates: Record<string, number>) => {
    const group = locationGroups(slip)[no - 1]
    slip = apply(
      slip,
      locationRowsPatch(
        slip,
        "rateLines",
        group.location.id,
        group.rateLines.map((l) => ({ ...l, rate: rates[l.label] ?? l.rate }))
      )
    )
  }
  const first = slip.locations![0].id
  slip = apply(
    slip,
    updateLocationPatch(slip, first, { riskLocation: "Jl. Contoh Raya No. 1, Makassar" })
  )
  slip = apply(
    slip,
    locationRowsPatch(slip, "sumInsuredSection1", first, [
      { id: "m1", description: "Building & Contents", amount: 10_200_000_000 },
    ])
  )
  setRates(1, { FLEXAS: 0.368, FWTWD: 0.45, RSMDCC: 0.01, "Other Losses": 0.01, EQVET: 1.2 })
  slip = apply(slip, addLocationPatch(slip))
  const second = slip.locations![1].id
  slip = apply(
    slip,
    updateLocationPatch(slip, second, { riskLocation: "Jl. Contoh Raya No. 2,\nMakassar" })
  )
  slip = apply(
    slip,
    locationRowsPatch(slip, "sumInsuredSection1", second, [
      { id: "m2", description: "Building & Stock", amount: 1_800_000_000 },
    ])
  )
  setRates(2, { FLEXAS: 1.127, FWTWD: 0.45, RSMDCC: 0.01, "Other Losses": 0.01, EQVET: 1.2 })
  return slip
}

test("premi slip multi lokasi dihitung per lokasi, sama dengan contoh usulan", () => {
  const slip = twoLocationSlip()
  const calc = calculateParEqvet(slip)
  assert.equal(calc.par.subtotal, 11_422_200)
  assert.equal(calc.eqvet.subtotal, 14_400_000)
  assert.equal(calc.grandTotal, 23_339_980)
  assert.equal(totalPayable(slip), 23_339_980)
  // FLEXAS lokasi 2 memakai sum insured lokasi 2 saja.
  const flexas2 = calc.par.lines.find((l) => l.label === "FLEXAS" && l.locationNo === 2)
  assert.equal(flexas2?.basis, 1_800_000_000)
  assert.equal(flexas2?.premium, 2_028_600)
})

test("isian slip mengikuti lokasi, dan hitung ulang tidak mengubah apa pun", () => {
  const slip = twoLocationSlip()
  assert.equal(
    slip.riskLocation,
    "1. Jl. Contoh Raya No. 1, Makassar\n2. Jl. Contoh Raya No. 2, Makassar"
  )
  assert.equal(JSON.stringify(recalcSlip(slip)), JSON.stringify(slip))
})

test("rate BI dihitung per lokasi, hanya untuk lokasi dengan Section 2", () => {
  let slip = twoLocationSlip()
  const second = slip.locations![1].id
  slip = recalcSlip({
    ...slip,
    ...locationRowsPatch(slip, "sumInsuredSection2", second, [
      { id: "b2", description: "Gross Profit", amount: 500_000_000 },
    ]),
  })
  const [one, two] = locationGroups(slip)
  const biPar = (lines: RateLine[]) => lines.find((l) => l.label.startsWith("BI PAR"))
  assert.equal(biPar(one.rateLines)?.rate, null)
  // 1,127 + 0,45 + 0,01 + 0,01 = 1,597‰ dari baris lokasi 2 sendiri.
  assert.equal(biPar(two.rateLines)?.rate, 1.597)
  assert.equal(biPar(two.rateLines)?.premium, 798_500)
})

test("hapus lokasi pertama memindahkan deductible ke lokasi berikutnya", () => {
  let slip = twoLocationSlip()
  const first = locationGroups(slip)[0]
  slip = recalcSlip({
    ...slip,
    rateLines: slip.rateLines.map((l) =>
      l.id === first.rateLines[0].id ? { ...l, deductibles: ["Nil (for Location 1)"] } : l
    ),
  })
  slip = recalcSlip({ ...slip, ...removeLocationPatch(slip, first.location.id) })
  assert.equal(slip.locations?.length, 1)
  assert.equal(slip.riskLocation, "Jl. Contoh Raya No. 2,\nMakassar")
  assert.deepEqual(
    deductibleRows(slip).find((r) => r.cover === "FLEXAS")?.deductibles,
    ["Nil (for Location 1)"]
  )
})

test("slip tanpa daftar lokasi menjadi satu lokasi dari isian slip", () => {
  const legacy: PlacingSlip = {
    ...propertySlip(0),
    locations: undefined,
    riskLocation: "Jakarta",
    occupation: "2971 - Ruko",
  }
  const slip = recalcSlip(legacy)
  assert.equal(slip.locations?.length, 1)
  assert.equal(slip.locations?.[0].riskLocation, "Jakarta")
  assert.ok(slip.rateLines.every((l) => l.locationId === slip.locations?.[0].id))
  assert.equal(slipRiskLocationText(slip.locations ?? []), "Jakarta")
})

/** Slip contoh usulan multi kendaraan: Avanza dan Hino Dutro di Makassar. */
function twoVehicleSlip(): PlacingSlip {
  let slip = switchCob(emptySlip(), "Motor Vehicle")
  slip = recalcSlip({
    ...slip,
    interestItems: [
      { id: "v1", description: "Toyota Avanza 1.5 G MPV", amount: 250_000_000, licensePlate: "DD 1234 AB" },
      { id: "v2", description: "Hino Dutro 130 HD", amount: 600_000_000, licensePlate: "DD 8765 XY" },
    ],
  })
  const casco = (rate: number): Record<string, number> => ({
    "Comprehensive Casco": rate,
    "Flood, Windstorm, Tempest & Water Damage": 0.075,
    "Earthquake, Volcanic Eruption & Tsunami": 0.075,
    "Strike, Riot, Civil Commotion": 0.05,
    "Terrorism & Sabotage": 0.05,
  })
  const set = (vehicleId: string, rates: Record<string, number>, tpl: [number, number][], pa: [number, number][]) => {
    const g = itemGroups(slip).find((x) => x.item.id === vehicleId)!
    slip = recalcSlip({ ...slip, ...itemRowsPatch(slip, "rateLines", vehicleId, g.rateLines.map((l) => ({ ...l, rate: rates[l.label] ?? null }))) })
    slip = recalcSlip({ ...slip, ...itemRowsPatch(slip, "tplLines", vehicleId, tpl.map(([limit, rate], i) => ({ id: `${vehicleId}-tpl${i}`, label: "Third Party Liability", basis: String(limit), rate, premium: 0 }))) })
    slip = recalcSlip({ ...slip, ...itemRowsPatch(slip, "paLines", vehicleId, g.paLines.map((l, i) => ({ ...l, basis: String(pa[i][0]), rate: pa[i][1] }))) })
  }
  set("v1", casco(1.79), [[25_000_000, 1]], [[5_000_000, 0.5], [20_000_000, 0.1]])
  set("v2", casco(2.23), [[25_000_000, 1], [25_000_000, 0.5]], [[5_000_000, 0.5], [10_000_000, 0.1]])
  return slip
}

test("premi slip multi kendaraan dihitung per kendaraan, sama dengan contoh usulan", () => {
  const slip = twoVehicleSlip()
  const [one, two] = itemGroups(slip)
  const premium = (g: (typeof one)) =>
    [...g.rateLines, ...g.tplLines, ...g.paLines].reduce((a, l) => a + l.premium, 0)
  assert.equal(premium(one), 5_395_000)
  assert.equal(premium(two), 15_290_000)
  assert.equal(totalPremium(slip), 20_685_000)
  assert.equal(
    two.rateLines.find((l) => l.label === "Comprehensive Casco")?.premium,
    13_380_000
  )
  assert.equal(JSON.stringify(recalcSlip(slip)), JSON.stringify(slip))
})

test("kendaraan baru mendapat baris rate, TPL, dan PA sendiri", () => {
  const slip = twoVehicleSlip()
  const added = recalcSlip({
    ...slip,
    interestItems: [...slip.interestItems, { id: "v3", description: "", amount: 100_000_000 }],
  })
  const three = itemGroups(added)[2]
  assert.equal(three.rateLines.length, 8)
  assert.equal(three.tplLines.length, 2)
  assert.deepEqual(three.paLines.map((l) => l.label), ["Driver", "Passenger"])
  assert.equal(totalPremium(added), totalPremium(slip))
  assert.equal(JSON.stringify(recalcSlip(added)), JSON.stringify(added))
})

test("hapus kendaraan pertama membuang barisnya dan memindahkan deductible", () => {
  let slip = twoVehicleSlip()
  const casco = itemGroups(slip)[0].rateLines[0]
  slip = recalcSlip({
    ...slip,
    rateLines: slip.rateLines.map((l) =>
      l.id === casco.id ? { ...l, deductibles: ["IDR 500.000 any one accident"] } : l
    ),
  })
  slip = recalcSlip({ ...slip, interestItems: slip.interestItems.slice(1) })
  assert.equal(slip.rateLines.length, 8)
  assert.equal(totalPremium(slip), 15_290_000)
  assert.deepEqual(deductibleRows(slip)[0].deductibles, ["IDR 500.000 any one accident"])
})

test("baris slip lama tanpa kendaraan ikut kendaraan pertama", () => {
  const base = switchCob(emptySlip(), "Motor Vehicle")
  const legacy: PlacingSlip = {
    ...base,
    interestItems: [{ id: "lama", description: "Avanza", amount: 200_000_000 }],
    rateLines: base.rateLines.map((l, i) => ({ ...l, vehicleId: null, rate: i === 0 ? 2 : null })),
    tplLines: base.tplLines.map((l) => ({ ...l, vehicleId: undefined })),
  }
  const slip = recalcSlip(legacy)
  assert.ok([...slip.rateLines, ...slip.tplLines, ...slip.paLines].every((l) => l.vehicleId === "lama"))
  assert.equal(slip.rateLines[0].premium, 4_000_000)
})

test("Loading Rate Comprehensive tidak memakai batas casco OJK", () => {
  const slip = twoVehicleSlip()
  const lines = rateLinesWithBounds(slip)
  const casco = lines.find((l) => l.label === "Comprehensive Casco")
  const loading = lines.find((l) => l.label === "Loading Rate Comprehensive")
  assert.ok(casco?.min != null)
  assert.equal(loading?.min ?? null, null)
  assert.equal(loading?.max ?? null, null)
})

/** Slip contoh CI Money Insurance LCH: CIT dan CIS dengan rate berbeda. */
function moneySlip(): PlacingSlip {
  let slip = switchCob(emptySlip(), "Miscellaneous")
  slip = recalcSlip({
    ...slip,
    interestItems: [
      { id: "cit", description: "Money in Transit", amount: 1_200_000_000 },
      { id: "cis", description: "Money in Premises", amount: 250_000_000 },
    ],
  })
  const setRate = (itemId: string, rate: number) => {
    const g = itemGroups(slip).find((x) => x.item.id === itemId)!
    slip = recalcSlip({
      ...slip,
      ...itemRowsPatch(slip, "rateLines", itemId, g.rateLines.map((l) => ({ ...l, rate }))),
    })
  }
  setRate("cit", 0.025)
  setRate("cis", 0.25)
  return slip
}

test("premi COB lain dihitung per objek, sama dengan CI Money Insurance LCH", () => {
  const slip = moneySlip()
  const [cit, cis] = itemGroups(slip)
  assert.equal(cit.rateLines[0].premium, 300_000)
  assert.equal(cis.rateLines[0].premium, 625_000)
  assert.equal(totalPremium(slip), 925_000)
  // Deductible per cover tetap satu daftar, di objek pertama.
  assert.equal(deductibleRows(slip).length, 1)
  assert.equal(JSON.stringify(recalcSlip(slip)), JSON.stringify(slip))
})

test("objek baru di COB lain mendapat satu baris rate kosong sendiri", () => {
  const slip = moneySlip()
  const added = recalcSlip({
    ...slip,
    interestItems: [
      ...slip.interestItems,
      { id: "baru", description: "Money in Safe Deposit", amount: 100_000_000 },
    ],
  })
  assert.deepEqual(
    itemGroups(added)[2].rateLines.map((l) => [l.label, l.rate]),
    [["Rate (%)", null]]
  )
  assert.equal(totalPremium(added), 925_000)
})

test("rate COB lain dari slip lama ikut objek pertama", () => {
  const base = switchCob(emptySlip(), "Engineering")
  const slip = recalcSlip({
    ...base,
    interestItems: [{ id: "mesin", description: "Boiler", amount: 1_000_000_000 }],
    rateLines: base.rateLines.map((l) => ({ ...l, vehicleId: null, rate: 0.2 })),
  })
  assert.equal(slip.rateLines.length, 1)
  assert.equal(slip.rateLines[0].vehicleId, "mesin")
  assert.equal(slip.rateLines[0].premium, 2_000_000)
})

test("rate semua lokasi sama terdeteksi, beda satu rate tidak", () => {
  const slip = twoLocationSlip()
  // Contoh usulan: FLEXAS lokasi 1 0,368 dan lokasi 2 1,127.
  assert.equal(locationsShareRates(slip), false)
  const second = locationGroups(slip)[1]
  const same = recalcSlip({
    ...slip,
    ...locationRowsPatch(
      slip,
      "rateLines",
      second.location.id,
      second.rateLines.map((l) => ({ ...l, rate: l.label === "FLEXAS" ? 0.368 : l.rate }))
    ),
  })
  assert.equal(locationsShareRates(same), true)
})

/** Slip PL Habco: limit IDR 10 M dengan premi flat IDR 10 jt (contoh CI LCH). */
function flatLiabilitySlip(): PlacingSlip {
  let slip = switchCob(emptySlip(), "Liability")
  slip = recalcSlip({
    ...slip,
    interestItems: [{ id: "lol", description: "Limit of Liability", amount: 10_000_000_000 }],
  })
  const g = itemGroups(slip)[0]
  return recalcSlip({
    ...slip,
    ...itemRowsPatch(slip, "rateLines", "lol", g.rateLines.map((l) => ({ ...l, flatPremium: true, rate: 0.5, premium: 10_000_000 }))),
  })
}

test("premi flat dipakai apa adanya, rate dikosongkan", () => {
  const slip = flatLiabilitySlip()
  const line = itemGroups(slip)[0].rateLines[0]
  assert.equal(line.flatPremium, true)
  assert.equal(line.rate, null)
  assert.equal(line.premium, 10_000_000)
  assert.equal(totalPremium(slip), 10_000_000)
  assert.equal(missingRateIssue(slip), null)
  assert.equal(JSON.stringify(recalcSlip(slip)), JSON.stringify(slip))
})

test("premi flat diabaikan di Motor Vehicle, dan slip tanpa premi ditolak", () => {
  const motor = switchCob(emptySlip(), "Motor Vehicle")
  const flagged = recalcSlip({
    ...motor,
    rateLines: motor.rateLines.map((l) => ({ ...l, flatPremium: true, premium: 5_000_000 })),
  })
  assert.equal(totalPremium(flagged), 0)
  assert.equal(missingRateIssue(flagged), "Isi minimal satu rate.")
  const empty = recalcSlip({ ...switchCob(emptySlip(), "Liability") })
  assert.equal(missingRateIssue(empty), "Isi minimal satu rate atau premi flat.")
})

test("objek limit saja tidak ikut TSI dan premi (CIT: carrying tahunan dan limit per carrying)", () => {
  let slip = switchCob(emptySlip(), "Marine Cargo")
  slip = recalcSlip({
    ...slip,
    interestItems: [
      { id: "tahunan", description: "Estimated annual carrying", amount: 1_000_000_000 },
      { id: "limit", description: "Limit any one carrying", amount: 250_000_000, limitOnly: true },
    ],
  })
  slip = recalcSlip({ ...slip, rateLines: slip.rateLines.map((l) => ({ ...l, rate: 0.025 })) })
  const [tahunan, limit] = itemGroups(slip)
  assert.equal(totalSumInsured(slip), 1_000_000_000)
  assert.equal(tahunan.rateLines[0].premium, 250_000)
  assert.equal(limit.rateLines[0].premium, 0)
  assert.equal(limit.rateLines[0].rate, null)
  assert.equal(totalPremium(slip), 250_000)
})

test("limit saja diabaikan di Motor Vehicle", () => {
  const motor = switchCob(emptySlip(), "Motor Vehicle")
  const slip = recalcSlip({
    ...motor,
    interestItems: [{ id: "truk", description: "Truk", amount: 350_000_000, limitOnly: true }],
  })
  assert.equal(totalSumInsured(slip), 350_000_000)
})

test("okupasi tanpa kode OJK dicetak apa adanya, dengan kode tetap berkode", () => {
  assert.equal(slipOccupationText({ occupationLabel: " Office " }), "Office")
  assert.equal(slipOccupationText({}), "")
  assert.equal(
    slipOccupationText({ occupation: "2975 - Apartments", occupationLabel: "Apartment" }),
    "2975 - Apartment"
  )
})

/** Slip CAR SPIL: contract works 2,5 M di Section 1, limit TPL 250 jt di Section 2. */
function carSlip(): PlacingSlip {
  let slip = recalcSlip({ ...switchCob(emptySlip(), "Engineering"), usesSections: true })
  slip = recalcSlip({
    ...slip,
    ...sectionItemsPatch(slip, 1, [{ id: "cw", description: "Contract works", amount: 2_500_000_000 }]),
  })
  slip = recalcSlip({
    ...slip,
    ...sectionItemsPatch(slip, 2, [{ id: "tpl", description: "Third Party Liability", amount: 250_000_000 }]),
  })
  return recalcSlip({ ...slip, rateLines: slip.rateLines.map((l) => ({ ...l, rate: 0.15 })) })
}

test("slip CAR ber-section: TPL Section 2 jadi limit, premi dari Section 1 saja", () => {
  const slip = carSlip()
  assert.deepEqual(slip.interestItems.map((i) => [i.id, i.section ?? 1, i.limitOnly === true]), [
    ["cw", 1, false],
    ["tpl", 2, true],
  ])
  assert.equal(totalSumInsured(slip), 2_500_000_000)
  assert.equal(totalPremium(slip), 3_750_000)
})

test("deductible slip ber-section satu daftar per section", () => {
  const slip = carSlip()
  const rows = deductibleRows(slip)
  assert.deepEqual(rows.map((r) => r.cover), [
    "Section 1 — Material Damage",
    "Section 2 — Third Party Liability",
  ])
  const [cw, tpl] = itemGroups(slip)
  assert.equal(rows[0].lineId, cw.rateLines[0].id)
  assert.equal(rows[1].lineId, tpl.rateLines[0].id)
})

test("judul section hanya untuk Property dan slip ber-section COB objek", () => {
  assert.equal(slipSectionTitles({ cob: "Property" })?.[1], "Section 2 — Business Interruption")
  assert.equal(slipSectionTitles({ cob: "Engineering" }), null)
  assert.equal(slipSectionTitles({ cob: "Engineering", usesSections: true })?.[1], "Section 2 — Third Party Liability")
  assert.equal(slipSectionTitles({ cob: "Motor Vehicle", usesSections: true }), null)
})

/** CI single shipment CV Unggul Utama Jaya: USD 32.400, ICC "A" 0,07% dan War 0,50%. */
function shipmentSlip(): PlacingSlip {
  let slip = recalcSlip({
    ...switchCob(emptySlip(), "Marine Cargo"),
    currency: "USD",
    interestItems: [{ id: "briket", description: "Coconut briquette", amount: 32_400 }],
  })
  slip = recalcSlip({ ...slip, rateLines: addItemCover(slip, "briket") })
  const [icc, war] = itemGroups(slip)[0].rateLines
  return recalcSlip({
    ...slip,
    rateLines: slip.rateLines.map((l) =>
      l.id === icc.id
        ? { ...l, label: 'ICC "A"', rate: 0.07 }
        : l.id === war.id
          ? { ...l, label: "War Risks", rate: 0.5 }
          : l
    ),
  })
}

test("dua cover per objek: premi tiap cover dijumlah (single shipment ICC A + War)", () => {
  const slip = shipmentSlip()
  const lines = itemGroups(slip)[0].rateLines
  assert.deepEqual(
    lines.map((l) => [l.label, l.premium]),
    [
      ['ICC "A"', 22.68],
      ["War Risks", 162],
    ]
  )
  assert.equal(totalPremium(slip), 184.68)
  assert.equal(totalSumInsured(slip), 32_400)
  assert.deepEqual(coverNameIssues(slip), [])
  assert.equal(JSON.stringify(recalcSlip(slip)), JSON.stringify(slip))
})

test("cover tambahan tanpa nama ditolak saat release, cover pertama boleh tanpa nama", () => {
  let slip = recalcSlip({
    ...switchCob(emptySlip(), "Marine Cargo"),
    interestItems: [{ id: "a", description: "Cargo", amount: 1_000 }],
  })
  slip = recalcSlip({ ...slip, rateLines: addItemCover(slip, "a") })
  assert.deepEqual(coverNameIssues(slip), ["Isi nama cover tambahan objek 1."])
  const [first, extra] = itemGroups(slip)[0].rateLines
  assert.equal(first.label, "Rate (%)")
  const named = { ...slip, rateLines: slip.rateLines.map((l) => (l.id === extra.id ? { ...l, label: "War" } : l)) }
  assert.deepEqual(coverNameIssues(named), [])
  // Motor Vehicle tidak memakai cover tambahan.
  assert.deepEqual(coverNameIssues(switchCob(emptySlip(), "Motor Vehicle")), [])
})

test("hapus cover: deductible pindah ke cover yang tersisa, cover terakhir tidak bisa dihapus", () => {
  const slip = shipmentSlip()
  const [icc, war] = itemGroups(slip)[0].rateLines
  const withDeductible = {
    ...slip,
    rateLines: slip.rateLines.map((l) =>
      l.id === icc.id ? { ...l, deductibles: ["0.5% of TSI any one container"] } : l
    ),
  }
  const removed = removeItemCover(withDeductible, icc.id)
  assert.deepEqual(removed.map((l) => [l.id, l.deductibles]), [[war.id, ["0.5% of TSI any one container"]]])
  assert.deepEqual(removeItemCover({ ...slip, rateLines: removed }, war.id), removed)
})

test("objek baru ikut cover objek pertama, objek limit saja cukup satu baris", () => {
  const slip = shipmentSlip()
  const next = recalcSlip({
    ...slip,
    interestItems: [
      ...slip.interestItems,
      { id: "kedua", description: "Kontainer kedua", amount: 10_000 },
      { id: "batas", description: "Limit any one conveyance", amount: 50_000, limitOnly: true },
    ],
  })
  const [, kedua, batas] = itemGroups(next)
  assert.deepEqual(kedua.rateLines.map((l) => l.label), ['ICC "A"', "War Risks"])
  assert.deepEqual(batas.rateLines.map((l) => l.label), ["Rate (%)"])
  assert.equal(new Set(next.rateLines.map((l) => l.id)).size, next.rateLines.length)
})

test("baris periode: label, satu tanggal, TBA, dan teks pengganti tanggal", () => {
  const base = {
    periodTba: false,
    inceptionDate: "2026-07-29",
    expiryDate: "2027-07-29",
    periodNote: "Both days at 12 o'clock noon local time.",
  }
  assert.deepEqual(slipPeriodRow(base), [
    "Period of Insurance",
    "29 July 2026 to 29 July 2027\nBoth days at 12 o'clock noon local time.",
  ])
  // Hole in One: satu hari turnamen, label dari type of cover.
  assert.deepEqual(
    slipPeriodRow({ ...base, expiryDate: "2026-07-29", periodNote: "", periodLabel: "Date of Tournament" }),
    ["Date of Tournament", "29 July 2026"]
  )
  assert.deepEqual(slipPeriodRow({ ...base, periodTba: true }), ["Period of Insurance", "To Be Advised"])
  // Single shipment: teks ETD menggantikan tanggal dan keterangannya.
  assert.deepEqual(
    slipPeriodRow({
      ...base,
      periodLabel: " Estimated Time of Departure (ETD) ",
      periodText: "23rd / 24th / 25th October 2026 until final destination.",
    }),
    ["Estimated Time of Departure (ETD)", "23rd / 24th / 25th October 2026 until final destination."]
  )
  // Proyek T.B.A: teks dipakai juga saat Period TBA.
  assert.deepEqual(
    slipPeriodRow({ ...base, periodTba: true, periodText: "The whole period from T.B.A." }),
    ["Period of Insurance", "The whole period from T.B.A."]
  )
})

test("label periode ikut type of cover baru, kecuali yang diketik sendiri", () => {
  assert.equal(nextPeriodLabel(undefined, null, "Date of Tournament"), "Date of Tournament")
  assert.equal(nextPeriodLabel("Date of Tournament", "Date of Tournament", null), undefined)
  assert.equal(
    nextPeriodLabel("Date of Tournament", "Date of Tournament", "Estimated Time of Departure (ETD)"),
    "Estimated Time of Departure (ETD)"
  )
  assert.equal(nextPeriodLabel("Date of Event", "Date of Tournament", null), "Date of Event")
})

test("release menerima periode satu hari, menolak expiry sebelum inception", () => {
  const slip = { ...switchCob(emptySlip(), "Miscellaneous"), inceptionDate: "2026-07-29" }
  const sameDay = releaseIssues({ ...slip, expiryDate: "2026-07-29" })
  assert.ok(!sameDay.some((i) => i.startsWith("Expiry date")))
  const before = releaseIssues({ ...slip, expiryDate: "2026-07-28" })
  assert.ok(before.includes("Expiry date tidak boleh sebelum inception date."))
})

test("exclusions: nomor diketik sendiri dipisah dari teks, kalimat penutup apa adanya", () => {
  const items = exclusionItems(
    "a) Workers Compensation Risks\n\n  b)   Professional liability \n1. Exclude Bailee Liability.\n(iv) Nuclear radiation\n- Exclude Product Liability.\nAnd other exclusion as may be agreed by the company"
  )
  assert.deepEqual(items, [
    { marker: "a)", text: "Workers Compensation Risks" },
    { marker: "b)", text: "Professional liability" },
    { marker: "1.", text: "Exclude Bailee Liability." },
    { marker: "(iv)", text: "Nuclear radiation" },
    { marker: "-", text: "Exclude Product Liability." },
    { marker: null, text: "And other exclusion as may be agreed by the company" },
  ])
  assert.deepEqual(exclusionItems(undefined), [])
  assert.deepEqual(exclusionItems("No. 5 of the policy"), [{ marker: null, text: "No. 5 of the policy" }])
})

test("kelas konstruksi wajib hanya bila ada rate FLEXAS atau EQVET (Terrorism & Sabotage boleh kosong)", () => {
  // Slip Property dengan rate di Other Losses saja, seperti CI Terrorism & Sabotage Habco.
  const base = propertySlip(0)
  const ts = recalcSlip({
    ...base,
    occupation: "2975 - Apartments",
    constructionClass: undefined,
    riskLocation: "Wisma Habco",
    locations: undefined,
    rateLines: base.rateLines.map((l) => ({ ...l, rate: l.label === "Other Losses" ? 0.05 : null })),
  })
  assert.ok(!locationIssues(ts).some((i) => i.startsWith("Pilih kelas konstruksi")))
  // Rate FLEXAS diisi: kelas konstruksi wajib lagi.
  const par = recalcSlip({
    ...ts,
    rateLines: ts.rateLines.map((l) => (l.label === "FLEXAS" ? { ...l, rate: 0.5 } : l)),
  })
  assert.ok(locationIssues(par).includes("Pilih kelas konstruksi."))
})
