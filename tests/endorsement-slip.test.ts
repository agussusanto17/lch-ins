import assert from "node:assert/strict"
import test from "node:test"

import {
  attachmentSeq,
  endorsementBody,
  endorsementNo,
  endorsementOpening,
  endorsementTitle,
  premiumAdjustmentLabel,
  signedMoney,
  sumInsuredBefore,
  type SiblingEndorsement,
} from "../lib/endorsement-slip"

test("the title is ENDORSEMENT SLIP or CANCELLATION SLIP, per Harry's correction", () => {
  assert.equal(endorsementTitle("Endorsement"), "ENDORSEMENT SLIP")
  assert.equal(endorsementTitle("Cancellation"), "CANCELLATION SLIP")
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

// Polis induk SI 600 jt dengan dua endorsement (+150 jt, +50 jt), satu renewal, dan satu pembatalan.
const siblings: SiblingEndorsement[] = [
  { isEndorsement: true, seq: 1, sumInsured: 150_000_000 },
  { isEndorsement: true, seq: 2, sumInsured: 50_000_000 },
  { isEndorsement: false, seq: null, sumInsured: 700_000_000 },
  { isEndorsement: false, seq: null, sumInsured: -800_000_000 },
]

test("an endorsement keeps its own number; a cancellation follows the last endorsement", () => {
  assert.equal(attachmentSeq("Endorsement", 2, siblings), 2)
  assert.equal(attachmentSeq("Cancellation", null, siblings), 3)
  assert.equal(attachmentSeq("Cancellation", null, []), 1)
  assert.equal(attachmentSeq("Endorsement", null, siblings), null)
})

test("sum insured before an endorsement counts only earlier endorsements", () => {
  assert.equal(sumInsuredBefore("Endorsement", 1, 600_000_000, siblings), 600_000_000)
  assert.equal(sumInsuredBefore("Endorsement", 2, 600_000_000, siblings), 750_000_000)
})

test("a cancellation applies to the cover in force, so every endorsement counts", () => {
  // Renewal dan pembatalan lain tidak ikut; hasilnya cocok dengan usulan pembatalan (-800 jt).
  assert.equal(sumInsuredBefore("Cancellation", null, 600_000_000, siblings), 800_000_000)
})
