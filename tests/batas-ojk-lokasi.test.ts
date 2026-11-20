import assert from "node:assert/strict"
import test from "node:test"

import { recalcSlip } from "../lib/calc"
import {
  addLocationPatch,
  copyFirstOccupationPatch,
  emptySlip,
  floatingSumInsuredPatch,
  isOutOfBounds,
  rateLinesWithBounds,
  releaseIssues,
  removeLocationPatch,
  switchCob,
  updateLocationPatch,
} from "../components/underwriting/slip-model"
import type { PlacingSlip, RateLine } from "../lib/data/types"
import { locationGroups } from "../lib/slip-locations"

// Batas FLEXAS OJK: 29371 K1 1,127–1,260, K2 1,691–1,890; 29378 K1 2,255–2,520, K2 3,382–3,780.
const PRIVATE_WAREHOUSE = "29371 - Private Warehouses"
const PUBLIC_WAREHOUSE = "29378 - Public Warehouses"
const SUNTER = "Ruko Nirwana Asri Tahap 2 blok A No 31, Sunter Agung, Jakarta Utara"

// Pilihan panel Referensi Tarif OJK (ojk-panels.tsx): EQVET satu kolom zona, FWTWD satu zona banjir.
const EQVET_PICK = { min: 1.55, max: 1.55, boundSource: "EQVET Com: Others, Zona 3" }
const FWTWD_PICK = {
  min: 0.5,
  max: 0.55,
  boundSource: "Banjir Jakarta, Banten, Jawa Barat, Zona 1",
}

const apply = (slip: PlacingSlip, patch: Partial<PlacingSlip>) =>
  recalcSlip({ ...slip, ...patch })

/** Simpan lalu muat ulang: form mengirim rateLinesWithBounds dan server menyimpan batasnya. */
const saved = (slip: PlacingSlip): PlacingSlip => ({
  ...slip,
  rateLines: rateLinesWithBounds(slip),
})

const locationId = (slip: PlacingSlip, no: number) =>
  locationGroups(slip)[no - 1].location.id

/** Baris rate di state form, termasuk batas tersimpan. */
const stored = (slip: PlacingSlip, label: string, no = 1) =>
  locationGroups(slip)[no - 1].rateLines.find((l) => l.label === label)!

/** Baris rate yang dipakai tabel rate dan releaseIssues. */
const bounded = (slip: PlacingSlip, label: string, no = 1) => {
  const id = stored(slip, label, no).id
  return rateLinesWithBounds(slip).find((l) => l.id === id)!
}

const bounds = (l: RateLine) => [l.min ?? null, l.max ?? null, l.boundSource ?? null]

const withRates = (slip: PlacingSlip) =>
  apply(slip, {
    rateLines: slip.rateLines.map((l) =>
      l.label === "FLEXAS"
        ? { ...l, rate: 1.127 }
        : l.label === "EQVET"
          ? { ...l, rate: 1.55, ...EQVET_PICK }
          : l.label === "FWTWD"
            ? { ...l, rate: 0.5, ...FWTWD_PICK }
            : l
    ),
  })

/** Langkah 1 reproduksi: slip Property 29371 Class I, rate FLEXAS 1,127, disimpan draft. */
function privateWarehouse(): PlacingSlip {
  let slip = switchCob(emptySlip(), "Property")
  slip = apply(
    slip,
    updateLocationPatch(slip, locationId(slip, 1), {
      riskLocation: SUNTER,
      occupation: PRIVATE_WAREHOUSE,
      constructionClass: "K1",
    })
  )
  return saved(withRates(slip))
}

/** Dua lokasi berokupasi beda: lokasi 2 lebih berisiko. Sudah disimpan. */
function twoWarehouses(floating: boolean): PlacingSlip {
  let slip = switchCob(emptySlip(), "Property")
  slip = apply(slip, addLocationPatch(slip))
  slip = apply(
    slip,
    updateLocationPatch(slip, locationId(slip, 1), {
      riskLocation: SUNTER,
      occupation: PRIVATE_WAREHOUSE,
      constructionClass: "K1",
    })
  )
  slip = apply(
    slip,
    updateLocationPatch(slip, locationId(slip, 2), {
      riskLocation: SUNTER.replace("No 31", "No 36"),
      occupation: PUBLIC_WAREHOUSE,
      constructionClass: "K1",
    })
  )
  if (floating) slip = apply(slip, floatingSumInsuredPatch(slip, true))
  return saved(withRates(slip))
}

test("reproduksi 18 November: ganti okupasi dan kelas, batas FLEXAS dihitung ulang", () => {
  let slip = privateWarehouse()
  assert.deepEqual(bounds(stored(slip, "FLEXAS")), [1.127, 1.26, "FLEXAS okupasi 29371 K1"])
  assert.equal(isOutOfBounds(bounded(slip, "FLEXAS")), false)

  // Langkah 2: okupasi lalu kelas diganti satu per satu, seperti di form.
  const id = locationId(slip, 1)
  slip = apply(
    slip,
    updateLocationPatch(slip, id, { occupation: PUBLIC_WAREHOUSE, occupationLabel: undefined })
  )
  slip = apply(slip, updateLocationPatch(slip, id, { constructionClass: "K2" }))

  // Langkah 3: batas baru dan tanda "butuh alasan".
  const flexas = bounded(slip, "FLEXAS")
  assert.deepEqual(bounds(flexas), [3.382, 3.78, "FLEXAS okupasi 29378 K2"])
  assert.equal(isOutOfBounds(flexas), true)
  assert.ok(
    releaseIssues(slip).includes("Rate FLEXAS di luar batas OJK dan belum ada alasannya.")
  )
  // Disimpan lagi: batas dan asalnya yang baru ikut tersimpan.
  assert.deepEqual(bounds(stored(saved(slip), "FLEXAS")), [3.382, 3.78, "FLEXAS okupasi 29378 K2"])
})

test("ganti okupasi: EQVET dikosongkan, FWTWD dari alamat tetap", () => {
  let slip = privateWarehouse()
  slip = apply(
    slip,
    updateLocationPatch(slip, locationId(slip, 1), { occupation: PUBLIC_WAREHOUSE })
  )
  // EQVET OJK bergantung pada okupasi (Dwelling atau Commercial); server menghitungnya lagi.
  assert.deepEqual(bounds(stored(slip, "EQVET")), [null, null, null])
  assert.equal(stored(slip, "EQVET").rate, 1.55)
  assert.deepEqual(bounds(stored(slip, "FWTWD")), [0.5, 0.55, FWTWD_PICK.boundSource])
})

test("ganti kelas konstruksi saja: FLEXAS ikut kelas baru", () => {
  let slip = privateWarehouse()
  slip = apply(
    slip,
    updateLocationPatch(slip, locationId(slip, 1), { constructionClass: "K2" })
  )
  assert.deepEqual(bounds(bounded(slip, "FLEXAS")), [1.691, 1.89, "FLEXAS okupasi 29371 K2"])
  assert.deepEqual(bounds(stored(slip, "EQVET")), [null, null, null])
  assert.deepEqual(bounds(stored(slip, "FWTWD")), [0.5, 0.55, FWTWD_PICK.boundSource])
})

test("ganti alamat: batas EQVET dan FWTWD dikosongkan, FLEXAS tetap", () => {
  let slip = privateWarehouse()
  slip = apply(
    slip,
    updateLocationPatch(slip, locationId(slip, 1), {
      riskLocation: "Jl. Raya Kuta No. 8, Badung, Bali",
    })
  )
  assert.deepEqual(bounds(stored(slip, "EQVET")), [null, null, null])
  assert.deepEqual(bounds(stored(slip, "FWTWD")), [null, null, null])
  assert.deepEqual(bounds(stored(slip, "FLEXAS")), [1.127, 1.26, "FLEXAS okupasi 29371 K1"])
})

test("nama okupasi di dokumen dan isian yang sama tidak mengubah batas", () => {
  const slip = privateWarehouse()
  const id = locationId(slip, 1)
  for (const patch of [
    { occupationLabel: "Gudang Pribadi" },
    { occupation: PRIVATE_WAREHOUSE, constructionClass: "K1", riskLocation: SUNTER },
  ]) {
    const next = updateLocationPatch(slip, id, patch)
    assert.equal(next.rateLines, undefined)
  }
})

test("alasan rate dibiarkan saat batas dikosongkan", () => {
  let slip = privateWarehouse()
  const flexas = stored(slip, "FLEXAS")
  const exception = { reason: "Perluasan jaminan" as const, note: "Perluasan RSMDCC" }
  slip = { ...slip, rateExceptions: { [flexas.id]: exception } }
  const patch = updateLocationPatch(slip, locationId(slip, 1), {
    occupation: PUBLIC_WAREHOUSE,
  })
  assert.equal(patch.rateExceptions, undefined)
  assert.deepEqual(apply(slip, patch).rateExceptions, { [flexas.id]: exception })
})

test("multi lokasi: hanya baris lokasi yang diganti yang dihitung ulang", () => {
  let slip = twoWarehouses(false)
  assert.deepEqual(bounds(stored(slip, "FLEXAS", 2)), [2.255, 2.52, "FLEXAS okupasi 29378 K1"])

  slip = apply(
    slip,
    updateLocationPatch(slip, locationId(slip, 2), { constructionClass: "K2" })
  )
  assert.deepEqual(bounds(bounded(slip, "FLEXAS", 2)), [3.382, 3.78, "FLEXAS okupasi 29378 K2"])
  assert.deepEqual(bounds(stored(slip, "EQVET", 2)), [null, null, null])
  // Lokasi 1 tidak berubah, jadi batas dan pilihan panelnya tetap.
  assert.deepEqual(bounds(stored(slip, "FLEXAS", 1)), [1.127, 1.26, "FLEXAS okupasi 29371 K1"])
  assert.deepEqual(bounds(stored(slip, "EQVET", 1)), [1.55, 1.55, EQVET_PICK.boundSource])
})

test("samakan okupasi & kelas dengan lokasi 1 menghitung ulang batas lokasi lain", () => {
  let slip = twoWarehouses(false)
  slip = apply(slip, copyFirstOccupationPatch(slip))
  assert.equal(locationGroups(slip)[1].location.occupation, PRIVATE_WAREHOUSE)
  assert.deepEqual(bounds(bounded(slip, "FLEXAS", 2)), [1.127, 1.26, "FLEXAS okupasi 29371 K1"])
  assert.deepEqual(bounds(stored(slip, "EQVET", 1)), [1.55, 1.55, EQVET_PICK.boundSource])
})

test("slip floating: ganti okupasi lokasi mana pun menghitung ulang rate bersama", () => {
  let slip = switchCob(emptySlip(), "Property")
  slip = apply(slip, addLocationPatch(slip))
  for (const no of [1, 2]) {
    slip = apply(
      slip,
      updateLocationPatch(slip, locationId(slip, no), {
        riskLocation: SUNTER,
        occupation: PRIVATE_WAREHOUSE,
        constructionClass: "K1",
      })
    )
  }
  slip = saved(withRates(apply(slip, floatingSumInsuredPatch(slip, true))))
  assert.deepEqual(bounds(stored(slip, "FLEXAS")), [1.127, 1.26, "FLEXAS okupasi 29371 K1, lokasi 1"])

  slip = apply(
    slip,
    updateLocationPatch(slip, locationId(slip, 2), { occupation: PUBLIC_WAREHOUSE })
  )
  const flexas = bounded(slip, "FLEXAS")
  assert.deepEqual(bounds(flexas), [2.255, 2.52, "FLEXAS okupasi 29378 K1, lokasi 2"])
  assert.equal(isOutOfBounds(flexas), true)
  assert.deepEqual(bounds(stored(slip, "EQVET")), [null, null, null])
})

test("nyala dan matikan floating menghitung ulang batas lokasi 1", () => {
  let slip = twoWarehouses(false)
  assert.deepEqual(bounds(stored(slip, "FLEXAS", 1)), [1.127, 1.26, "FLEXAS okupasi 29371 K1"])

  // Nyala: rate bersama memakai batas lokasi 2 yang lebih berisiko.
  slip = saved(apply(slip, floatingSumInsuredPatch(slip, true)))
  assert.deepEqual(bounds(stored(slip, "FLEXAS")), [2.255, 2.52, "FLEXAS okupasi 29378 K1, lokasi 2"])
  assert.equal(isOutOfBounds(stored(slip, "FLEXAS")), true)

  // Mati: lokasi 1 kembali ke batas okupasinya sendiri.
  slip = apply(slip, floatingSumInsuredPatch(slip, false))
  assert.deepEqual(bounds(bounded(slip, "FLEXAS", 1)), [1.127, 1.26, "FLEXAS okupasi 29371 K1"])
  assert.deepEqual(bounds(bounded(slip, "FLEXAS", 2)), [2.255, 2.52, "FLEXAS okupasi 29378 K1"])
})

test("hapus lokasi paling berisiko slip floating menghitung ulang batasnya", () => {
  let slip = twoWarehouses(true)
  assert.deepEqual(bounds(stored(slip, "FLEXAS")), [2.255, 2.52, "FLEXAS okupasi 29378 K1, lokasi 2"])

  slip = apply(slip, removeLocationPatch(slip, locationId(slip, 2)))
  assert.deepEqual(bounds(bounded(slip, "FLEXAS")), [1.127, 1.26, "FLEXAS okupasi 29371 K1"])
  assert.equal(isOutOfBounds(bounded(slip, "FLEXAS")), false)
})
