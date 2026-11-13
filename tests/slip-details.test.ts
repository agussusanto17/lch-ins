import assert from "node:assert/strict"
import test from "node:test"

import {
  isBusinessLabel,
  isExistingPolicyLabel,
  cleanDetailLabels,
  cleanDetailRows,
  missingDetailLabels,
  printedDetailRows,
  withDetailLabels,
} from "../lib/slip-details"

const LIABILITY = ["Retroactive Date", "Territorial Limit", "Jurisdiction"]

test("label bawaan masuk saat type of cover dipilih", () => {
  assert.deepEqual(withDetailLabels([], LIABILITY), [
    { label: "Retroactive Date", value: "" },
    { label: "Territorial Limit", value: "" },
    { label: "Jurisdiction", value: "" },
  ])
})

test("ganti type of cover: baris berisi tetap, label kosong lama dibuang", () => {
  const rows = [
    { label: "Retroactive Date", value: "30th June 2025" },
    { label: "Territorial Limit", value: "" },
    { label: "Existing Policy No.", value: "45090625000035" },
  ]
  assert.deepEqual(withDetailLabels(rows, ["Voyage", "retroactive date"]), [
    { label: "Retroactive Date", value: "30th June 2025" },
    { label: "Existing Policy No.", value: "45090625000035" },
    { label: "Voyage", value: "" },
  ])
})

test("label bawaan yang belum ada dihitung tanpa beda huruf besar", () => {
  const rows = [{ label: "jurisdiction ", value: "Indonesia" }]
  assert.deepEqual(missingDetailLabels(rows, LIABILITY), [
    "Retroactive Date",
    "Territorial Limit",
  ])
})

test("cetak hanya baris yang berisi, dirapikan", () => {
  assert.deepEqual(
    printedDetailRows([
      { label: " Jurisdiction ", value: " Indonesia\n" },
      { label: "Territorial Limit", value: "  " },
    ]),
    [{ label: "Jurisdiction", value: "Indonesia" }]
  )
})

test("label Master Data dirapikan dan tidak dobel", () => {
  assert.deepEqual(cleanDetailLabels([" Voyage", "", "voyage", "Conveyance "]), [
    "Voyage",
    "Conveyance",
  ])
})

test("data JSON yang rusak tidak membuat slip gagal dibuka", () => {
  assert.deepEqual(cleanDetailRows(null), [])
  assert.deepEqual(cleanDetailRows({ label: "x" }), [])
  assert.deepEqual(
    cleanDetailRows([
      { label: "Voyage", value: "Jakarta to Surabaya  " },
      { label: "", value: "" },
      "teks",
      { label: "Vessels", value: 3 },
    ]),
    [
      { label: "Voyage", value: "Jakarta to Surabaya" },
      { label: "Vessels", value: "" },
    ]
  )
})

test("label Existing Policy No. dikenali dengan beberapa penulisan", () => {
  for (const label of ["Existing Policy No.", "EXISTING POLICY NO", " existing policy number ", "Existing Policy"]) {
    assert.equal(isExistingPolicyLabel(label), true, label)
  }
  for (const label of ["Policy No.", "Existing Policy Holder", "Retroactive Date"]) {
    assert.equal(isExistingPolicyLabel(label), false, label)
  }
})

test("label The Business dikenali, dengan atau tanpa The", () => {
  for (const label of ["The Business", "Business", " the business ", "BUSINESS"])
    assert.equal(isBusinessLabel(label), true, label)
  for (const label of ["Business Interruption", "Nature of Business", "Businesses", ""])
    assert.equal(isBusinessLabel(label), false, label)
})
