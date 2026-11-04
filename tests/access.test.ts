import assert from "node:assert/strict"
import test from "node:test"

import { ACCESS_MATRIX, canAccess } from "../lib/access"

const adminOnlyPaths = [
  "/master-data",
  "/master-data/cob",
  "/master-data/tariff-ojk",
  "/underwriting/master-clauses",
]

const nonAdminRoles = [
  "marketing",
  "placement",
  "claim",
  "finance",
  "accounting",
  "direksi",
]

test("only admin can access Master Data, Master Clauses, and Reports", () => {
  for (const path of adminOnlyPaths) {
    assert.equal(canAccess(["admin"], path), true, `${path} should allow admin`)
    for (const role of nonAdminRoles) {
      assert.equal(
        canAccess([role], path),
        false,
        `${path} should deny ${role}`
      )
    }
  }
})

test("ACCESS_MATRIX restricts master menus to admin and reports to admin and placement", () => {
  const adminOnly = ["kelola", "tidak", "tidak", "tidak", "tidak", "tidak", "tidak"]
  for (const path of ["/master-data", "/underwriting/master-clauses"]) {
    assert.deepEqual(ACCESS_MATRIX[path], adminOnly)
  }
  assert.deepEqual(ACCESS_MATRIX["/reports"], ["kelola", "tidak", "kelola", "tidak", "tidak", "tidak", "tidak"])
})

test("placement can manage the reports menu", () => {
  assert.equal(canAccess(["placement"], "/reports"), true)
  assert.equal(canAccess(["placement"], "/reports/export"), true)
})
