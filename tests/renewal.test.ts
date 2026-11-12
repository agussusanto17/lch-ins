import assert from "node:assert/strict"
import test from "node:test"

import type { Policy } from "../lib/data/types"
import { isRenewable, renewalCandidates } from "../lib/renewal"

const TODAY = "2026-11-12"

const policy = (p: Partial<Policy> & Pick<Policy, "id" | "expiryDate">): Policy => ({
  policyNo: p.id,
  clientId: null,
  placingSlipId: null,
  parentPolicyId: null,
  insuredName: "PT Contoh",
  insurer: "PT Asuransi Contoh",
  insurers: [],
  cob: "Property",
  inceptionDate: "2026-01-01",
  currency: "IDR",
  sumInsured: 1_000_000,
  premium: 1_000,
  brokeragePct: 15,
  type: "Baru",
  riskLocation: "Jakarta",
  files: [],
  ...p,
})

const ids = (rows: Policy[]) => rows.map((p) => p.id)

test("hanya polis asal yang belum dibatalkan yang bisa diperpanjang", () => {
  assert.equal(isRenewable({ type: "Baru" }), true)
  assert.equal(isRenewable({ type: "Renewal", cancelled: false }), true)
  assert.equal(isRenewable({ type: "Renewal", cancelled: true }), false)
  assert.equal(isRenewable({ type: "Endorsement" }), false)
  assert.equal(isRenewable({ type: "Cancellation" }), false)
})

test("renewal notice tidak memuat polis yang dibatalkan, endorsement, dan pembatalan", () => {
  const policies = [
    policy({ id: "baru", expiryDate: "2026-12-20" }),
    policy({ id: "renewal", type: "Renewal", expiryDate: "2026-11-30" }),
    policy({ id: "batal", expiryDate: "2026-12-01", cancelled: true }),
    policy({
      id: "batal-cs",
      type: "Cancellation",
      parentPolicyId: "batal",
      expiryDate: "2026-12-01",
      cancelled: true,
    }),
    policy({ id: "baru-end", type: "Endorsement", parentPolicyId: "baru", expiryDate: "2026-12-20" }),
  ]
  assert.deepEqual(ids(renewalCandidates(policies, TODAY, 90, "all")), ["renewal", "baru"])
})

test("renewal notice mengikuti periode dan COB, urut dari yang paling dekat", () => {
  const policies = [
    policy({ id: "31-hari", expiryDate: "2026-12-13" }),
    policy({ id: "30-hari", expiryDate: "2026-12-12" }),
    policy({ id: "mv", cob: "Motor Vehicle", expiryDate: "2026-12-01" }),
    policy({ id: "hari-ini", expiryDate: TODAY }),
    policy({ id: "kemarin", expiryDate: "2026-11-11" }),
  ]
  assert.deepEqual(ids(renewalCandidates(policies, TODAY, 30, "all")), ["hari-ini", "mv", "30-hari"])
  assert.deepEqual(ids(renewalCandidates(policies, TODAY, 30, "Motor Vehicle")), ["mv"])
})
