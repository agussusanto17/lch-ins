import assert from "node:assert/strict"
import test from "node:test"

import { fitWithin, jpegFileName, shouldCompress } from "../lib/image-compress"

const MB = 1024 * 1024

test("foto besar diperkecil sampai sisi terpanjang 2000px, rasio tetap", () => {
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 })
  assert.deepEqual(fitWithin(3024, 4032, 2000), { width: 1500, height: 2000 })
})

test("gambar yang sudah kecil tidak diperbesar", () => {
  assert.deepEqual(fitWithin(1200, 800, 2000), { width: 1200, height: 800 })
})

test("hanya JPG, PNG, WebP di atas 1 MB yang dikompres", () => {
  assert.equal(shouldCompress({ size: 6 * MB, type: "image/jpeg" }), true)
  assert.equal(shouldCompress({ size: 2 * MB, type: "image/png" }), true)
  assert.equal(shouldCompress({ size: 2 * MB, type: "image/webp" }), true)
  assert.equal(shouldCompress({ size: 800 * 1024, type: "image/jpeg" }), false)
  assert.equal(shouldCompress({ size: 6 * MB, type: "application/pdf" }), false)
  assert.equal(
    shouldCompress({
      size: 6 * MB,
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    false
  )
})

test("nama berkas hasil kompres berakhiran .jpg", () => {
  assert.equal(jpegFileName("foto KTP.png"), "foto KTP.jpg")
  assert.equal(jpegFileName("IMG_0001.JPEG"), "IMG_0001.jpg")
  assert.equal(jpegFileName("scan.v2.webp"), "scan.v2.jpg")
  assert.equal(jpegFileName("tanpa-ekstensi"), "tanpa-ekstensi.jpg")
})
