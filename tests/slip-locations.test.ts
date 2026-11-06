import assert from "node:assert/strict"
import test from "node:test"

import { addressLines } from "../lib/slip-locations"

test("alamat lokasi dicetak per baris seperti isian user", () => {
  assert.equal(
    addressLines(
      "PT. MARGAMAS INDAH DEVELOPMENT :\n  Jl. Taman Kebon Jeruk Blok A1 \n\nJakarta Barat 11630\n"
    ),
    "PT. MARGAMAS INDAH DEVELOPMENT :\nJl. Taman Kebon Jeruk Blok A1\nJakarta Barat 11630"
  )
})

test("alamat satu baris tetap satu baris", () => {
  assert.equal(addressLines("  Jl. Gatot Subroto Kav. 34  "), "Jl. Gatot Subroto Kav. 34")
  assert.equal(addressLines(" \n "), "")
})
