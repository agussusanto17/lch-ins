import assert from "node:assert/strict"
import test from "node:test"

import { recalcSlip } from "../lib/calc"
import {
  addLocationPatch,
  emptySlip,
  rateLinesWithBounds,
  releaseIssues,
  switchCob,
  updateLocationPatch,
} from "../components/underwriting/slip-model"
import type { PlacingSlip } from "../lib/data/types"
import { getPropertyRateBounds, propertyRateLinesWithBounds } from "../lib/property-rate-bounds"
import { locationGroups } from "../lib/slip-locations"

const apply = (slip: PlacingSlip, patch: Partial<PlacingSlip>) => recalcSlip({ ...slip, ...patch })

/**
 * Dua lokasi SPIL di Surabaya dengan rate FWTWD 0,405‰, di bawah batas bawah banjir Zona 1 luar
 * Jakarta, Banten, dan Jawa Barat (0,45‰). Kasus yang ditolak saat release (19 November 2026).
 */
function surabaya(): PlacingSlip {
  let slip = switchCob(emptySlip(), "Property")
  slip = apply(slip, addLocationPatch(slip))
  const [a, b] = locationGroups(slip).map((g) => g.location.id)
  for (const [id, address] of [
    [a, "Kalianak No. 51 E, F, G (Belakang), Surabaya"],
    [b, "Kalianak No. 51 E, F, G (Depan), Surabaya"],
  ] as const) {
    slip = apply(
      slip,
      updateLocationPatch(slip, id, {
        riskLocation: address,
        occupation: "2971 - Office & Mess",
        constructionClass: "K1",
      })
    )
  }
  const rates: Record<string, number> = { FLEXAS: 0.368, FWTWD: 0.405, RSMDCC: 0.0001, EQVET: 1.2 }
  return apply(slip, {
    rateLines: slip.rateLines.map((l) => ({ ...l, rate: rates[l.label] ?? null })),
  })
}

test("form memakai batas Property yang sama dengan release: FLEXAS, EQVET, dan FWTWD", () => {
  const slip = surabaya()
  const lines = rateLinesWithBounds(slip)
  assert.deepEqual(lines, propertyRateLinesWithBounds(slip))
  const fwtwd = lines.filter((l) => l.label === "FWTWD")
  assert.equal(fwtwd.length, 2)
  for (const l of fwtwd) {
    assert.equal(l.min, 0.45)
    assert.equal(l.max, null)
    assert.equal(l.boundSource, "Banjir Luar Jakarta, Banten, Jawa Barat, batas bawah Zona 1")
  }
  const eqvet = lines.find((l) => l.label === "EQVET")
  assert.deepEqual([eqvet?.min, eqvet?.max], [1, 1.55])
})

test("rate FWTWD di bawah batas tertangkap sebelum release, dan lolos setelah diberi alasan", () => {
  const slip = surabaya()
  const fwtwdIssues = (s: PlacingSlip) => releaseIssues(s).filter((i) => i.includes("FWTWD"))
  assert.deepEqual(fwtwdIssues(slip), [
    "Rate FWTWD lokasi 1 di luar batas OJK dan belum ada alasannya.",
    "Rate FWTWD lokasi 2 di luar batas OJK dan belum ada alasannya.",
  ])
  const ids = slip.rateLines.filter((l) => l.label === "FWTWD").map((l) => l.id)
  const withNotes = {
    ...slip,
    rateExceptions: Object.fromEntries(
      ids.map((id) => [
        id,
        {
          reason: "Perluasan jaminan" as const,
          note: "Rate sesuai polis tahun lalu, disetujui asuransi.",
        },
      ])
    ),
  }
  assert.deepEqual(fwtwdIssues(withNotes), [])
})

test("batas tersimpan dari panel Referensi Tarif OJK tetap didahulukan", () => {
  const slip = surabaya()
  const stored = {
    ...slip,
    rateLines: slip.rateLines.map((l) =>
      l.label === "FWTWD" ? { ...l, min: 0.4, max: 0.5, boundSource: "Referensi" } : l
    ),
  }
  const fwtwd = rateLinesWithBounds(stored).filter((l) => l.label === "FWTWD")
  assert.deepEqual(fwtwd.map((l) => [l.min, l.max, l.boundSource]), [
    [0.4, 0.5, "Referensi"],
    [0.4, 0.5, "Referensi"],
  ])
  assert.deepEqual(getPropertyRateBounds({ riskLocation: "" }), {})
})
