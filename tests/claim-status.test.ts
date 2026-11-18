import assert from "node:assert/strict"
import test from "node:test"

import { isClaimLocked } from "../lib/claim-detail"
import { isOpenClaim } from "../lib/data/analytics"
import { CLAIM_STATUSES, OPEN_CLAIM_STATUSES } from "../lib/data/reference"
import { CLAIM_STATUS_CODES } from "../lib/form-options"

test("status klaim MoM poin 9: Partial Settle setelah Outstanding", () => {
  assert.deepEqual(CLAIM_STATUSES, [
    "Outstanding",
    "Partial Settle",
    "Settled",
    "Closed",
    "Rejected",
  ])
  assert.equal(CLAIM_STATUS_CODES["Partial Settle"], "partial_settle")
})

test("Partial Settle tetap dihitung klaim berjalan", () => {
  assert.deepEqual(OPEN_CLAIM_STATUSES, ["Outstanding", "Partial Settle"])
  assert.equal(isOpenClaim({ status: "Partial Settle" }), true)
  assert.equal(isOpenClaim({ status: "Settled" }), false)
  assert.equal(isOpenClaim({ status: "Closed" }), false)
})

test("hanya klaim Settled yang terkunci; Closed tetap bisa diubah", () => {
  assert.deepEqual(
    CLAIM_STATUSES.filter(isClaimLocked),
    ["Settled"]
  )
})
