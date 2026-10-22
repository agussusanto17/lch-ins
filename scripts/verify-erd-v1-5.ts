import { prisma } from "../lib/prisma"

async function main() {
  console.log("=== VERIFY ERD V1.5 RELATIONAL MODELS ===")

  // 1. Sources
  const sources = await prisma.source.findMany()
  if (sources.length < 3) {
    throw new Error(`Expected at least 3 sources, got ${sources.length}`)
  }
  console.log(`Sources verified: ${sources.length} records (${sources.map((s) => s.code).join(", ")})`)

  // 2. CoverType Priority
  const prioritized = await prisma.coverType.findMany({
    where: { priority: { not: null } },
  })
  if (prioritized.length === 0) {
    throw new Error("Expected cover_types with priority set")
  }
  console.log(`CoverType priorities verified: ${prioritized.length} records`)

  // 3. ClaimDocumentType
  const docTypes = await prisma.claimDocumentType.findMany({
    include: { cob: true },
  })
  if (docTypes.length === 0) {
    throw new Error("Expected seeded claim_document_types")
  }
  console.log(`Claim document types verified: ${docTypes.length} records across COBs`)

  // 4. Test InsurerClaimPic with a temporary insurer
  const testInsurer = await prisma.insurer.create({
    data: {
      name: "PT Asuransi Uji Integrasi",
      email: "test-claim@insurer.example",
      isActive: true,
    },
  })

  const cobProperty = await prisma.classOfBusiness.findFirst({
    where: { code: "01" },
  })

  const testPic = await prisma.insurerClaimPic.create({
    data: {
      insurerId: testInsurer.id,
      cobId: cobProperty?.id,
      name: "Budi Santoso",
      mobile: "081234567890",
      email: "budi.klaim@insurer.example",
      notes: "PIC Klaim Property & Harta Benda",
    },
  })
  console.log(`InsurerClaimPic created: ${testPic.name} (id: ${testPic.id})`)

  // 5. Test ClientInsurerCode with first client
  const client = await prisma.client.findFirst()
  if (client) {
    const clientCode = await prisma.clientInsurerCode.create({
      data: {
        clientId: client.id,
        insurerId: testInsurer.id,
        code: "TEST-LCH-001",
      },
    })
    console.log(`ClientInsurerCode created: ${clientCode.code}`)

    // Test unique constraint
    let caughtUniqueError = false
    try {
      await prisma.clientInsurerCode.create({
        data: {
          clientId: client.id,
          insurerId: testInsurer.id,
          code: "DUPLICATE-CODE",
        },
      })
    } catch {
      caughtUniqueError = true
    }
    if (!caughtUniqueError) {
      throw new Error("Expected unique constraint violation for client_id + insurer_id")
    }
    console.log("ClientInsurerCode unique constraint verified")

    await prisma.clientInsurerCode.delete({ where: { id: clientCode.id } })
  }

  // 6. Test ClaimDocument and ClaimFollowup with first claim
  const claim = await prisma.claim.findFirst()
  const user = await prisma.user.findFirst()
  if (claim && user) {
    const firstDocType = docTypes[0]
    const doc = await prisma.claimDocument.create({
      data: {
        claimId: claim.id,
        documentTypeId: firstDocType?.id,
        isReceived: true,
        receivedDate: new Date("2026-10-22"),
        notes: "Uji berkas klaim",
      },
    })
    console.log(`ClaimDocument created: ${doc.id}`)

    const followup = await prisma.claimFollowup.create({
      data: {
        claimId: claim.id,
        followupDate: new Date("2026-10-22"),
        note: "Menunggu kelengkapan dokumen pendukung dari tertanggung",
        createdById: user.id,
      },
    })
    console.log(`ClaimFollowup created: ${followup.id}`)

    // Clean up claim test records
    await prisma.claimDocument.delete({ where: { id: doc.id } })
    await prisma.claimFollowup.delete({ where: { id: followup.id } })
    console.log("Claim documents and followups cleanup verified")
  }

  // Clean up test insurer and cascade to PIC
  await prisma.insurer.delete({ where: { id: testInsurer.id } })
  const picCheck = await prisma.insurerClaimPic.findUnique({
    where: { id: testPic.id },
  })
  if (picCheck) {
    throw new Error("Expected InsurerClaimPic to be deleted on cascade")
  }
  console.log("Cascade delete on insurer -> claim pics verified")

  console.log("=== ALL ERD V1.5 RELATIONAL MODEL TESTS PASSED ===")
}

main()
  .catch((e) => {
    console.error("Test failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
