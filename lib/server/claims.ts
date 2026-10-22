import "server-only"

import { Prisma } from "@/lib/generated/prisma/client"
import type { Claim, ClaimStatus, ClaimStage } from "@/lib/data/types"
import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/server/services/audit"

export interface ClaimRecord extends Omit<Claim, "policyNo"> {
  dbId: string
  policyNo?: string
  clientName?: string
}

export interface ClaimInput {
  policyId: string
  claimNo: string
  adjusterId?: string | null
  lossDate: string
  reportedDate?: string | null
  documentCompleteDate?: string | null
  spkDate?: string | null
  location?: string | null
  lossDescription?: string | null
  assetDescription?: string | null
  currencyCode: string
  estimatedLoss: number
  claimedAmount: number
  paidAmount: number
  statusId: string
  stageId: string
}

const claimIncludeRelations = {
  policy: {
    select: {
      policyNo: true,
      insuredName: true,
      cob: { select: { name: true } },
      insurers: {
        include: {
          insurer: { select: { name: true } },
        },
      },
    },
  },
  status: { select: { code: true } },
  stage: { select: { code: true } },
  adjuster: { select: { name: true } },
} as const

type PrismaClaimWithRelations = Prisma.ClaimGetPayload<{
  include: typeof claimIncludeRelations
}>

const statusCache = new Map<string, string>()
const stageCache = new Map<string, string>()

async function resolveStatusId(status: ClaimStatus): Promise<string> {
  const cached = statusCache.get(status)
  if (cached) return cached

  const record = await prisma.lookupValue.findFirst({
    where: { lookupType: "claim_status", code: status },
  })

  if (record) {
    statusCache.set(status, record.id)
    return record.id
  }

  throw new Error(`Claim status "${status}" not found in database`)
}

async function resolveStageId(stage: ClaimStage): Promise<string> {
  const cached = stageCache.get(stage)
  if (cached) return cached

  const record = await prisma.lookupValue.findFirst({
    where: { lookupType: "claim_stage", code: stage },
  })

  if (record) {
    stageCache.set(stage, record.id)
    return record.id
  }

  throw new Error(`Claim stage "${stage}" not found in database`)
}

function toClaimRecord(record: PrismaClaimWithRelations): ClaimRecord {
  const primaryInsurer = record.policy?.insurers?.[0]?.insurer?.name || ""
  return {
    dbId: record.id,
    id: record.claimNo,
    claimNo: record.claimNo,
    policyId: record.policyId,
    policyNo: record.policy?.policyNo || "",
    insuredName: record.policy?.insuredName || "",
    insurer: primaryInsurer,
    cob: record.policy?.cob?.name as Claim["cob"],
    currency: record.currencyCode,
    lossDate: record.lossDate.toISOString().slice(0, 10),
    reportedDate: record.reportedDate ? record.reportedDate.toISOString().slice(0, 10) : null,
    documentCompleteDate: record.documentCompleteDate ? record.documentCompleteDate.toISOString().slice(0, 10) : null,
    spkDate: record.spkDate ? record.spkDate.toISOString().slice(0, 10) : null,
    location: record.location || "",
    lossDescription: record.lossDescription || "",
    assetDescription: record.assetDescription || "",
    estimatedLoss: Number(record.estimatedLoss),
    claimedAmount: Number(record.claimedAmount),
    paidAmount: Number(record.paidAmount),
    adjuster: record.adjuster?.name || "",
    status: (record.status?.code as ClaimStatus) || "Outstanding",
    stage: (record.stage?.code as ClaimStage) || "Tunggu Dokumen",
    notes: record.notes || "",
  }
}

export async function listClaims(): Promise<ClaimRecord[]> {
  const records = await prisma.claim.findMany({
    include: claimIncludeRelations,
    orderBy: { lossDate: "desc" },
  })

  return records.map(toClaimRecord)
}

export async function getClaimById(id: string): Promise<ClaimRecord | null> {
  const record = await prisma.claim.findUnique({
    where: { id },
    include: claimIncludeRelations,
  })

  return record ? toClaimRecord(record) : null
}

export async function getClaimByNo(claimNo: string): Promise<ClaimRecord | null> {
  const record = await prisma.claim.findUnique({
    where: { claimNo },
    include: claimIncludeRelations,
  })

  return record ? toClaimRecord(record) : null
}

export async function createClaim(
  input: ClaimInput,
  userId: string
): Promise<ClaimRecord> {
  const [statusId, stageId] = await Promise.all([
    resolveStatusId("Outstanding"),
    resolveStageId("Tunggu Dokumen"),
  ])

  const record = await prisma.claim.create({
    data: {
      claimNo: input.claimNo,
      policyId: input.policyId,
      adjusterId: input.adjusterId,
      lossDate: new Date(input.lossDate),
      reportedDate: input.reportedDate ? new Date(input.reportedDate) : null,
      documentCompleteDate: input.documentCompleteDate ? new Date(input.documentCompleteDate) : null,
      spkDate: input.spkDate ? new Date(input.spkDate) : null,
      location: input.location ?? undefined,
      lossDescription: input.lossDescription ?? undefined,
      assetDescription: input.assetDescription ?? undefined,
      currencyCode: input.currencyCode,
      estimatedLoss: input.estimatedLoss,
      claimedAmount: input.claimedAmount,
      paidAmount: input.paidAmount,
      statusId,
      stageId,
    },
    include: claimIncludeRelations,
  })

  await recordAudit(prisma, {
    userId,
    entity: "claims",
    entityId: record.id,
    action: "Create",
    before: null,
    after: {
      claimNo: record.claimNo,
      policyId: record.policyId,
    },
  })

  return toClaimRecord(record)
}

export async function updateClaim(
  id: string,
  input: ClaimInput,
  userId: string
): Promise<ClaimRecord> {
  const existing = await prisma.claim.findUnique({ where: { id } })
  if (!existing) {
    throw new Error(`Claim dengan ID ${id} tidak ditemukan.`)
  }

  const record = await prisma.claim.update({
    where: { id },
    data: {
      claimNo: input.claimNo,
      policyId: input.policyId,
      adjusterId: input.adjusterId,
      lossDate: new Date(input.lossDate),
      reportedDate: input.reportedDate ? new Date(input.reportedDate) : null,
      documentCompleteDate: input.documentCompleteDate ? new Date(input.documentCompleteDate) : null,
      spkDate: input.spkDate ? new Date(input.spkDate) : null,
      location: input.location ?? undefined,
      lossDescription: input.lossDescription ?? undefined,
      assetDescription: input.assetDescription ?? undefined,
      currencyCode: input.currencyCode,
      estimatedLoss: input.estimatedLoss,
      claimedAmount: input.claimedAmount,
      paidAmount: input.paidAmount,
    },
    include: claimIncludeRelations,
  })

  await recordAudit(prisma, {
    userId,
    entity: "claims",
    entityId: id,
    action: "Update",
    before: {
      claimNo: existing.claimNo,
    },
    after: {
      claimNo: record.claimNo,
    },
  })

  return toClaimRecord(record)
}

export async function updateClaimStatus(
  id: string,
  status: ClaimStatus,
  userId: string
): Promise<ClaimRecord> {
  const existing = await prisma.claim.findUnique({ where: { id } })
  if (!existing) {
    throw new Error(`Claim dengan ID ${id} tidak ditemukan.`)
  }

  const statusId = await resolveStatusId(status)

  const record = await prisma.claim.update({
    where: { id },
    data: {
      statusId,
    },
    include: claimIncludeRelations,
  })

  await recordAudit(prisma, {
    userId,
    entity: "claims",
    entityId: id,
    action: "Update",
    before: { statusId: existing.statusId },
    after: { statusId: record.statusId },
  })

  return toClaimRecord(record)
}

export async function deleteClaim(id: string, userId: string): Promise<void> {
  const existing = await prisma.claim.findUnique({ where: { id } })
  if (!existing) {
    throw new Error(`Claim dengan ID ${id} tidak ditemukan.`)
  }

  const paymentCount = await prisma.payment.count({ where: { claimId: id } })
  if (paymentCount > 0) {
    throw new Error("Claim sudah memiliki pembayaran dan tidak dapat dihapus.")
  }

  await prisma.claim.delete({ where: { id } })

  await recordAudit(prisma, {
    userId,
    entity: "claims",
    entityId: id,
    action: "Delete",
    before: {
      claimNo: existing.claimNo,
    },
    after: null,
  })
}

export async function seedInitialClaimsIfEmpty(): Promise<number> {
  const count = await prisma.claim.count()
  if (count > 0) return 0

  const statuses = await prisma.lookupValue.findMany({
    where: { lookupType: "claim_status" },
    select: { id: true, code: true },
  })

  const statusMap = Object.fromEntries(statuses.map((s) => [s.code, s.id]))

  const stages = await prisma.lookupValue.findMany({
    where: { lookupType: "claim_stage" },
    select: { id: true, code: true },
  })

  const stageMap = Object.fromEntries(stages.map((s) => [s.code, s.id]))

  const policy = await prisma.policy.findFirst()
  if (!policy) return 0

  const seedData = [
    {
      claimNo: "CLM/2026/08/0031",
      lossDate: "2026-08-04",
      reportedDate: "2026-08-05",
      documentCompleteDate: "2026-08-12",
      spkDate: null,
      location: "Grand Sentosa Mall — Lantai B1, area food court",
      lossDescription:
        "Kebocoran pipa sprinkler pada plafon area food court menyebabkan kerusakan pada plafon, lantai vinyl, dan peralatan tenant.",
      assetDescription:
        "Plafon gypsum 340 m², lantai vinyl 210 m², 4 unit chiller display tenant",
      estimatedLoss: 620_000_000,
      claimedAmount: 585_000_000,
      paidAmount: 0,
      statusId: statusMap["Outstanding"],
      stageId: stageMap["Proses Adjuster"],
    },
    {
      claimNo: "CLM/2026/07/0028",
      lossDate: "2026-07-19",
      reportedDate: "2026-07-19",
      documentCompleteDate: "2026-07-24",
      spkDate: "2026-07-29",
      location: "Jl. Tol Jakarta–Cikampek Km 37, Bekasi",
      lossDescription:
        "Tabrakan beruntun melibatkan 2 unit Colt Diesel. Kerusakan pada bagian depan kendaraan dan kabin.",
      assetDescription:
        "Mitsubishi Colt Diesel FE 74 HD — B 9214 TYU dan B 9377 TYU",
      estimatedLoss: 285_000_000,
      claimedAmount: 271_400_000,
      paidAmount: 264_900_000,
      statusId: statusMap["Settled"],
      stageId: stageMap["SPK / SPGR terbit"],
    },
  ]

  let created = 0
  for (const item of seedData) {
    await prisma.claim.create({
      data: {
        claimNo: item.claimNo,
        policyId: policy.id,
        lossDate: new Date(item.lossDate),
        reportedDate: item.reportedDate ? new Date(item.reportedDate) : null,
        documentCompleteDate: item.documentCompleteDate ? new Date(item.documentCompleteDate) : null,
        spkDate: item.spkDate ? new Date(item.spkDate) : null,
        location: item.location ?? undefined,
        lossDescription: item.lossDescription ?? undefined,
        assetDescription: item.assetDescription ?? undefined,
        currencyCode: "IDR",
        estimatedLoss: item.estimatedLoss,
        claimedAmount: item.claimedAmount,
        paidAmount: item.paidAmount,
        statusId: item.statusId,
        stageId: item.stageId,
      },
    })
    created++
  }

  return created
}
