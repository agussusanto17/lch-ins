import assert from "node:assert/strict"
import test from "node:test"

import { emptySlip, switchCob } from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"
import {
  buildCoverNoteDocument,
  coverNoteFilename,
  generateCoverNoteDocxBuffer,
} from "../lib/cover-note-docx"

function mockPropertySlip(): PlacingSlip {
  const base = switchCob(emptySlip(), "Property")
  return {
    ...base,
    id: "slip-prop-1",
    slipNo: "001/LCH-PLCMT/PS-PAR/XI/2026",
    status: "Closed",
    typeOfCover: "PROPERTY ALL RISKS",
    typeOfCover2: "EARTHQUAKE INSURANCE",
    wordingForms: ["Munich-Re Wording Amended", "Indonesian Earthquake Standard Policy"],
    insuredName: "PT MARGAMAS INDAH DEVELOPMENT and/or Subsidiary Companies",
    correspondenceAddress: "MALL PANAKKUKANG, Jl. Boulevard Panakkukang Mas, Makassar",
    periodTba: false,
    inceptionDate: "2026-11-01",
    expiryDate: "2027-11-01",
    periodNote: "Both days at 12 o'clock noon local time at the location of the insured object.",
    occupation: "29313A - Shopping Center Grade A",
    riskLocation: "MALL PANAKKUKANG, Jl. Boulevard Panakkukang Mas, Makassar",
    constructionClass: "Class I",
    indemnityPeriod: "12 bulan",
    currency: "IDR",
    interestSection1: "Real and Personal Property of every kind and description...",
    sumInsuredSection1: [
      { id: "item-1", description: "Building & Contents, Machineries Equipment", amount: 930000000000 },
    ],
    sumInsuredSection2: [],
    interestItems: [],
    deductibleIntro: "In respect of each and every claim:",
    rateLines: [
      {
        id: "rl-1",
        label: "FLEXAS",
        rate: 0.12,
        basis: "930000000000",
        premium: 1116000000,
      },
    ],
    tplLines: [],
    paLines: [],
    discountPct: 0,
    adminCost: 0,
    stampDuty: 10000,
    securityPanel: [
      {
        id: "sec-1",
        insurer: "PT. Asuransi Central Asia",
        share: 100,
        role: "As Leader",
      },
    ],
    coverNoteRemarks: "Subject to original policy terms and conditions.",
    closingDate: "2026-11-01",
    clauseIds: [],
    detailRows: [],
  }
}

function mockVehicleSlip(): PlacingSlip {
  const base = switchCob(emptySlip(), "Motor Vehicle")
  return {
    ...base,
    id: "slip-veh-1",
    slipNo: "002/LCH-PLCMT/PS-MV/XI/2026",
    status: "Closed",
    typeOfCover: "COMPREHENSIVE",
    wordingForms: ["Indonesian Motor Vehicle Standard Policy"],
    insuredName: "PT NUSANTARA FLEET SERVICES",
    correspondenceAddress: "Jl. Jenderal Sudirman Kav. 52, Jakarta",
    periodTba: false,
    inceptionDate: "2026-11-01",
    expiryDate: "2027-11-01",
    currency: "IDR",
    interestItems: [
      { id: "i-1", description: "Toyota Avanza 1.3 G (B 1234 ABC)", amount: 250000000 },
      { id: "i-2", description: "Toyota Innova Zenix (B 5678 DEF)", amount: 450000000 },
    ],
    rateLines: [],
    tplLines: [],
    paLines: [],
    discountPct: 0,
    securityPanel: [
      {
        id: "sec-1",
        insurer: "PT. Asuransi Astra Buana",
        share: 100,
        role: "As Leader",
      },
    ],
    closingDate: "2026-11-01",
    clauseIds: [],
    detailRows: [],
  }
}

test("coverNoteFilename sanitizes insuredName into clean filename", () => {
  const slip = mockPropertySlip()
  assert.equal(
    coverNoteFilename(slip),
    "cover-note-pt-margamas-indah-development-andor-subsidiary-companies.docx"
  )

  const emptySlip = { ...slip, insuredName: "" }
  assert.equal(coverNoteFilename(emptySlip), "cover-note-draft.docx")
})

test("buildCoverNoteDocument constructs valid docx Document for property slip", () => {
  const slip = mockPropertySlip()
  const doc = buildCoverNoteDocument(slip)
  assert.ok(doc, "document should be created")
})

test("generateCoverNoteDocxBuffer returns valid docx buffer (ZIP PK header) for property slip", async () => {
  const slip = mockPropertySlip()
  const buffer = await generateCoverNoteDocxBuffer(slip)
  assert.ok(Buffer.isBuffer(buffer), "should return Buffer")
  assert.ok(buffer.length > 5000, `buffer size should be substantial (got ${buffer.length} bytes)`)

  // Valid docx is a zip file, starting with PK (0x50, 0x4B, 0x03, 0x04)
  assert.equal(buffer[0], 0x50, "ZIP magic byte 1")
  assert.equal(buffer[1], 0x4b, "ZIP magic byte 2")
  assert.equal(buffer[2], 0x03, "ZIP magic byte 3")
  assert.equal(buffer[3], 0x04, "ZIP magic byte 4")
})

test("generateCoverNoteDocxBuffer handles multi-vehicle slip with attached interest", async () => {
  const slip = mockVehicleSlip()
  const buffer = await generateCoverNoteDocxBuffer(slip)
  assert.ok(Buffer.isBuffer(buffer))
  assert.ok(buffer.length > 5000)
  assert.equal(buffer[0], 0x50)
  assert.equal(buffer[1], 0x4b)
})
