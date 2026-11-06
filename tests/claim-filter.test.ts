import test from "node:test"
import assert from "node:assert/strict"

import {
  filterClaims,
  parseClaimFilters,
  claimFilterQuery,
  type FilterableClaim,
} from "../lib/claim-filter"

const SAMPLE_CLAIMS: FilterableClaim[] = [
  {
    id: "1",
    claimNo: "CLM/2026/08/0033",
    policyNo: "POL/2026/01/0001",
    insuredName: "PT Rungkut Industri",
    cob: "Property",
    status: "Outstanding",
    stage: "Dokumen Belum Lengkap",
    location: "Surabaya",
    lossDescription: "Panel terbakar",
  },
  {
    id: "2",
    claimNo: "CLM/2026/08/0031",
    policyNo: "POL/2026/02/0042",
    insuredName: "CV Maju Bersama",
    cob: "Motor Vehicle",
    status: "Outstanding",
    stage: "Analisa Klaim",
    location: "Jakarta",
    lossDescription: "Tabrakan beruntun",
  },
  {
    id: "3",
    claimNo: "CLM/2026/07/0030",
    policyNo: "POL/2026/03/0010",
    insuredName: "PT Bahari Makmur",
    cob: "Marine Cargo",
    status: "Settled",
    stage: "Selesai",
    location: "Tanjung Priok",
    lossDescription: "Basah air laut",
  },
]

test("parseClaimFilters membaca nilai kosong menjadi default 'all' dan ''", () => {
  const parsed = parseClaimFilters({})
  assert.deepEqual(parsed, {
    status: "all",
    stage: "all",
    cob: "all",
    search: "",
  })
})

test("parseClaimFilters menerima status dan stage valid", () => {
  const parsed = parseClaimFilters({
    status: "Outstanding",
    stage: "Dokumen Belum Lengkap",
    cob: "Property",
    search: "rungkut",
  })
  assert.deepEqual(parsed, {
    status: "Outstanding",
    stage: "Dokumen Belum Lengkap",
    cob: "Property",
    search: "rungkut",
  })
})

test("parseClaimFilters me-reset status/stage tidak dikenal menjadi 'all'", () => {
  const parsed = parseClaimFilters({
    status: "BogusStatus",
    stage: "BogusStage",
  })
  assert.equal(parsed.status, "all")
  assert.equal(parsed.stage, "all")
})

test("claimFilterQuery hanya menyertakan parameter yang aktif", () => {
  const query = claimFilterQuery({
    status: "Outstanding",
    stage: "all",
    cob: "Property",
    search: "panel",
  })
  const params = new URLSearchParams(query)
  assert.equal(params.get("status"), "Outstanding")
  assert.equal(params.get("cob"), "Property")
  assert.equal(params.get("search"), "panel")
  assert.equal(params.has("stage"), false)
})

test("claimFilterQuery menghasilkan string kosong saat semua filter default", () => {
  const query = claimFilterQuery({
    status: "all",
    stage: "all",
    cob: "all",
    search: "",
  })
  assert.equal(query, "")
})

test("filterClaims tanpa kriteria mengembalikan semua baris", () => {
  const result = filterClaims(SAMPLE_CLAIMS, {
    status: "all",
    stage: "all",
    cob: "all",
    search: "",
  })
  assert.equal(result.length, 3)
})

test("filterClaims menyaring berdasarkan status", () => {
  const result = filterClaims(SAMPLE_CLAIMS, {
    status: "Settled",
    stage: "all",
    cob: "all",
    search: "",
  })
  assert.equal(result.length, 1)
  assert.equal(result[0].claimNo, "CLM/2026/07/0030")
})

test("filterClaims menyaring kombinasi status, cob, dan kata kunci pencarian", () => {
  const result = filterClaims(SAMPLE_CLAIMS, {
    status: "Outstanding",
    stage: "Dokumen Belum Lengkap",
    cob: "Property",
    search: "panel",
  })
  assert.equal(result.length, 1)
  assert.equal(result[0].insuredName, "PT Rungkut Industri")
})

test("filterClaims pencarian mencari di no klaim, polis, tertanggung, cob, lokasi, deskripsi", () => {
  assert.equal(
    filterClaims(SAMPLE_CLAIMS, { status: "all", stage: "all", cob: "all", search: "priok" }).length,
    1
  )
  assert.equal(
    filterClaims(SAMPLE_CLAIMS, { status: "all", stage: "all", cob: "all", search: "0042" }).length,
    1
  )
})

test("filterClaims pencarian juga mencari nama peserta PA grup", () => {
  const items: FilterableClaim[] = [
    ...SAMPLE_CLAIMS,
    {
      id: "pa",
      claimNo: "CLM-LCH001/XI/2026",
      policyNo: "PA/2026/001",
      insuredName: "PT Salam Pacific",
      cob: "General Accident",
      status: "Outstanding",
      participantName: "Budi Santoso",
    },
  ]
  const found = filterClaims(items, { status: "all", stage: "all", cob: "all", search: "budi" })
  assert.deepEqual(found.map((c) => c.id), ["pa"])
})
