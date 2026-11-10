import assert from "node:assert/strict"
import test from "node:test"

import {
  endorsementBody,
  endorsementNo,
  endorsementOpening,
  endorsementTitle,
  premiumAdjustmentLabel,
  signedMoney,
} from "../lib/endorsement-slip"

test("the title follows the insurer samples: ENDORSEMENT or CANCELLATION", () => {
  assert.equal(endorsementTitle("Endorsement"), "ENDORSEMENT")
  assert.equal(endorsementTitle("Cancellation"), "CANCELLATION")
})

test("the endorsement number has two digits, as in EDM 01", () => {
  assert.equal(endorsementNo(1), "01")
  assert.equal(endorsementNo(12), "12")
  assert.equal(endorsementNo(null), "—")
})

test("the opening sentence follows the EDM 01 and CANCELLATION wording", () => {
  assert.equal(
    endorsementOpening("Endorsement", "2026-08-18"),
    "Dengan ini dicatat dan disetujui bahwa terhitung sejak tanggal 18 Agustus 2026, pada polis tersebut di atas diadakan perubahan sebagai berikut :"
  )
  assert.equal(
    endorsementOpening("Cancellation", "2026-05-22"),
    "Dengan ini dicatat dan disetujui bahwa terhitung sejak tanggal 22 Mei 2026 :"
  )
})

test("the change text comes from Remarks; a cancellation without remarks still says cancelled", () => {
  assert.equal(endorsementBody("Endorsement", "  Perubahan harga pertanggungan  "), "Perubahan harga pertanggungan")
  assert.equal(endorsementBody("Endorsement", null), "")
  assert.equal(endorsementBody("Cancellation", ""), "Polis ini DIBATALKAN.")
})

test("premium rows name additional and return premium", () => {
  assert.equal(premiumAdjustmentLabel(5_000).id, "Premi Tambahan")
  assert.equal(premiumAdjustmentLabel(-387_650).en, "Return Premium")
  assert.equal(premiumAdjustmentLabel(0).id, "Penyesuaian Premi")
})

test("a negative amount prints in brackets, as in the EDM premium calculation", () => {
  assert.equal(signedMoney(-387_650, "IDR"), "(IDR 387.650,00)")
  assert.equal(signedMoney(10_000, "IDR"), "IDR 10.000,00")
})
