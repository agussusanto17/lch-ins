import assert from "node:assert/strict"
import test from "node:test"

import { NAV_GROUPS } from "../components/layout/nav-items"
import { userRoleBadgeVariants } from "../components/users/user-role-badge"
import {
  ACCESS_MATRIX,
  canAccess,
  canManage,
  canSeeReportClaims,
  isValidRoleCode,
  validateRoleCodes,
} from "../lib/access"

const adminOnlyPaths = [
  "/master-data",
  "/master-data/cob",
  "/master-data/tariff-ojk",
  "/placement/master-clauses",
]

const nonAdminRoles = [
  "marketing",
  "placement",
  "claim",
  "finance",
  "accounting",
  "direksi",
  "policy_admin",
]

test("only admin can access Master Data and Master Clauses", () => {
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

test("ACCESS_MATRIX restricts master menus to admin and opens reports read-only to marketing, claim, and direksi", () => {
  const adminOnly = [
    "kelola",
    "tidak",
    "tidak",
    "tidak",
    "tidak",
    "tidak",
    "tidak",
    "tidak",
  ]
  for (const path of ["/master-data", "/placement/master-clauses"]) {
    assert.deepEqual(ACCESS_MATRIX[path], adminOnly)
  }
  assert.deepEqual(ACCESS_MATRIX["/reports"], [
    "kelola", // admin
    "lihat", // marketing
    "kelola", // placement
    "lihat", // claim
    "tidak", // finance
    "tidak", // accounting
    "lihat", // direksi
    "tidak", // policy_admin
  ])
})

test("placement can manage the reports menu", () => {
  assert.equal(canAccess(["placement"], "/reports"), true)
  assert.equal(canAccess(["placement"], "/reports/export"), true)
})

test("marketing, claim, and direksi can view Report Operational but not manage it", () => {
  for (const role of ["marketing", "claim", "direksi"]) {
    assert.equal(canAccess([role], "/reports"), true, `${role} should open /reports`)
    assert.equal(canManage([role], "/reports"), false, `${role} should not manage /reports`)
  }
  for (const role of ["finance", "accounting", "policy_admin"]) {
    assert.equal(canAccess([role], "/reports"), false, `${role} should not open /reports`)
  }
})

test("Report Operational hides claims only from placement without a claim-visible role", () => {
  assert.equal(canSeeReportClaims(["placement"]), false)
  assert.equal(canSeeReportClaims(["marketing", "placement"]), true)
  assert.equal(canSeeReportClaims(["admin", "placement"]), true)
  for (const role of ["admin", "marketing", "claim", "direksi"]) {
    assert.equal(canSeeReportClaims([role]), true, `${role} should see claims`)
  }
  assert.equal(canSeeReportClaims(undefined), false)
  assert.equal(canSeeReportClaims([]), false)
})

test("policy_admin is a valid canonical role", () => {
  assert.equal(isValidRoleCode("policy_admin"), true)
  assert.deepEqual(validateRoleCodes(["policy_admin"]), {
    valid: true,
    roles: ["policy_admin"],
  })
})

test("policy_admin has view-only access to Marketing and Placement", () => {
  for (const path of ["/marketing", "/placement"]) {
    assert.equal(canAccess(["policy_admin"], path), true, `${path} should be accessible`)
    assert.equal(canManage(["policy_admin"], path), false, `${path} should not be manageable`)
  }
})

test("policy_admin has CRUD access to Policy Database", () => {
  assert.equal(canAccess(["policy_admin"], "/policies"), true)
  assert.equal(canManage(["policy_admin"], "/policies"), true)
})

test("policy_admin cannot access other restricted modules", () => {
  const deniedPaths = [
    "/claims",
    "/finance",
    "/finance/notes",
    "/finance/payments",
    "/finance/receivables",
    "/accounting",
    "/accounting/journal",
    "/accounting/statements",
    "/master-data",
    "/placement/master-clauses",
    "/reports",
    "/users",
    "/audit-trail",
    "/settings",
  ]
  for (const path of deniedPaths) {
    assert.equal(canAccess(["policy_admin"], path), false, `${path} should be denied`)
  }
})

test("policy_admin subpath resolution respects longest prefix matching", () => {
  // Subpaths under /placement inherit view-only except master-clauses
  assert.equal(canAccess(["policy_admin"], "/placement/slips"), true)
  assert.equal(canManage(["policy_admin"], "/placement/slips"), false)
  assert.equal(canAccess(["policy_admin"], "/placement/cover-notes"), true)
  assert.equal(canManage(["policy_admin"], "/placement/cover-notes"), false)

  // Master clauses has its own stricter row (admin only)
  assert.equal(canAccess(["policy_admin"], "/placement/master-clauses"), false)
  assert.equal(canAccess(["policy_admin"], "/placement/master-clauses/new"), false)

  // Subpaths under /policies inherit kelola
  assert.equal(canAccess(["policy_admin"], "/policies/new"), true)
  assert.equal(canManage(["policy_admin"], "/policies/new"), true)
  assert.equal(canAccess(["policy_admin"], "/policies/123"), true)
  assert.equal(canManage(["policy_admin"], "/policies/123"), true)
})

test("multi-role composition with policy_admin applies least restrictive level", () => {
  // policy_admin (view-only) + marketing (kelola) -> kelola on marketing, kelola on policies
  const combined = ["policy_admin", "marketing"]
  assert.equal(canManage(combined, "/marketing"), true)
  assert.equal(canManage(combined, "/policies"), true)
  // Both roles are denied on accounting
  assert.equal(canAccess(combined, "/accounting/journal"), false)
})

test("policy_admin sidebar navigation filtering displays only permitted groups and items", () => {
  const allowedGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => canAccess(["policy_admin"], item.href)),
  })).filter((group) => group.items.length > 0)

  assert.deepEqual(
    allowedGroups.map((g) => g.label),
    ["Ringkasan", "Operasional"]
  )

  const operationalTitles = allowedGroups
    .find((g) => g.label === "Operasional")
    ?.items.map((i) => i.title)
  assert.deepEqual(operationalTitles, ["Marketing", "Placement", "Policy Database"])
})

test("policy_admin role badge variant produces appropriate styling tokens", () => {
  const classes = userRoleBadgeVariants({ roleVariant: "policy_admin" })
  assert.ok(classes.includes("bg-indigo-500/10"))
  assert.ok(classes.includes("text-indigo-700"))
  assert.ok(classes.includes("dark:text-indigo-300"))
})



