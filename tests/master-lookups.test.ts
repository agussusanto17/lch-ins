import assert from "node:assert/strict"
import test from "node:test"

import {
  CLAIM_STATUS_CODES,
  POLICY_TYPE_CODES,
  dynamicLookupItems,
  fixedLookupItems,
  CLIENT_TYPE_CODES,
  fixedLookupLabel,
  isFixedLookupType,
  systemValueFromRow,
} from "../lib/form-options"

const CLAIM_STATUS_ROWS = [
  { code: "outstanding", name: "Outstanding" },
  { code: "settled", name: "Settle" },
  { code: "closed", name: "Close" },
  // Nilai yang ditambah tanpa logika tidak ikut sebagai pilihan sistem.
  { code: "pending_payment", name: "Pending Payment" },
]

test("daftar tetap: nilai sistem berlabel nama Master Data, urut seperti master", () => {
  assert.deepEqual(fixedLookupItems(CLAIM_STATUS_ROWS, CLAIM_STATUS_CODES), [
    { label: "Outstanding", value: "Outstanding" },
    { label: "Settle", value: "Settled" },
    { label: "Close", value: "Closed" },
  ])
  // Nilai tersimpan yang sudah nonaktif di master tetap ikut.
  assert.deepEqual(fixedLookupItems(CLAIM_STATUS_ROWS, CLAIM_STATUS_CODES, "Rejected").at(-1), {
    label: "Rejected",
    value: "Rejected",
  })
  // Tanpa data master: semua nilai sistem.
  assert.deepEqual(
    fixedLookupItems([], POLICY_TYPE_CODES).map((i) => i.value),
    ["Baru", "Renewal", "Endorsement", "Cancellation"]
  )
  assert.equal(fixedLookupLabel(CLAIM_STATUS_ROWS, CLAIM_STATUS_CODES, "Closed"), "Close")
  assert.equal(fixedLookupLabel(CLAIM_STATUS_ROWS, CLAIM_STATUS_CODES, "Rejected"), "Rejected")
})

test("daftar bebas: nama master aktif, nilai baru dari LCH ikut tampil", () => {
  const stages = [
    { code: "waiting_document", name: "Tunggu Dokumen" },
    { code: "survey", name: "Survey Lapangan" },
  ]
  assert.deepEqual(dynamicLookupItems(stages, ["Bawaan"]), ["Tunggu Dokumen", "Survey Lapangan"])
  assert.deepEqual(dynamicLookupItems(stages, ["Bawaan"], "Proses Adjuster"), [
    "Tunggu Dokumen",
    "Survey Lapangan",
    "Proses Adjuster",
  ])
  assert.deepEqual(dynamicLookupItems([], ["Bawaan"]), ["Bawaan"])
})

test("lookup yang dipakai logika sistem dikunci di Master Data", () => {
  assert.equal(isFixedLookupType("claim_status"), true)
  assert.equal(isFixedLookupType("policy_type"), true)
  assert.equal(isFixedLookupType("client_type"), true)
  assert.equal(isFixedLookupType("claim_stage"), false)
  assert.equal(isFixedLookupType("client_status"), false)
})

test("nilai sistem dibaca lewat kode, jadi nama master boleh diganti", () => {
  assert.equal(systemValueFromRow(CLAIM_STATUS_CODES, { code: "settled", name: "Settle" }, "Outstanding"), "Settled")
  assert.equal(systemValueFromRow(CLAIM_STATUS_CODES, { code: "closed", name: "Close" }, "Outstanding"), "Closed")
  assert.equal(systemValueFromRow(POLICY_TYPE_CODES, { code: "new", name: "New Business" }, "Baru"), "Baru")
  assert.equal(systemValueFromRow(CLIENT_TYPE_CODES, { code: "individual", name: "Individu" }, "Korporasi"), "Perorangan")
  // Data lama tanpa kode yang dikenal: dicocokkan lewat nama, lalu nilai bawaan.
  assert.equal(systemValueFromRow(POLICY_TYPE_CODES, { code: "x", name: "Renewal" }, "Baru"), "Renewal")
  assert.equal(systemValueFromRow(POLICY_TYPE_CODES, null, "Baru"), "Baru")
})
