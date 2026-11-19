import assert from "node:assert/strict"
import test from "node:test"

import {
  NO_SIGNATURE,
  initialSignatoryId,
  sameSignatoryName,
  sortSignatories,
} from "../lib/document-signatories"
import {
  FILE_PURPOSES,
  MAX_SIGNATURE_BYTES,
  MAX_UPLOAD_BYTES,
  UPLOAD_PART_BYTES,
  maxUploadBytes,
  signatureUploadProblem,
} from "../lib/uploads"

const sig = (id: string, name: string, isDefault = false) => ({ id, name, isDefault })

test("halaman cetak memilih tanda tangan default, atau yang pertama, atau tanpa", () => {
  assert.equal(initialSignatoryId([sig("s", "Sharad"), sig("r", "Rusli", true)]), "r")
  assert.equal(initialSignatoryId([sig("s", "Sharad"), sig("r", "Rusli")]), "s")
  assert.equal(initialSignatoryId([]), NO_SIGNATURE)
})

test("urutan pilihan: default dulu, lalu nama", () => {
  const list = sortSignatories([sig("s", "Sharad"), sig("a", "Aziz"), sig("r", "Rusli", true)])
  assert.deepEqual(
    list.map((s) => s.name),
    ["Rusli", "Aziz", "Sharad"]
  )
})

test("nama tanda tangan tidak boleh kembar walau beda huruf besar atau spasi", () => {
  assert.equal(sameSignatoryName("Rusli", " rusli "), true)
  assert.equal(sameSignatoryName("Rusli", "Sharad"), false)
})

test("gambar tanda tangan: PNG, JPG, atau WebP sampai 2 MB, tanpa PDF", () => {
  assert.ok(FILE_PURPOSES.includes("signature"))
  assert.equal(maxUploadBytes("signature"), MAX_SIGNATURE_BYTES)
  assert.equal(maxUploadBytes("slip_attachment"), MAX_UPLOAD_BYTES)
  // Cukup satu potongan unggahan.
  assert.ok(MAX_SIGNATURE_BYTES <= UPLOAD_PART_BYTES)

  assert.equal(signatureUploadProblem({ type: "image/png", size: 63_440 }), null)
  assert.equal(signatureUploadProblem({ type: "image/webp", size: MAX_SIGNATURE_BYTES }), null)
  assert.match(
    signatureUploadProblem({ type: "application/pdf", size: 10_000 }) ?? "",
    /PNG, JPG, atau WebP/
  )
  assert.match(
    signatureUploadProblem({ type: "image/svg+xml", size: 1_000 }) ?? "",
    /PNG, JPG, atau WebP/
  )
  assert.equal(
    signatureUploadProblem({ type: "image/png", size: MAX_SIGNATURE_BYTES + 1 }),
    "Ukuran file maksimal 2 MB."
  )
})
