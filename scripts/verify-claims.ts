import { prisma } from "../lib/prisma"
import {
  createClaim,
  deleteClaim,
  listClaims,
  updateClaim,
  updateClaimStatus,
} from "../lib/server/claims"

async function main() {
  console.log("=== VERIFY CLAIMS POSTGRES INTEGRATION ===")

  const user = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true, email: true, role: true },
  })
  if (!user) {
    throw new Error("No active user found in database")
  }
  console.log(`Using user: ${user.email} (${user.role})`)

  const policy = await prisma.policy.findFirst({
    include: {
      cob: true,
      insurers: {
        include: { insurer: true },
      },
    },
  })
  if (!policy) {
    throw new Error("No policy found in database to test claim against")
  }
  console.log(`Using policy: ${policy.policyNo} - ${policy.insuredName}`)

  const existingClaims = await listClaims()
  console.log(`Existing claims count: ${existingClaims.length}`)

  const testClaimInput = {
    policyId: policy.id,
    lossDate: "2026-10-15",
    reportedDate: "2026-10-16",
    documentCompleteDate: "2026-10-20",
    spkDate: null,
    location: "Gudang Logistik Cikarang",
    lossDescription: "Kerusakan atap gudang akibat angin kencang",
    assetDescription: "Gedung struktur baja dan atap seng",
    currencyCode: policy.currencyCode,
    estimatedLoss: 75000000,
    claimedAmount: 68000000,
    paidAmount: 0,
    status: "Outstanding" as const,
    stage: "Tunggu Dokumen" as const,
    notes: "Uji integrasi server actions",
  }

  let createdId: string | null = null
  try {
    const created = await createClaim(testClaimInput, user.id)
    createdId = created.dbId
    console.log(`Created claim: ${created.claimNo} (dbId: ${created.dbId})`)

    if (!created.claimNo.includes("CLM")) {
      throw new Error(`Expected claimNo to contain CLM, got: ${created.claimNo}`)
    }

    const createAudit = await prisma.auditLog.findFirst({
      where: {
        entity: "claims",
        entityId: created.dbId,
        action: "Create",
      },
    })
    if (!createAudit) {
      throw new Error("Audit log for claim create not found")
    }
    console.log("Audit log create verified")

    const updated = await updateClaim(
      created.dbId,
      {
        ...testClaimInput,
        estimatedLoss: 80000000,
        notes: "Catatan diperbarui saat uji integrasi",
      },
      user.id
    )
    console.log(`Updated claim estimatedLoss: ${updated.estimatedLoss}`)
    if (updated.estimatedLoss !== 80000000) {
      throw new Error("Update claim did not reflect new estimatedLoss")
    }

    const statusUpdated = await updateClaimStatus(created.dbId, "Settled", user.id)
    console.log(`Updated claim status: ${statusUpdated.status}`)
    if (statusUpdated.status !== "Settled") {
      throw new Error("Update claim status did not reflect 'Settled'")
    }

    await deleteClaim(created.dbId, user.id)
    console.log("Claim successfully deleted")

    const deletedCheck = await prisma.claim.findUnique({
      where: { id: created.dbId },
    })
    if (deletedCheck) {
      throw new Error("Claim still exists after delete")
    }

    const deleteAudit = await prisma.auditLog.findFirst({
      where: {
        entity: "claims",
        entityId: created.dbId,
        action: "Delete",
      },
    })
    if (!deleteAudit) {
      throw new Error("Audit log for claim delete not found")
    }
    console.log("Audit log delete verified")
    createdId = null
  } finally {
    if (createdId) {
      await prisma.claim.delete({ where: { id: createdId } }).catch(() => {})
    }
  }

  console.log("=== ALL CLAIMS TESTS PASSED ===")
}

main()
  .catch((e) => {
    console.error("Test failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
