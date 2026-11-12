import assert from "node:assert/strict"
import test from "node:test"

import { changeSlipLockText, changeSlipName } from "../lib/endorsement-slip"

const ES = "019/LCH-PLCMT/ES-MV/XI/2026"
const CS = "020/LCH-PLCMT/CS-MV/XI/2026"

test("nama slip perubahan: bernomor, atau draft sebelum terbit", () => {
  assert.equal(changeSlipName({ kind: "Endorsement", slipNo: ES }), `endorsement slip ${ES}`)
  assert.equal(changeSlipName({ kind: "Cancellation", slipNo: null }), "draft cancellation slip")
})

test("endorsement slip Closed: slip asal terkunci permanen", () => {
  const text = changeSlipLockText({ kind: "Endorsement", slipNo: ES, status: "Closed" })
  assert.equal(
    text,
    `Slip ini terkunci karena sudah ada endorsement slip ${ES}. Perubahan polis berikutnya dibuat lewat endorsement slip, bukan dengan merevisi slip ini.`
  )
})

test("cancellation slip Closed: polis sudah dibatalkan", () => {
  assert.equal(
    changeSlipLockText({ kind: "Cancellation", slipNo: CS, status: "Closed" }),
    `Slip ini terkunci karena polisnya sudah dibatalkan lewat cancellation slip ${CS}.`
  )
})

test("draft endorsement slip: hapus draft dulu untuk membuka kunci", () => {
  const text = changeSlipLockText({ kind: "Endorsement", slipNo: null, status: "Draft" })
  assert.match(text, /sudah ada draft endorsement slip\./)
  assert.match(text, /hapus dulu draft endorsement slip itu\.$/)
})

test("slip perubahan sudah terbit: batalkan dulu untuk membuka kunci", () => {
  const text = changeSlipLockText({ kind: "Cancellation", slipNo: CS, status: "Released" })
  assert.match(text, new RegExp(`sudah ada cancellation slip ${CS}\\.`))
  assert.match(text, new RegExp(`batalkan dulu cancellation slip ${CS}\\.$`))
})
