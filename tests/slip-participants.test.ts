import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizeGender,
  parseParticipantAmount,
  parseParticipantDate,
  participantAge,
  participantsFromRows,
  participantsInterestItem,
  participantsTotal,
} from "../lib/slip-participants"

test("tanggal lahir dari sel Excel: Date, angka seri, DD/MM/YYYY, MM/DD bila hari > 12, dan ISO", () => {
  assert.equal(parseParticipantDate(new Date(Date.UTC(1993, 5, 30))), "1993-06-30")
  assert.equal(parseParticipantDate(33785), "1992-06-30")
  assert.equal(parseParticipantDate("30/06/1993"), "1993-06-30")
  assert.equal(parseParticipantDate("9/4/1986"), "1986-04-09")
  // Contoh LCH mencampur MM/DD: 10/24/1986 hanya mungkin 24 Oktober.
  assert.equal(parseParticipantDate("10/24/1986"), "1986-10-24")
  assert.equal(parseParticipantDate("1965-07-17"), "1965-07-17")
  assert.equal(parseParticipantDate("31/02/1990"), null)
  assert.equal(parseParticipantDate(""), null)
})

test("nilai UP dari sel Excel dengan berbagai pemisah", () => {
  assert.equal(parseParticipantAmount(75_000_000), 75_000_000)
  assert.equal(parseParticipantAmount("75,000,000.00"), 75_000_000)
  assert.equal(parseParticipantAmount("75.000.000"), 75_000_000)
  assert.equal(parseParticipantAmount("IDR 100.000.000,50"), 100_000_000.5)
  assert.equal(parseParticipantAmount("150,000"), 150_000)
  assert.equal(parseParticipantAmount("1.5"), 1.5)
  assert.equal(parseParticipantAmount("-"), null)
})

test("usia pada tanggal mulai polis, jenis kelamin, total UP", () => {
  assert.equal(participantAge("1993-06-30", "2026-03-01"), 32)
  assert.equal(participantAge("1993-03-01", "2026-03-01"), 33)
  assert.equal(participantAge(null, "2026-03-01"), null)
  assert.equal(normalizeGender("L"), "Pria")
  assert.equal(normalizeGender("perempuan"), "Wanita")
  assert.equal(normalizeGender("Pria"), "Pria")
  assert.equal(participantsTotal([{ sumInsured: 100_000_000 }, { sumInsured: 75_000_000 }]), 175_000_000)
})

test("impor peserta: judul kolom dikenali, baris kosong dilewati, kesalahan bernomor baris", () => {
  const rows = [
    ["Daftar Peserta PT Salam Pacific"],
    ["No", "Nama", "Lokasi Kerja", "Jabatan", "Level Jabatan", "Tgl Lahir", "Jenis Kelamin", "Sum Insured (per participant) (IDR)"],
    [1, "NM 1", "Cabang Ambon", "Branch Manager", "Middle Manager", "30/06/1993", "Pria", "100,000,000.00"],
    [],
    [2, "NM 2", "Cabang Ambon", "Operation Officer", "Senior Staff", new Date(Date.UTC(1986, 3, 9)), "L", 75_000_000],
  ]
  const { participants, errors } = participantsFromRows(rows, (i) => `p${i + 1}`)
  assert.deepEqual(errors, [])
  assert.deepEqual(
    participants.map((p) => [p.id, p.name, p.workLocation, p.level, p.birthDate, p.gender, p.sumInsured]),
    [
      ["p1", "NM 1", "Cabang Ambon", "Middle Manager", "1993-06-30", "Pria", 100_000_000],
      ["p2", "NM 2", "Cabang Ambon", "Senior Staff", "1986-04-09", "Pria", 75_000_000],
    ]
  )
  const bad = participantsFromRows(
    [["Nama", "Sum Insured", "Tanggal Lahir"], ["", 1000, ""], ["Budi", "nol", "40/40/2000"]],
    (i) => `x${i}`
  )
  assert.deepEqual(bad.errors, [
    "Baris 2: Nama kosong.",
    "Baris 3: Sum Insured harus angka lebih dari 0.",
    'Baris 3: Tanggal lahir "40/40/2000" tidak dikenali.',
  ])
  assert.deepEqual(participantsFromRows([["A", "B"]], () => "x").errors, [
    "Kolom Nama dan Sum Insured tidak ditemukan. Pakai template peserta.",
  ])
})

test("Interest Insured dari daftar peserta: satu baris, total UP", () => {
  assert.deepEqual(participantsInterestItem([{ sumInsured: 100_000_000 }, { sumInsured: 75_000_000 }]), {
    id: "peserta",
    description: "2 participants as attached",
    amount: 175_000_000,
  })
  assert.equal(participantsInterestItem([{ sumInsured: 150_000 }]).description, "1 participant as attached")
})
