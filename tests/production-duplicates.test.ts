import assert from "node:assert/strict"
import test from "node:test"

import { duplicateFlags, type DuplicateCandidate } from "../lib/production-duplicates"

/** Data produksi dobel ditandai, tidak dihapus (Agus, 22 November 2026). */
function item(over: Partial<DuplicateCandidate> = {}): DuplicateCandidate {
  return {
    policyNo: "45020126000123",
    type: "Baru",
    insuredName: "PT SIT Korporasi Uji",
    cob: "Motor Vehicle",
    inceptionDate: "2026-11-01",
    expiryDate: "2027-11-01",
    currency: "IDR",
    premium: 7_862_500,
    slipPart: null,
    parent: null,
    ...over,
  }
}

test("no. polis sama dipakai dua data", () => {
  assert.deepEqual(
    duplicateFlags([
      item(),
      item({ insuredName: "PT Lain", premium: 1 }),
      item({ policyNo: "X/1", premium: 5_000_000 }),
    ]),
    ["DOBEL? No. polis sama dipakai 2 data", "DOBEL? No. polis sama dipakai 2 data", ""]
  )
  // Spasi dan huruf besar kecil tidak membedakan nomor.
  assert.equal(duplicateFlags([item(), item({ policyNo: " 45020126000123 " })])[1], "DOBEL? No. polis sama dipakai 2 data")
})

test("isi sama dengan nomor polis berbeda: polis sementara CI dan input manual", () => {
  const flags = duplicateFlags([
    item({ policyNo: "018/LCH-PLCMT/CI-MV/XI/2026" }),
    // Nama tertanggung ditulis dengan titik dan huruf besar: tetap dianggap sama.
    item({ insuredName: "PT. SIT KORPORASI UJI" }),
  ])
  assert.deepEqual(flags, [
    "DOBEL? isi sama dengan 45020126000123",
    "DOBEL? isi sama dengan 018/LCH-PLCMT/CI-MV/XI/2026",
  ])
})

test("bagian PAR dan EQVET, perubahan polis induk berbeda, dan premi berbeda tidak dianggap dobel", () => {
  assert.deepEqual(
    duplicateFlags([
      item({ policyNo: "CI/PAR", slipPart: "PAR" }),
      item({ policyNo: "CI/EQVET", slipPart: "EQVET" }),
    ]),
    ["", ""]
  )
  assert.deepEqual(
    duplicateFlags([
      item({ policyNo: "END/1", type: "Endorsement", parent: "P1" }),
      item({ policyNo: "END/2", type: "Endorsement", parent: "P2" }),
    ]),
    ["", ""]
  )
  assert.deepEqual(duplicateFlags([item(), item({ policyNo: "B", premium: 7_862_501 })]), ["", ""])
  // Asuransi berbeda, atau polis induk MOP tanpa premi: tidak dicek isinya.
  assert.deepEqual(
    duplicateFlags([item({ insurer: "PT A" }), item({ policyNo: "B", insurer: "PT B" })]),
    ["", ""]
  )
  assert.deepEqual(
    duplicateFlags([item({ premium: 0 }), item({ policyNo: "MOP/2", premium: 0 })]),
    ["", ""]
  )
})
