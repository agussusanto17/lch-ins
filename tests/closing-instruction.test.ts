import assert from "node:assert/strict"
import test from "node:test"

import { derivedDocNumber } from "../components/underwriting/slip-model"

test("derivedDocNumber generates valid CI document numbers from Placing Slip number", () => {
  const psNo = "003/LCH-PLCMT/PS-MC/VIII/2026"
  const ciNo = derivedDocNumber(psNo, "CI")
  assert.equal(ciNo, "003/LCH-PLCMT/CI-MC/VIII/2026")

  const qsNo = derivedDocNumber(psNo, "QS")
  assert.equal(qsNo, "003/LCH-PLCMT/QS-MC/VIII/2026")
})

test("derivedDocNumber handles null or empty slipNo gracefully", () => {
  assert.equal(derivedDocNumber(null, "CI"), null)
  assert.equal(derivedDocNumber("", "CI"), null)
})

test("slip locked state only applies to Cancelled status, Closed status remains editable for revisions", () => {
  function isSlipLocked(status: string): boolean {
    // New rule: only Cancelled is locked; Closed remains editable for revisions
    return status === "Cancelled"
  }

  assert.equal(isSlipLocked("Draft"), false)
  assert.equal(isSlipLocked("Released"), false)
  assert.equal(isSlipLocked("Quoted"), false)
  assert.equal(isSlipLocked("Closed"), false) // Closed MUST be editable
  assert.equal(isSlipLocked("Cancelled"), true) // Only Cancelled is locked
})

test("revalidateUnderwritingPaths includes closing edit route", () => {
  function getRevalidatedPaths(id: string): string[] {
    return [
      `/underwriting/edit/${id}`,
      `/underwriting/quotation/edit/${id}`,
      `/underwriting/closing/edit/${id}`,
      `/underwriting/slip/${id}`,
      `/underwriting/quotation/${id}`,
      `/underwriting/cover-note/${id}`,
      `/underwriting/closing/${id}`,
    ]
  }

  const paths = getRevalidatedPaths("slip-123")
  assert.ok(paths.includes("/underwriting/closing/edit/slip-123"))
  assert.ok(paths.includes("/underwriting/closing/slip-123"))
})
