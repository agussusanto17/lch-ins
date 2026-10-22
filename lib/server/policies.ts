/**
 * Policy Database Layer
 *
 * Provides PostgreSQL persistence for Policy entities with full CRUD operations,
 * insurer management, and audit logging.
 */

import "server-only"

import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/server/services/audit"

import type { Policy, PolicyFile, SecurityPanelRow } from "@/lib/data/types"

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface PolicyRecord {
  dbId: string
  id: string
  policyNo: string
  clientId: string | null
  clientName?: string
  cob: string
  coverTypeId?: string | null
  coverType?: string
  inceptionDate: string
  expiryDate: string
  currency: string
  sumInsured: number
  premium: number
  brokeragePct: number
  type: string
  riskLocation?: string
  insurers: SecurityPanelRow[]
  files: PolicyFile[]
  placingSlipId?: string | null
  parentPolicyId?: string | null
  insuredName: string
  insurer: string
}

export interface PolicyInput {
  policyNo: string
  clientId: string
  placingSlipId?: string | null
  parentPolicyId?: string | null
  insuredName: string
  insurer: string
  insurers: SecurityPanelRow[]
  cob: string
  coverTypeId?: string | null
  coverType?: string
  inceptionDate: string
  expiryDate: string
  currency: string
  sumInsured: number
  premium: number
  brokeragePct: number
  type: string
  riskLocation: string
}

// ---------------------------------------------------------------------------
// Lookup Resolution
// ---------------------------------------------------------------------------

const cobCache = new Map<string, string>()
const policyTypeCache = new Map<string, string>()
const coverTypeCache = new Map<string, string>()

async function resolveCobId(cob: string): Promise<string> {
  const cached = cobCache.get(cob)
  if (cached) return cached

  const record = await prisma.classOfBusiness.findFirst({
    where: { name: cob },
  })

  if (record) {
    cobCache.set(cob, record.id)
    return record.id
  }

  throw new Error(`Class of Business "${cob}" not found in database`)
}

async function resolvePolicyTypeId(type: string): Promise<string> {
  const cached = policyTypeCache.get(type)
  if (cached) return cached

  const record = await prisma.lookupValue.findFirst({
    where: { lookupType: "policy_type", code: type },
  })

  if (record) {
    policyTypeCache.set(type, record.id)
    return record.id
  }

  throw new Error(`Policy type "${type}" not found in database`)
}

async function resolveCoverTypeId(coverType: string): Promise<string | null> {
  const cached = coverTypeCache.get(coverType)
  if (cached) return cached

  const record = await prisma.coverType.findFirst({
    where: { name: coverType },
  })

  if (record) {
    coverTypeCache.set(coverType, record.id)
    return record.id
  }

  return null
}

// ---------------------------------------------------------------------------
// Mapping Functions
// ---------------------------------------------------------------------------

function toPolicyRecord(record: any): PolicyRecord {
  return {
    dbId: record.id,
    id: record.id,
    policyNo: record.policyNo,
    clientId: record.clientId,
    clientName: record.client?.name,
    cob: record.cob?.name || record.cob,
    coverTypeId: record.coverTypeId,
    coverType: record.coverType?.name,
    inceptionDate: record.inceptionDate,
    expiryDate: record.expiryDate,
    currency: record.currencyCode,
    sumInsured: Number(record.sumInsured),
    premium: Number(record.premium),
    brokeragePct: Number(record.brokeragePct),
    type: record.policyType?.code || "Baru",
    riskLocation: record.riskLocation,
    insurers: record.insurers?.map((i: any) => ({
      id: i.id,
      insurer: i.insurer?.name || "",
      share: Number(i.sharePct),
      role: i.position?.code as string,
    })) || [],
    files: record.files?.map((f: any) => ({
      id: f.id,
      version: f.version,
      fileName: f.fileName,
      uploadedAt: f.uploadedAt,
    })) || [],
    placingSlipId: record.placingSlipId,
    parentPolicyId: record.parentPolicyId,
    insuredName: record.insuredName,
    insurer: "",
  }
}

// ---------------------------------------------------------------------------
// Query Operations
// ---------------------------------------------------------------------------

export async function listPolicies(): Promise<PolicyRecord[]> {
  const records = await prisma.policy.findMany({
    include: {
      client: { select: { name: true } },
      cob: { select: { name: true } },
      coverType: { select: { name: true } },
      policyType: { select: { code: true } },
      insurers: {
        include: {
          insurer: { select: { name: true } },
          position: { select: { code: true } },
        },
      },
      files: true,
    },
    orderBy: { expiryDate: "desc" },
  })

  return records.map(toPolicyRecord)
}

export async function getPolicyById(id: string): Promise<PolicyRecord | null> {
  const record = await prisma.policy.findUnique({
    where: { id },
    include: {
      client: { select: { name: true } },
      cob: { select: { name: true } },
      coverType: { select: { name: true } },
      policyType: { select: { code: true } },
      insurers: {
        include: {
          insurer: { select: { name: true } },
          position: { select: { code: true } },
        },
      },
      files: true,
    },
  })

  return record ? toPolicyRecord(record) : null
}

export async function getPolicyByNo(policyNo: string): Promise<PolicyRecord | null> {
  const record = await prisma.policy.findUnique({
    where: { policyNo },
    include: {
      client: { select: { name: true } },
      cob: { select: { name: true } },
      coverType: { select: { name: true } },
      policyType: { select: { code: true } },
      insurers: {
        include: {
          insurer: { select: { name: true } },
          position: { select: { code: true } },
        },
      },
      files: true,
    },
  })

  return record ? toPolicyRecord(record) : null
}

// ---------------------------------------------------------------------------
// Mutation Operations
// ---------------------------------------------------------------------------

export async function createPolicy(
  input: PolicyInput,
  userId: string
): Promise<PolicyRecord> {
  const cobId = await resolveCobId(input.cob)
  const policyTypeId = await resolvePolicyTypeId(input.type)
  const coverTypeId = input.coverTypeId || (input.coverType ? await resolveCoverTypeId(input.coverType) : null)

  const record = await prisma.policy.create({
    data: {
      policyNo: input.policyNo,
      clientId: input.clientId,
      placingSlipId: input.placingSlipId ?? undefined,
      parentPolicyId: input.parentPolicyId ?? undefined,
      insuredName: input.insuredName,
      cobId,
      coverTypeId: coverTypeId ?? undefined,
      inceptionDate: new Date(input.inceptionDate),
      expiryDate: new Date(input.expiryDate),
      currencyCode: input.currency,
      sumInsured: input.sumInsured,
      premium: input.premium,
      brokeragePct: input.brokeragePct,
      policyTypeId,
      riskLocation: input.riskLocation ?? undefined,
    },
    include: {
      client: { select: { name: true } },
      cob: { select: { name: true } },
      coverType: { select: { name: true } },
      policyType: { select: { code: true } },
      insurers: {
        include: {
          insurer: { select: { name: true } },
          position: { select: { code: true } },
        },
      },
      files: true,
    },
  })

  await recordAudit(prisma, {
    userId,
    entity: "policies",
    entityId: record.id,
    action: "Create",
    before: null,
    after: {
      policyNo: record.policyNo,
      insuredName: record.insuredName,
    },
  })

  return toPolicyRecord(record)
}

export async function updatePolicy(
  id: string,
  input: PolicyInput,
  userId: string
): Promise<PolicyRecord> {
  const existing = await prisma.policy.findUnique({ where: { id } })
  if (!existing) {
    throw new Error(`Policy dengan ID ${id} tidak ditemukan.`)
  }

  const cobId = await resolveCobId(input.cob)
  const policyTypeId = await resolvePolicyTypeId(input.type)
  const coverTypeId = input.coverTypeId || (input.coverType ? await resolveCoverTypeId(input.coverType) : null)

  const record = await prisma.policy.update({
    where: { id },
    data: {
      policyNo: input.policyNo,
      clientId: input.clientId,
      placingSlipId: input.placingSlipId ?? undefined,
      parentPolicyId: input.parentPolicyId ?? undefined,
      insuredName: input.insuredName,
      cobId,
      coverTypeId: coverTypeId ?? undefined,
      inceptionDate: new Date(input.inceptionDate),
      expiryDate: new Date(input.expiryDate),
      currencyCode: input.currency,
      sumInsured: input.sumInsured,
      premium: input.premium,
      brokeragePct: input.brokeragePct,
      policyTypeId,
      riskLocation: input.riskLocation ?? undefined,
    },
    include: {
      client: { select: { name: true } },
      cob: { select: { name: true } },
      coverType: { select: { name: true } },
      policyType: { select: { code: true } },
      insurers: {
        include: {
          insurer: { select: { name: true } },
          position: { select: { code: true } },
        },
      },
      files: true,
    },
  })

  await recordAudit(prisma, {
    userId,
    entity: "policies",
    entityId: id,
    action: "Update",
    before: {
      policyNo: existing.policyNo,
      insuredName: existing.insuredName,
    },
    after: {
      policyNo: record.policyNo,
      insuredName: record.insuredName,
    },
  })

  return toPolicyRecord(record)
}

export async function updatePolicyInsurers(
  id: string,
  insurers: SecurityPanelRow[],
  userId: string
): Promise<PolicyRecord> {
  const existing = await prisma.policy.findUnique({
    where: { id },
    include: { insurers: { include: { insurer: { select: { name: true } }, position: { select: { code: true } } } } },
  })
  if (!existing) {
    throw new Error(`Policy dengan ID ${id} tidak ditemukan.`)
  }

  await prisma.policyInsurer.deleteMany({ where: { policyId: id } })

  for (const insurer of insurers) {
    await prisma.policyInsurer.create({
      data: {
        policyId: id,
        insurerId: insurer.id,
        sharePct: insurer.share,
        positionId: insurer.role === "As Leader" ? "leader" : "member",
      },
    })
  }

  const record = await prisma.policy.findUnique({
    where: { id },
    include: {
      client: { select: { name: true } },
      cob: { select: { name: true } },
      coverType: { select: { name: true } },
      policyType: { select: { code: true } },
      insurers: {
        include: {
          insurer: { select: { name: true } },
          position: { select: { code: true } },
        },
      },
      files: true,
    },
  })

  if (!record) {
    throw new Error(`Policy dengan ID ${id} tidak ditemukan setelah update.`)
  }

  await recordAudit(prisma, {
    userId,
    entity: "policies",
    entityId: id,
    action: "Update",
    before: { insurers: existing.insurers },
    after: { insurers: insurers },
  })

  return toPolicyRecord(record)
}

export async function deletePolicy(id: string, userId: string): Promise<void> {
  const existing = await prisma.policy.findUnique({ where: { id } })
  if (!existing) {
    throw new Error(`Policy dengan ID ${id} tidak ditemukan.`)
  }

  const claimCount = await prisma.claim.count({ where: { policyId: id } })
  if (claimCount > 0) {
    throw new Error("Policy sudah memiliki klaim dan tidak dapat dihapus.")
  }

  const debitNoteCount = await prisma.debitNote.count({ where: { policyId: id } })
  if (debitNoteCount > 0) {
    throw new Error("Policy sudah memiliki debit note dan tidak dapat dihapus.")
  }

  await prisma.policy.delete({ where: { id } })

  await recordAudit(prisma, {
    userId,
    entity: "policies",
    entityId: id,
    action: "Delete",
    before: {
      policyNo: existing.policyNo,
      insuredName: existing.insuredName,
    },
    after: null,
  })
}

// ---------------------------------------------------------------------------
// Auto-seeding
// ---------------------------------------------------------------------------

export async function seedInitialPoliciesIfEmpty(): Promise<number> {
  const count = await prisma.policy.count()
  if (count > 0) return 0

  const cob = await prisma.classOfBusiness.findFirst({ where: { name: "Property" } })
  if (!cob) return 0

  const policyTypes = await prisma.lookupValue.findMany({
    where: { lookupType: "policy_type" },
    select: { id: true, code: true },
  })

  const typeMap = Object.fromEntries(policyTypes.map((t) => [t.code, t.id]))

  const coverTypes = await prisma.coverType.findMany({
    select: { id: true, name: true },
  })

  const coverTypeMap = Object.fromEntries(coverTypes.map((c) => [c.name, c.id]))

  const seedData = [
    {
      policyNo: "PAR/2025/JKT/0871",
      insuredName: "PT Graha Sentosa Properti",
      insurer: "PT Asuransi Sinar Mas",
      coverType: "Property All Risks (PAR)",
      inceptionDate: "2025-09-01",
      expiryDate: "2026-09-01",
      currency: "IDR",
      sumInsured: 365_500_000_000,
      premium: 438_418_000,
      brokeragePct: 12.5,
      type: "Renewal",
      riskLocation: "Grand Sentosa Mall, Jl. Jenderal Sudirman Kav. 52-53, Jakarta Selatan",
      policyTypeId: typeMap["Renewal"],
      coverTypeId: coverTypeMap["Property All Risks (PAR)"],
    },
    {
      policyNo: "MV/FLT/2026/0088",
      insuredName: "PT Nusantara Fleet Services",
      insurer: "PT Asuransi Astra Buana",
      coverType: "Motor Vehicle",
      inceptionDate: "2026-01-15",
      expiryDate: "2027-01-15",
      currency: "IDR",
      sumInsured: 125_000_000,
      premium: 11_250_000,
      brokeragePct: 25,
      type: "Baru",
      riskLocation: "Jl. Pulau Seputih Raya No. 12, Jakarta Selatan",
      policyTypeId: typeMap["Baru"],
      coverTypeId: coverTypeMap["Motor Vehicle"],
    },
  ]

  let created = 0
  for (const item of seedData) {
    const record = await prisma.policy.create({
      data: {
        policyNo: item.policyNo,
        insuredName: item.insuredName,
        cobId: cob.id,
        coverTypeId: item.coverTypeId,
        inceptionDate: new Date(item.inceptionDate),
        expiryDate: new Date(item.expiryDate),
        currencyCode: item.currency,
        sumInsured: item.sumInsured,
        premium: item.premium,
        brokeragePct: item.brokeragePct,
        policyTypeId: item.policyTypeId,
        riskLocation: item.riskLocation,
      },
    })

    for (const insurer of [{ id: "ins-001", share: 100, role: "As Leader" }]) {
      await prisma.policyInsurer.create({
        data: {
          policyId: record.id,
          insurerId: insurer.id,
          sharePct: insurer.share,
          positionId: insurer.role === "As Leader" ? "leader" : "member",
        },
      })
    }

    created++
  }

  return created
}
