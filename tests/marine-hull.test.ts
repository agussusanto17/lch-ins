import assert from "node:assert/strict"
import test from "node:test"

import {
  emptyVessel,
  hullSectionPremium,
  hullTotals,
  premiumChangePct,
  vesselPremium,
  vesselSummaryText,
  type Vessel,
} from "../lib/marine-hull"

/** Jadwal PT PATRIA MARITIME_BULK CARRIER - FINALISED (Harry, 26 November 2026). */
function patria(): Vessel[] {
  const rows: [string, string, number, number, number][] = [
    ["PATRIA NAWASENA 1", "2008", 158_339_797_559.2, 39_584_949_389.8, 197_924_746_949],
    ["PATRIA NAWASENA 2", "2011", 222_303_452_560, 55_575_863_140, 277_879_315_700],
    ["PATRIA NAWASENA 3", "2010", 233_047_841_181.6, 58_261_960_295.4, 291_309_801_477],
    ["PATRIA NAWASENA 4", "2010", 205_063_760_072, 51_265_940_018, 256_329_700_090],
  ]
  return rows.map(([name, built, hm, iv, war], i) => ({
    ...emptyVessel(`v${i + 1}`),
    name,
    type: "BULK CARRIER",
    built,
    hmValue: hm,
    hmRate: 0.585,
    ivValue: iv,
    ivRate: 0.1,
    warValue: war,
    warRate: 0.01,
  }))
}

test("premi per kapal per section sama dengan sheet Patria", () => {
  const [first] = patria()
  assert.equal(hullSectionPremium(first, "hm"), 926_287_815.72)
  assert.equal(hullSectionPremium(first, "iv"), 39_584_949.39)
  assert.equal(hullSectionPremium(first, "war"), 19_792_474.69)
  assert.equal(vesselPremium(first), 985_665_239.8)
})

test("total jadwal Patria: nilai dan premi per section", () => {
  const t = hullTotals(patria())
  assert.equal(t.hmValue, 818_754_851_372.8)
  assert.equal(t.hmPremium, 4_789_715_880.53)
  assert.equal(t.ivValue, 204_688_712_843.2)
  assert.equal(t.ivPremium, 204_688_712.85)
  assert.equal(t.warValue, 1_023_443_564_216)
  assert.equal(t.warPremium, 102_344_356.42)
  assert.equal(t.premium, 5_096_748_949.8)
})

test("format MHL: IV + AOI satu rate, nilai tahun lalu untuk perbandingan", () => {
  // PRATIWI SATU, jadwal Salam Pacific 2022.
  const vessel: Vessel = {
    ...emptyVessel("v1"),
    name: "PRATIWI SATU",
    type: "CONTAINER VESSEL",
    hmValue: 1_600_000,
    hmRate: 0.676,
    ivValue: 400_000,
    aoiValue: null,
    ivRate: 0.084,
    warValue: 2_000_000,
    warRate: 0.005,
    previous: {
      hmValue: 1_600_000,
      hmRate: 0.67,
      ivValue: 400_000,
      aoiValue: null,
      ivRate: 0.084,
      warValue: 2_000_000,
      warRate: 0.005,
      amd: 25_000,
    },
  }
  assert.equal(hullSectionPremium(vessel, "hm"), 10_816)
  assert.equal(hullSectionPremium(vessel, "iv"), 336)
  assert.equal(hullSectionPremium(vessel, "war"), 100)
  assert.equal(hullSectionPremium({ ...vessel, aoiValue: 100_000 }, "iv"), 420)
  const current = hullTotals([vessel])
  const previous = hullTotals([vessel], true)
  assert.equal(previous.hmPremium, 10_720)
  assert.equal(current.premium, 11_252)
  assert.ok(Math.abs(premiumChangePct(current.hmPremium, previous.hmPremium)! - 0.008955) < 1e-6)
  assert.equal(premiumChangePct(100, 0), null)
})

test("teks VESSEL: satu kapal langsung, lebih dari satu '& N OTHERS'", () => {
  const vessels = patria()
  assert.equal(
    vesselSummaryText(vessels),
    "BULK CARRIER “PATRIA NAWASENA 1” & 3 OTHERS (AS PER SCHEDULE ATTACHED)"
  )
  assert.equal(vesselSummaryText(vessels.slice(0, 1)), "BULK CARRIER “PATRIA NAWASENA 1”")
  assert.equal(
    vesselSummaryText(vessels.slice(0, 2)),
    "BULK CARRIER “PATRIA NAWASENA 1” & 1 OTHER (AS PER SCHEDULE ATTACHED)"
  )
  assert.equal(vesselSummaryText([emptyVessel("x")]), "")
})

test("upload format Patria: kolom dari judul, angka bertanda mata uang, baris total dilewati", async () => {
  const { vesselsFromRows } = await import("../lib/marine-hull-import")
  const rows: unknown[][] = [
    ["PT PATRIA MARITIME"],
    [],
    ["NO", "VESSEL", "TYPE", "BUILT", "GRT", "CLASS", "FLAG", "H&M INSURED VALUE (IDR)", "H&M RATE", "H&M PREMIUM (IDR)", "IV INSURED VALUE (IDR)", "IV RATE", "IV PREMIUM (IDR)", "WAR INSURED VALUE (IDR)", "WAR RATE", "WAR PREMIUM (IDR)"],
    [1, "PATRIA NAWASENA 1", "BULK CARRIER", 2008, 31236, "BKI", "INDONESIA", "IDR 158,339,797,559.20", "0.5850%", "IDR 926,287,815.72", 39_584_949_389.8, "0.100%", null, 197_924_746_949, 0.01, null],
    [2, "PATRIA NAWASENA 2", "BULK CARRIER", 2011, 31763, "NK", "INDONESIA", 222_303_452_560, 0.585, null, 55_575_863_140, 0.1, null, 277_879_315_700, 0.01, null],
    [null, null, null, null, null, null, null, "IDR 380,643,250,119.20", null, null, null, null, null, null, null, null],
  ]
  const { format, vessels, errors } = vesselsFromRows(rows, (i) => `v${i + 1}`)
  assert.deepEqual(errors, [])
  assert.equal(format, "patria")
  assert.deepEqual(
    vessels.map((v) => [v.id, v.name, v.built, v.classSociety, v.hmValue, v.hmRate, v.ivRate, v.warRate]),
    [
      ["v1", "PATRIA NAWASENA 1", "2008", "BKI", 158_339_797_559.2, 0.585, 0.1, 0.01],
      ["v2", "PATRIA NAWASENA 2", "2011", "NK", 222_303_452_560, 0.585, 0.1, 0.01],
    ]
  )
  assert.equal(hullSectionPremium(vessels[0], "hm"), 926_287_815.72)
})

test("upload format MHL: judul dua baris dengan tahun, tahun lalu terpisah", async () => {
  const { vesselsFromRows } = await import("../lib/marine-hull-import")
  const rows: unknown[][] = [
    ["NO", "VESSEL", "TYPE", "IMO NUMBER", "BUILT", "GRT", "CLASS", "FLAG", "H&M INSURED VALUE", "H&M", "H&M", "H&M INSURED VALUE", "H&M", "H&M", "DEDUCTIBLE", "AMD", "AMD", "GENERAL", "IV INSURED VALUE", "AOI INSURED VALUE", "IV/AOI", "IV/AOI", "WR INSURED VALUE", "WR", "WR", "OWNER"],
    ["@", null, null, null, null, null, null, null, "2021", "RATE 2021", "PREMIUM 2021", "2022", "RATE 2022", "PREMIUM 2022", "CLAUSE 12", "2021", "2022", "AVERAGE", "2022", "2022", "RATE 2022", "PREMIUM 2022", "2022", "RATE 2022", "PREMIUM 2022", null],
    [1, "PRATIWI SATU", "CONTAINER VESSEL", "9399650", 2005, "2,983", "BKI", "INDONESIA", "USD 1,600,000.00", "0.670%", "USD 10,720.00", "USD 1,600,000.00", "0.676%", "USD 10,816.00", "USD 50,000.00", "USD 25,000.00", "USD 25,000.00", "USD 300,000.00", "USD 400,000.00", null, "0.084%", "USD 336.00", "USD 2,000,000.00", "0.005%", "USD 100.00", "PT SALAM PACIFIC INDONESIA LINES"],
  ]
  const { format, vessels, errors, years } = vesselsFromRows(rows, (i) => `v${i + 1}`)
  assert.deepEqual(errors, [])
  assert.equal(format, "mhl")
  assert.deepEqual(years, { previous: 2021, current: 2022 })
  const [v] = vessels
  assert.equal(v.imo, "9399650")
  assert.equal(v.hmValue, 1_600_000)
  assert.equal(v.hmRate, 0.676)
  assert.equal(v.previous?.hmRate, 0.67)
  assert.equal(v.previous?.amd, 25_000)
  assert.equal(v.deductible, 50_000)
  assert.equal(v.generalAverage, 300_000)
  assert.equal(v.ivRate, 0.084)
  assert.equal(v.owner, "PT SALAM PACIFIC INDONESIA LINES")
  assert.equal(hullSectionPremium(v, "hm"), 10_816)
  assert.equal(hullSectionPremium(v.previous!, "hm"), 10_720)
})

test("upload: tanpa kolom VESSEL, nilai tanpa rate, dan nomor tanpa nama kapal ditandai", async () => {
  const { vesselsFromRows } = await import("../lib/marine-hull-import")
  assert.match(vesselsFromRows([["NO", "NAMA"]], String).errors[0], /VESSEL tidak ditemukan/)
  const { errors, vessels } = vesselsFromRows(
    [
      ["NO", "VESSEL", "H&M INSURED VALUE", "H&M RATE"],
      [1, "KAPAL A", 1_000_000, null],
      [2, null, 2_000_000, 0.5],
      [3, "KAPAL C", null, null],
    ],
    String
  )
  assert.deepEqual(errors, [
    "Baris 2: KAPAL A: rate H&M belum diisi.",
    "Baris 3: VESSEL kosong.",
    "Baris 4: KAPAL C: nilai H&M, IV, atau War belum diisi.",
  ])
  assert.equal(vessels.length, 2)
})

test("slip jadwal kapal: satu objek senilai TSI tanpa War, premi flat per section", async () => {
  const { recalcSlip, totalPremium, totalSumInsured } = await import("../lib/calc")
  const { emptySlip } = await import("../components/underwriting/slip-model")
  const slip = recalcSlip({
    ...emptySlip(),
    cob: "Marine Hull",
    hullSchedule: { format: "patria", vessels: patria() },
  })
  assert.equal(slip.interestItems.length, 1)
  assert.equal(
    slip.interestItems[0].description,
    "BULK CARRIER “PATRIA NAWASENA 1” & 3 OTHERS (AS PER SCHEDULE ATTACHED)"
  )
  const itemId = slip.interestItems[0].id
  assert.deepEqual(
    slip.rateLines.map((l) => [l.label, l.rate, l.flatPremium, l.premium, l.vehicleId]),
    [
      ["Hull & Machinery", null, true, 4_789_715_880.53, itemId],
      ["Increased Value", null, true, 204_688_712.85, itemId],
      ["War Risks", null, true, 102_344_356.42, itemId],
    ]
  )
  assert.equal(totalPremium(slip), 5_096_748_949.8)
  // War menjamin kapal yang sama: TSI = H&M + IV.
  assert.equal(totalSumInsured(slip), 1_023_443_564_216)
})

test("slip jadwal kapal: format MHL mengurutkan cover H&M, War, IV; id dan deductible baris tetap", async () => {
  const { recalcSlip } = await import("../lib/calc")
  const { emptySlip } = await import("../components/underwriting/slip-model")
  const first = recalcSlip({
    ...emptySlip(),
    cob: "Marine Hull",
    hullSchedule: { format: "patria", vessels: patria() },
  })
  const withDeductible = {
    ...first,
    rateLines: first.rateLines.map((l) =>
      l.label === "War Risks" ? { ...l, deductibles: ["USD 50,000 each accident"] } : l
    ),
  }
  const mhl = recalcSlip({ ...withDeductible, hullSchedule: { format: "mhl", vessels: patria() } })
  assert.deepEqual(
    mhl.rateLines.map((l) => l.label),
    ["Hull & Machinery", "War Risks", "Increased Value"]
  )
  assert.equal(mhl.interestItems[0].id, first.interestItems[0].id)
  const war = mhl.rateLines.find((l) => l.label === "War Risks")!
  assert.deepEqual(war.deductibles, ["USD 50,000 each accident"])
  assert.equal(war.id, first.rateLines.find((l) => l.label === "War Risks")!.id)
  // Kapal tanpa nama: interest memakai teks lampiran.
  const unnamed = recalcSlip({ ...first, hullSchedule: { format: "patria", vessels: [emptyVessel("x")] } })
  assert.equal(unnamed.interestItems[0].description, "VESSELS AS PER SCHEDULE ATTACHED")
  assert.equal(unnamed.interestItems[0].amount, 0)
})

test("jadwal kapal tersimpan dibersihkan, release memeriksa nama, nilai, dan rate", async () => {
  const { cleanHullSchedule, hullScheduleIssues } = await import("../lib/marine-hull")
  assert.equal(cleanHullSchedule(null), null)
  assert.equal(cleanHullSchedule([]), null)
  const clean = cleanHullSchedule({
    format: "lain",
    vessels: [{ id: "a", name: "  KAPAL A ", hmValue: 1000, hmRate: "0.5", ivValue: -1, previous: { hmValue: 900 } }],
  })!
  assert.equal(clean.format, "patria")
  assert.equal(clean.vessels[0].name, "KAPAL A")
  assert.equal(clean.vessels[0].hmRate, null)
  assert.equal(clean.vessels[0].ivValue, null)
  assert.equal(clean.vessels[0].previous?.hmValue, 900)
  assert.deepEqual(hullScheduleIssues(clean), ["KAPAL A: rate H&M belum diisi."])
  assert.deepEqual(hullScheduleIssues({ format: "patria", vessels: [] }), ["Jadwal kapal: isi minimal satu kapal."])
  assert.deepEqual(hullScheduleIssues({ format: "patria", vessels: [emptyVessel("x")] }), [
    "Jadwal kapal baris 1: nama kapal kosong.",
    "Kapal baris 1: nilai dan rate H&M, IV, atau War belum diisi.",
  ])
  assert.deepEqual(hullScheduleIssues({ format: "patria", vessels: patria() }), [])
})
