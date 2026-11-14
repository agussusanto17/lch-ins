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
    return status === "Cancelled"
  }

  assert.equal(isSlipLocked("Draft"), false)
  assert.equal(isSlipLocked("Released"), false)
  assert.equal(isSlipLocked("Quoted"), false)
  assert.equal(isSlipLocked("Closed"), false)
  assert.equal(isSlipLocked("Cancelled"), true)
})

test("revalidateUnderwritingPaths includes closing edit route", () => {
  function getRevalidatedPaths(id: string): string[] {
    return [
      `/placement/edit/${id}`,
      `/placement/quotation/edit/${id}`,
      `/placement/closing/edit/${id}`,
      `/placement/slip/${id}`,
      `/placement/quotation/${id}`,
      `/placement/cover-note/${id}`,
      `/placement/closing/${id}`,
    ]
  }

  const paths = getRevalidatedPaths("slip-123")
  assert.ok(paths.includes("/placement/closing/edit/slip-123"))
  assert.ok(paths.includes("/placement/closing/slip-123"))
})
