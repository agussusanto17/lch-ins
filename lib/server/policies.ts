import "server-only"

import { Prisma } from "@/lib/generated/prisma/client"
import { CLIENTS } from "@/lib/data/clients"
import { POLICIES as MOCK_POLICIES } from "@/lib/data/policies"
import { POLICY_TYPE_CODES, systemValueFromRow } from "@/lib/form-options"
import { SLIPS as MOCK_SLIPS } from "@/lib/data/slips"
import type {
  ClassOfBusiness,
  Policy,
  PolicyFileKind,
  PolicyType,
  SecurityPanelRow,
  SlipPart,
} from "@/lib/data/types"
import { policyFileKindLabel } from "@/lib/policy-files"
import { slipPolicyParts } from "@/lib/calc"
import { addDays } from "@/lib/date"
import { normalizeCob } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { MAX_RENEWAL_DAYS } from "@/lib/renewal"
import { seedInitialClientsIfEmpty } from "@/lib/server/clients"
import { getPlacingSlipById } from "@/lib/server/placing-slips"
import {
  assertClaimableFile,
  deleteStoredFiles,
  storedFilePath,
  storedFileUrl,
} from "@/lib/server/stored-files"
import { recordAudit } from "@/server/services/audit"
import { usesOpenCover } from "@/lib/open-cover"
import { effectivePaBenefitLimits, type PaBenefitLimits } from "@/lib/pa-benefits"
import type { ParticipantChanges, PolicyParticipant } from "@/lib/policy-participants"
import { PARTICIPANT_LIMITS, usesParticipants } from "@/lib/slip-participants"
import { shouldSeedMockData } from "@/lib/server/mock-seed"
import { storedPreviousPolicyNo } from "@/lib/policy-parent"
import { endorsementPremium } from "@/lib/endorsement-premium"

export type PolicyRecord = Policy
export type PolicyInput = Omit<
  Policy,
  "id" | "files" | "endorsementSeq" | "placingSlipNo" | "participantCount"
> & {
  /** Perubahan peserta PA grup, hanya untuk endorsement baru. */
  participantChanges?: ParticipantChanges
}

export interface PolicyFormOptions {
  insurers: string[]
  currencies: { code: string; name: string }[]
  placementLocations: { id: string; name: string; isActive: boolean }[]
  cobOjkClasses: { id: string; name: string; isActive: boolean }[]
}

type Tx = Prisma.TransactionClient

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const policyInclude = {
  cob: { select: { name: true } },
  policyType: { select: { code: true, name: true } },
  placingSlip: { select: { slipNo: true } },
  insurers: {
    include: {
      insurer: { select: { name: true } },
      position: { select: { code: true } },
    },
    orderBy: { sharePct: "desc" },
  },
  files: { orderBy: [{ kind: "asc" }, { version: "asc" }] },
  _count: { select: { participants: { where: { endDate: null } } } },
} satisfies Prisma.PolicyInclude

type PolicyRow = Prisma.PolicyGetPayload<{ include: typeof policyInclude }>

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

function toPolicyRecord(row: PolicyRow): PolicyRecord {
  const insurers: SecurityPanelRow[] = row.insurers.map((i) => ({
    id: i.id,
    insurer: i.insurer.name,
    share: Number(i.sharePct),
    role: i.position.code === "leader" ? "As Leader" : "As Member",
  }))
  const leader = insurers.find((i) => i.role === "As Leader") ?? insurers[0]
  return {
    id: row.id,
    policyNo: row.policyNo,
    clientId: row.clientId,
    placingSlipId: row.placingSlipId,
    placingSlipNo: row.placingSlip?.slipNo ?? null,
    slipPart:
      row.slipPart === "PAR" || row.slipPart === "EQVET" ? row.slipPart : null,
    parentPolicyId: row.parentPolicyId,
    previousPolicyNo: row.previousPolicyNo,
    insuredName: row.insuredName,
    insurer: leader?.insurer ?? "",
    insurers,
    cob: normalizeCob(row.cob.name),
    typeOfCover: row.typeOfCover ?? undefined,
    inceptionDate: isoDate(row.inceptionDate),
    expiryDate: isoDate(row.expiryDate),
    currency: row.currencyCode,
    sumInsured: Number(row.sumInsured),
    premium: Number(row.premium),
    brokeragePct: Number(row.brokeragePct),
    additionalFee: Number(row.additionalFee),
    rate: row.rate == null ? null : Number(row.rate),
    premiumBasis: row.premiumBasis == null ? null : Number(row.premiumBasis),
    adminCost: Number(row.adminCost),
    stampDuty: Number(row.stampDuty),
    // Dicocokkan lewat kode, jadi nama yang diganti di Master Data aman.
    type: systemValueFromRow(POLICY_TYPE_CODES, row.policyType, "Baru"),
    riskLocation: row.riskLocation ?? "",
    endorsementSeq: row.endorsementSeq,
    cobOjkClassId: row.cobOjkClassId,
    placementLocationId: row.placementLocationId,
    groupingInsured: row.groupingInsured ?? "",
    premiumPaidDate: row.premiumPaidDate ? isoDate(row.premiumPaidDate) : null,
    remarks: row.remarks ?? null,
    files: row.files.map((f) => ({
      id: f.id,
      kind: f.kind,
      version: f.version,
      fileName: f.fileName,
      uploadedAt: f.uploadedAt.toISOString(),
      url: storedFileUrl(f.filePath),
    })),
    participantCount: row._count?.participants ?? 0,
  }
}

function auditSnapshot(p: PolicyRecord) {
  return {
    policyNo: p.policyNo,
    insuredName: p.insuredName,
    type: p.type,
    insurer: p.insurer,
    inceptionDate: p.inceptionDate,
    expiryDate: p.expiryDate,
    sumInsured: p.sumInsured,
    premium: p.premium,
    brokeragePct: p.brokeragePct,
    additionalFee: p.additionalFee ?? 0,
    rate: p.rate ?? null,
    premiumBasis: p.premiumBasis ?? null,
    adminCost: p.adminCost ?? 0,
    stampDuty: p.stampDuty ?? 0,
    slipPart: p.slipPart ?? null,
    endorsementSeq: p.endorsementSeq,
    cobOjkClassId: p.cobOjkClassId,
    placementLocationId: p.placementLocationId,
    groupingInsured: p.groupingInsured,
    premiumPaidDate: p.premiumPaidDate ?? null,
    remarks: p.remarks ?? null,
  }
}

/** App COB labels whose master-data row (SEOJK) carries a different name. */
const MASTER_COB_NAME: Partial<Record<ClassOfBusiness, string>> = {
  "Personal Accident": "GENERAL ACCIDENT",
}

async function resolveCobId(tx: Tx, cob: ClassOfBusiness): Promise<string> {
  const row = await tx.classOfBusiness.findFirst({
    where: { name: { equals: MASTER_COB_NAME[cob] ?? cob, mode: "insensitive" } },
    select: { id: true },
  })
  if (!row) throw new Error(`Class of business "${cob}" belum ada di master data.`)
  return row.id
}

async function resolvePolicyTypeId(tx: Tx, type: string): Promise<string> {
  // Kode tetap walau nama tipe polis diganti di Master Data.
  const code = POLICY_TYPE_CODES[type as PolicyType]
  const row = await tx.lookupValue.findFirst({
    where: {
      lookupType: "policy_type",
      OR: [...(code ? [{ code }] : []), { name: type }],
    },
    select: { id: true },
  })
  if (!row) throw new Error(`Tipe polis "${type}" belum ada di master data.`)
  return row.id
}

async function findCoverTypeId(tx: Tx, cobId: string, label?: string) {
  if (!label?.trim()) return null
  const row = await tx.coverType.findFirst({
    where: { cobId, name: { equals: label.trim(), mode: "insensitive" } },
    select: { id: true },
  })
  return row?.id ?? null
}

// The session store still carries mock ids (c-001, s-005, p-002); map them by
// their natural key so records picked from mock rows link to the DB rows.
async function findClientId(tx: Tx, clientId: string | null) {
  if (!clientId) return null
  if (UUID_RE.test(clientId)) {
    const row = await tx.client.findUnique({ where: { id: clientId }, select: { id: true } })
    if (row) return row.id
  }
  const mock = CLIENTS.find((c) => c.id === clientId)
  if (!mock) return null
  const row = await tx.client.findFirst({
    where: { name: { equals: mock.name.trim(), mode: "insensitive" } },
    select: { id: true },
  })
  return row?.id ?? null
}

async function findSlipId(tx: Tx, slipId: string | null) {
  if (!slipId) return null
  if (UUID_RE.test(slipId)) {
    const row = await tx.placingSlip.findUnique({ where: { id: slipId }, select: { id: true } })
    if (row) return row.id
  }
  const slipNo = MOCK_SLIPS.find((s) => s.id === slipId)?.slipNo
  if (!slipNo) return null
  const row = await tx.placingSlip.findUnique({ where: { slipNo }, select: { id: true } })
  return row?.id ?? null
}

async function findPolicyId(tx: Tx, policyId: string | null) {
  if (!policyId) return null
  if (UUID_RE.test(policyId)) {
    const row = await tx.policy.findUnique({ where: { id: policyId }, select: { id: true } })
    if (row) return row.id
  }
  const policyNo = MOCK_POLICIES.find((p) => p.id === policyId)?.policyNo
  if (!policyNo) return null
  const row = await tx.policy.findUnique({ where: { policyNo }, select: { id: true } })
  return row?.id ?? null
}

async function resolveInsurerId(tx: Tx, name: string): Promise<string> {
  const existing = await tx.insurer.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await tx.insurer.create({ data: { name: name.trim() }, select: { id: true } })
  return created.id
}

async function policyData(tx: Tx, input: PolicyInput) {
  const cobId = await resolveCobId(tx, input.cob)
  return {
    policyNo: input.policyNo.trim(),
    insuredName: input.insuredName.trim(),
    clientId: await findClientId(tx, input.clientId),
    placingSlipId: await findSlipId(tx, input.placingSlipId),
    parentPolicyId: await findPolicyId(tx, input.parentPolicyId),
    // Renewal yang polis sebelumnya belum ada di sistem cukup dicatat nomornya.
    previousPolicyNo: storedPreviousPolicyNo(input),
    cobId,
    coverTypeId: await findCoverTypeId(tx, cobId, input.typeOfCover),
    typeOfCover: input.typeOfCover?.trim() || null,
    policyTypeId: await resolvePolicyTypeId(tx, input.type),
    inceptionDate: new Date(input.inceptionDate),
    expiryDate: new Date(input.expiryDate),
    currencyCode: input.currency,
    sumInsured: input.sumInsured,
    // Endorsement dengan rate: premi prorata dihitung ulang di server.
    premium: endorsementPremium(input) ?? input.premium,
    brokeragePct: input.brokeragePct,
    additionalFee: input.additionalFee ?? 0,
    // Rate, admin cost, dan stamp duty hanya untuk endorsement.
    rate: input.type === "Endorsement" ? (input.rate ?? null) : null,
    premiumBasis: input.type === "Endorsement" ? (input.premiumBasis ?? null) : null,
    adminCost: input.type === "Endorsement" ? (input.adminCost ?? 0) : 0,
    stampDuty: input.type === "Endorsement" ? (input.stampDuty ?? 0) : 0,
    riskLocation: input.riskLocation.trim() || null,
    cobOjkClassId: await findCobOjkClassId(tx, input.cobOjkClassId),
    placementLocationId: await findPlacementLocationId(tx, input.placementLocationId),
    groupingInsured: input.groupingInsured?.trim() || null,
    premiumPaidDate: input.premiumPaidDate ? new Date(input.premiumPaidDate) : null,
    // Remarks hanya untuk endorsement dan pembatalan.
    remarks:
      input.type === "Endorsement" || input.type === "Cancellation"
        ? input.remarks?.trim() || null
        : null,
  } satisfies Prisma.PolicyUncheckedCreateInput
}

async function findCobOjkClassId(tx: Tx, id: string | null | undefined) {
  if (!id) return null
  const row = await tx.cobOjkClass.findUnique({ where: { id }, select: { id: true } })
  if (!row) throw new Error("Klasifikasi OJK tidak ditemukan di master data.")
  return row.id
}

async function findPlacementLocationId(tx: Tx, id: string | null | undefined) {
  if (!id) return null
  const row = await tx.lookupValue.findFirst({
    where: { id, lookupType: "placement_location" },
    select: { id: true },
  })
  if (!row) throw new Error("Lokasi penempatan tidak ditemukan di master data.")
  return row.id
}

async function endorsementSeqFor(
  tx: Tx,
  type: PolicyInput["type"],
  parentPolicyId: string | null,
  selfId?: string
): Promise<number | null> {
  if (type !== "Endorsement" || !parentPolicyId) return null
  if (selfId) {
    const self = await tx.policy.findUnique({
      where: { id: selfId },
      select: { parentPolicyId: true, endorsementSeq: true },
    })
    if (self?.endorsementSeq && self.parentPolicyId === parentPolicyId) return self.endorsementSeq
  }
  const { _max } = await tx.policy.aggregate({
    where: { parentPolicyId, id: selfId ? { not: selfId } : undefined },
    _max: { endorsementSeq: true },
  })
  return (_max.endorsementSeq ?? 0) + 1
}

/** Data dari form: klien dan polis induk yang dipilih harus sudah ada di database. */
async function checkedPolicyData(tx: Tx, input: PolicyInput, selfId?: string) {
  const data = await policyData(tx, input)
  if (input.clientId && !data.clientId) {
    throw new Error("Klien yang dipilih belum tersimpan di database.")
  }
  if (input.parentPolicyId && !data.parentPolicyId) {
    throw new Error("Polis induk tidak ditemukan di database.")
  }
  if (selfId && data.parentPolicyId === selfId) {
    throw new Error("Polis tidak bisa menjadi induk dirinya sendiri.")
  }
  const duplicate = await tx.policy.findUnique({
    where: { policyNo: data.policyNo },
    select: { id: true },
  })
  if (duplicate && duplicate.id !== selfId) {
    throw new Error(`No. polis ${data.policyNo} sudah terdaftar.`)
  }
  return {
    ...data,
    slipPart: await checkedSlipPart(tx, data.placingSlipId, input.slipPart, selfId),
    endorsementSeq: await endorsementSeqFor(tx, input.type, data.parentPolicyId, selfId),
  }
}

/**
 * Satu placing slip menjadi satu polis; slip PAR + EQVET satu polis per bagian,
 * dan slip open cover satu polis per deklarasi tanpa batas jumlah.
 * Mencegah produksi dari slip yang sama terhitung dua kali. Tautan yang tidak
 * berubah saat polis diedit tidak diperiksa ulang, jadi polis lama tetap bisa
 * disimpan.
 */
async function checkedSlipPart(
  tx: Tx,
  slipId: string | null,
  part: SlipPart | null | undefined,
  selfId?: string
): Promise<SlipPart | null> {
  if (!slipId) return null
  if (selfId) {
    const current = await tx.policy.findUnique({
      where: { id: selfId },
      select: { placingSlipId: true, slipPart: true },
    })
    if (current?.placingSlipId === slipId) {
      return current.slipPart === "PAR" || current.slipPart === "EQVET"
        ? current.slipPart
        : null
    }
  }
  const slip = await getPlacingSlipById(slipId)
  if (!slip) throw new Error("Placing slip tidak ditemukan.")
  // Slip open cover menerbitkan satu polis per deklarasi (Harry, 6 November 2026).
  if (usesOpenCover(slip)) return null
  const parts = slipPolicyParts(slip)
  const slipPart = parts.length ? (part ?? null) : null
  if (parts.length && !(slipPart && parts.includes(slipPart))) {
    throw new Error("Pilih bagian slip: PAR atau EQVET.")
  }
  const others = await tx.policy.findMany({
    where: { placingSlipId: slipId, ...(selfId ? { id: { not: selfId } } : {}) },
    select: { policyNo: true, slipPart: true },
  })
  // Polis lama tanpa bagian dianggap memakai seluruh slip.
  const clash = others.find(
    (p) => !slipPart || !p.slipPart || p.slipPart === slipPart
  )
  if (clash) {
    const slipNo = slip.slipNo ?? "ini"
    throw new Error(
      slipPart
        ? `Bagian ${slipPart} slip ${slipNo} sudah dipakai polis ${clash.policyNo}.`
        : `Placing slip ${slipNo} sudah dipakai polis ${clash.policyNo}.`
    )
  }
  return slipPart
}

async function writeInsurers(tx: Tx, policyId: string, input: PolicyInput) {
  const rows: SecurityPanelRow[] = input.insurers.length
    ? input.insurers
    : [{ id: "", insurer: input.insurer, share: 100, role: "As Leader" }]
  const roles = await tx.lookupValue.findMany({
    where: { lookupType: "security_role" },
    select: { id: true, code: true },
  })
  const roleIds = new Map(roles.map((r) => [r.code, r.id]))

  await tx.policyInsurer.deleteMany({ where: { policyId } })
  for (const row of rows) {
    const positionId = roleIds.get(row.role === "As Leader" ? "leader" : "member")
    if (!positionId) throw new Error("Lookup security_role belum di-seed.")
    await tx.policyInsurer.create({
      data: {
        policyId,
        insurerId: await resolveInsurerId(tx, row.insurer),
        sharePct: row.share,
        positionId,
      },
    })
  }
}

async function readPolicy(tx: Tx, id: string) {
  return toPolicyRecord(
    await tx.policy.findUniqueOrThrow({ where: { id }, include: policyInclude })
  )
}

/** Semua polis, atau hanya milik satu klien bila `clientId` (UUID) diisi. */
export async function listPolicies(
  params: { clientId?: string } = {}
): Promise<PolicyRecord[]> {
  await seedInitialPoliciesIfEmpty()
  const rows = await prisma.policy.findMany({
    where: params.clientId ? { clientId: params.clientId } : undefined,
    include: policyInclude,
    orderBy: { expiryDate: "desc" },
  })
  return rows.map(toPolicyRecord)
}

/** Polis yang berakhir dalam periode renewal terpanjang, supaya Marketing tidak memuat seluruh tabel. */
export async function listRenewalPolicies(today: string): Promise<PolicyRecord[]> {
  await seedInitialPoliciesIfEmpty()
  const rows = await prisma.policy.findMany({
    where: {
      expiryDate: {
        gte: new Date(today),
        lte: new Date(addDays(today, MAX_RENEWAL_DAYS)),
      },
    },
    include: policyInclude,
    orderBy: { expiryDate: "asc" },
  })
  return rows.map(toPolicyRecord)
}

export async function listPolicyFormOptions(): Promise<PolicyFormOptions> {
  const [insurers, currencies, placementLocations, cobOjkClasses] = await Promise.all([
    prisma.insurer.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.currency.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    // Inactive values still used by a policy are kept so the form can show their name.
    prisma.lookupValue.findMany({
      where: {
        lookupType: "placement_location",
        OR: [{ isActive: true }, { policyPlacements: { some: {} } }],
      },
      select: { id: true, name: true, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.cobOjkClass.findMany({
      where: { OR: [{ isActive: true }, { policies: { some: {} } }] },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ])
  return {
    insurers: insurers.map((i) => i.name),
    currencies,
    placementLocations,
    cobOjkClasses,
  }
}

export async function getPolicyById(id: string): Promise<PolicyRecord | null> {
  if (!UUID_RE.test(id)) return null
  const row = await prisma.policy.findUnique({ where: { id }, include: policyInclude })
  return row ? toPolicyRecord(row) : null
}

/** Polis pemilik daftar peserta: naik ke polis induk selama polisnya endorsement atau pembatalan. */
export async function rosterPolicyId(tx: Tx, policyId: string) {
  let id = policyId
  for (let i = 0; i < 20; i++) {
    const row = await tx.policy.findUnique({
      where: { id },
      select: { parentPolicyId: true, policyType: { select: { code: true, name: true } } },
    })
    if (!row) throw new Error("Polis induk tidak ditemukan.")
    const type = systemValueFromRow(POLICY_TYPE_CODES, row.policyType, "Baru")
    if ((type !== "Endorsement" && type !== "Cancellation") || !row.parentPolicyId) return id
    id = row.parentPolicyId
  }
  return id
}

/**
 * Peserta yang berhenti dijamin pada `endDate` tidak boleh punya klaim dengan
 * tanggal kejadian pada atau sesudah tanggal itu.
 */
async function assertNoLaterClaims(
  tx: Tx,
  participants: Prisma.PolicyParticipantWhereInput,
  endDate: Date
) {
  const claim = await tx.claim.findFirst({
    where: { participant: participants, lossDate: { gte: endDate } },
    select: { claimNo: true, participant: { select: { name: true } } },
    orderBy: { lossDate: "asc" },
  })
  if (claim) {
    throw new Error(
      `${claim.participant?.name ?? "Peserta"} punya klaim ${claim.claimNo} dengan tanggal kejadian pada atau sesudah tanggal berhenti dijamin.`
    )
  }
}

const participantText = (v?: string | null) =>
  v?.trim().slice(0, PARTICIPANT_LIMITS.text) || null

/**
 * Peserta PA grup polis baru:
 * - polis Baru atau Renewal dari slip menyalin peserta slip, mulai dijamin
 *   pada tanggal mulai polis;
 * - endorsement menambah peserta mulai tanggal endorsement, dan mengurangi
 *   peserta aktif polis induk pada tanggal yang sama.
 */
async function writeParticipants(tx: Tx, policyId: string, input: PolicyInput) {
  const startDate = new Date(`${input.inceptionDate}T00:00:00Z`)
  if ((input.type === "Baru" || input.type === "Renewal") && input.placingSlipId) {
    // Limit manfaat PA ikut ke polis sebagai dasar peringatan klaim.
    const slip = await tx.placingSlip.findUnique({
      where: { id: input.placingSlipId },
      select: { paBenefitLimits: true, cob: { select: { name: true } } },
    })
    if (slip && usesParticipants(normalizeCob(slip.cob.name))) {
      await tx.policy.update({
        where: { id: policyId },
        data: { paBenefitLimits: effectivePaBenefitLimits(slip.paBenefitLimits) },
      })
    }
    const slipParticipants = await tx.slipParticipant.findMany({
      where: { slipId: input.placingSlipId },
      orderBy: { sortOrder: "asc" },
    })
    if (slipParticipants.length) {
      await tx.policyParticipant.createMany({
        data: slipParticipants.map((p, i) => ({
          policyId,
          name: p.name,
          idNumber: p.idNumber,
          birthDate: p.birthDate,
          gender: p.gender,
          position: p.position,
          level: p.level,
          workLocation: p.workLocation,
          sumInsured: p.sumInsured,
          beneficiary: p.beneficiary,
          sortOrder: i,
          startDate,
        })),
      })
    }
  }

  const changes = input.participantChanges
  if (input.type !== "Endorsement" || !input.parentPolicyId || !changes) return
  if (!changes.added.length && !changes.removedIds.length) return
  const ownerId = await rosterPolicyId(tx, input.parentPolicyId)
  if (changes.removedIds.length) {
    await assertNoLaterClaims(tx, { id: { in: changes.removedIds } }, startDate)
    const removed = await tx.policyParticipant.updateMany({
      where: {
        id: { in: changes.removedIds },
        policyId: ownerId,
        endDate: null,
        startDate: { lte: startDate },
      },
      data: { endDate: startDate, removedByPolicyId: policyId },
    })
    if (removed.count !== new Set(changes.removedIds).size) {
      throw new Error(
        "Sebagian peserta yang dikurangi tidak ditemukan, sudah berhenti, atau baru dijamin sesudah tanggal endorsement."
      )
    }
  }
  if (changes.added.length) {
    const last = await tx.policyParticipant.aggregate({
      where: { policyId: ownerId },
      _max: { sortOrder: true },
    })
    const base = (last._max.sortOrder ?? -1) + 1
    await tx.policyParticipant.createMany({
      data: changes.added.slice(0, PARTICIPANT_LIMITS.rows).map((p, i) => ({
        policyId: ownerId,
        name: p.name.trim().slice(0, PARTICIPANT_LIMITS.text),
        idNumber: participantText(p.idNumber),
        birthDate: p.birthDate ? new Date(`${p.birthDate}T00:00:00Z`) : null,
        gender: participantText(p.gender),
        position: participantText(p.position),
        level: participantText(p.level),
        workLocation: participantText(p.workLocation),
        sumInsured: new Prisma.Decimal(Math.max(0, p.sumInsured || 0)),
        beneficiary: participantText(p.beneficiary),
        sortOrder: base + i,
        startDate,
        addedByPolicyId: policyId,
      })),
    })
  }
}

/**
 * Endorsement yang sudah mengubah peserta: tanggal peserta ikut tanggal mulai
 * endorsement yang diedit, sedangkan jenis dan polis induknya dikunci karena
 * pesertanya sudah tercatat di daftar polis induk itu.
 */
async function syncParticipantChanges(
  tx: Tx,
  policyId: string,
  before: PolicyRecord,
  input: PolicyInput
) {
  const changed = await tx.policyParticipant.count({
    where: { OR: [{ addedByPolicyId: policyId }, { removedByPolicyId: policyId }] },
  })
  if (!changed) return
  if (input.type !== "Endorsement" || input.parentPolicyId !== before.parentPolicyId) {
    throw new Error(
      "Endorsement ini sudah menambah atau mengurangi peserta, jadi jenis dan polis induknya tidak bisa diganti. Hapus lalu buat ulang endorsement-nya bila perlu."
    )
  }
  if (input.inceptionDate === before.inceptionDate) return
  const date = new Date(`${input.inceptionDate}T00:00:00Z`)
  const conflict = await tx.policyParticipant.count({
    where: {
      OR: [
        { removedByPolicyId: policyId, startDate: { gt: date } },
        { addedByPolicyId: policyId, endDate: { lt: date } },
      ],
    },
  })
  if (conflict) {
    throw new Error(
      "Tanggal mulai baru tidak cocok dengan peserta yang diubah endorsement ini: ada peserta yang dikurangi sebelum mulai dijamin, atau peserta tambahan yang sudah berhenti sebelum tanggal itu."
    )
  }
  await assertNoLaterClaims(tx, { removedByPolicyId: policyId }, date)
  const earlyClaim = await tx.claim.findFirst({
    where: { participant: { addedByPolicyId: policyId }, lossDate: { lt: date } },
    select: { claimNo: true, participant: { select: { name: true } } },
  })
  if (earlyClaim) {
    throw new Error(
      `${earlyClaim.participant?.name ?? "Peserta"} punya klaim ${earlyClaim.claimNo} dengan tanggal kejadian sebelum tanggal mulai baru.`
    )
  }
  await tx.policyParticipant.updateMany({
    where: { addedByPolicyId: policyId },
    data: { startDate: date },
  })
  await tx.policyParticipant.updateMany({
    where: { removedByPolicyId: policyId },
    data: { endDate: date },
  })
}

/** Daftar peserta dan limit manfaat polis pemilik daftar, untuk form klaim PA. */
export interface PolicyRoster {
  participants: PolicyParticipant[]
  benefitLimits: PaBenefitLimits
}

export async function getPolicyRoster(policyId: string): Promise<PolicyRoster> {
  if (!UUID_RE.test(policyId)) return { participants: [], benefitLimits: {} }
  const ownerId = await rosterPolicyId(prisma, policyId)
  const owner = await prisma.policy.findUnique({
    where: { id: ownerId },
    select: { paBenefitLimits: true },
  })
  return {
    participants: await listPolicyParticipants(ownerId),
    benefitLimits: effectivePaBenefitLimits(owner?.paBenefitLimits),
  }
}

/** Daftar peserta polis, dari polis pemilik daftarnya bila polis ini endorsement. */
export async function listPolicyParticipants(policyId: string): Promise<PolicyParticipant[]> {
  if (!UUID_RE.test(policyId)) return []
  const ownerId = await rosterPolicyId(prisma, policyId)
  const rows = await prisma.policyParticipant.findMany({
    where: { policyId: ownerId },
    orderBy: { sortOrder: "asc" },
    include: {
      addedBy: { select: { policyNo: true } },
      removedBy: { select: { policyNo: true } },
      claims: { select: { lossDate: true } },
    },
  })
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    idNumber: p.idNumber ?? undefined,
    birthDate: p.birthDate ? isoDate(p.birthDate) : null,
    gender: p.gender ?? undefined,
    position: p.position ?? undefined,
    level: p.level ?? undefined,
    workLocation: p.workLocation ?? undefined,
    sumInsured: Number(p.sumInsured),
    beneficiary: p.beneficiary ?? undefined,
    startDate: isoDate(p.startDate),
    endDate: p.endDate ? isoDate(p.endDate) : null,
    addedByPolicyNo: p.addedBy?.policyNo ?? null,
    removedByPolicyNo: p.removedBy?.policyNo ?? null,
    claimCount: p.claims.length,
    lastLossDate: p.claims.length
      ? isoDate(new Date(Math.max(...p.claims.map((c) => c.lossDate.getTime()))))
      : null,
  }))
}

export async function createPolicy(input: PolicyInput, userId: string): Promise<PolicyRecord> {
  return prisma.$transaction(async (tx) => {
    const { id } = await tx.policy.create({
      data: await checkedPolicyData(tx, input),
      select: { id: true },
    })
    await writeInsurers(tx, id, input)
    await writeParticipants(tx, id, input)
    const record = await readPolicy(tx, id)
    await recordAudit(tx, {
      userId,
      entity: "policies",
      entityId: id,
      action: "Create",
      before: null,
      after: auditSnapshot(record),
    })
    return record
  })
}

export async function updatePolicy(
  id: string,
  input: PolicyInput,
  userId: string
): Promise<PolicyRecord> {
  return prisma.$transaction(async (tx) => {
    const before = await readPolicy(tx, id)
    await tx.policy.update({ where: { id }, data: await checkedPolicyData(tx, input, id) })
    await writeInsurers(tx, id, input)
    await syncParticipantChanges(tx, id, before, input)
    const record = await readPolicy(tx, id)
    await recordAudit(tx, {
      userId,
      entity: "policies",
      entityId: id,
      action: "Update",
      before: auditSnapshot(before),
      after: auditSnapshot(record),
    })
    return record
  })
}

export async function deletePolicy(id: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.policy.findUnique({
      where: { id },
      include: {
        ...policyInclude,
        _count: {
          select: {
            claims: true,
            debitNotes: true,
            childPolicies: true,
            participants: { where: { endDate: null } },
          },
        },
      },
    })
    if (!existing) throw new Error("Polis tidak ditemukan.")
    const { claims, debitNotes, childPolicies } = existing._count
    if (claims > 0) throw new Error("Polis sudah memiliki klaim dan tidak dapat dihapus.")
    if (debitNotes > 0) throw new Error("Polis sudah memiliki debit note dan tidak dapat dihapus.")
    if (childPolicies > 0) {
      throw new Error("Polis masih menjadi induk renewal, endorsement, atau pembatalan.")
    }

    // Endorsement yang dihapus: peserta yang dikuranginya aktif lagi; peserta
    // yang ditambahkannya ikut terhapus lewat foreign key, kecuali sudah
    // dikurangi endorsement lain (catatan pengurangan itu jangan hilang).
    const removedLater = await tx.policyParticipant.count({
      where: { addedByPolicyId: id, removedByPolicyId: { not: null } },
    })
    if (removedLater > 0) {
      throw new Error(
        "Peserta tambahan endorsement ini sudah dikurangi endorsement lain. Hapus endorsement pengurangan itu dulu."
      )
    }
    const addedClaims = await tx.claim.count({ where: { participant: { addedByPolicyId: id } } })
    if (addedClaims > 0) {
      throw new Error("Peserta tambahan endorsement ini sudah punya klaim, jadi endorsement tidak dapat dihapus.")
    }
    await tx.policyParticipant.updateMany({
      where: { removedByPolicyId: id },
      data: { endDate: null, removedByPolicyId: null },
    })
    await tx.policy.delete({ where: { id } })
    await deleteStoredFiles(tx, existing.files.map((f) => f.filePath))
    await recordAudit(tx, {
      userId,
      entity: "policies",
      entityId: id,
      action: "Delete",
      before: auditSnapshot(toPolicyRecord(existing)),
      after: null,
    })
  })
}

/**
 * Berkas baru selalu jadi versi berikutnya dari jenisnya (Polis, Premium
 * Note, atau Commission Note); versi lama tidak diganti.
 */
export async function addPolicyFile(
  policyId: string,
  fileId: string,
  userId: string,
  kind: PolicyFileKind = "Policy"
): Promise<PolicyRecord> {
  return prisma.$transaction(async (tx) => {
    await assertClaimableFile(tx, fileId, "policy_file", userId)
    const locked = await tx.$queryRaw<{ policy_no: string }[]>`
      SELECT policy_no FROM policies WHERE id = ${policyId}::uuid FOR UPDATE`
    if (locked.length === 0) throw new Error("Polis tidak ditemukan.")

    const last = await tx.policyFile.aggregate({
      where: { policyId, kind },
      _max: { version: true },
    })
    const previous = last._max.version
    const stored = await tx.storedFile.findUniqueOrThrow({
      where: { id: fileId },
      select: { fileName: true },
    })
    const created = await tx.policyFile.create({
      data: {
        policyId,
        kind,
        version: (previous ?? 0) + 1,
        fileName: stored.fileName,
        filePath: storedFilePath(fileId),
        uploadedBy: userId,
      },
    })
    // Jenis berkas tidak berubah, jadi dicatat lewat context; recordAudit
    // hanya menyimpan field before/after yang nilainya berubah.
    await recordAudit(tx, {
      userId,
      entity: "policies",
      entityId: policyId,
      action: "Update",
      before: { softcopyVersion: previous },
      after: { softcopyVersion: created.version, softcopyFile: created.fileName },
      context: { policyNo: locked[0].policy_no, policyFileKind: policyFileKindLabel(kind) },
    })
    return readPolicy(tx, policyId)
  })
}

export async function seedInitialPoliciesIfEmpty(): Promise<number> {
  if (!shouldSeedMockData()) return 0
  if ((await prisma.policy.count()) > 0) return 0
  await seedInitialClientsIfEmpty()

  // Parents first so endorsements can resolve parentPolicyId.
  const ordered = [...MOCK_POLICIES].sort(
    (a, b) => Number(a.parentPolicyId != null) - Number(b.parentPolicyId != null)
  )
  let created = 0
  for (const mock of ordered) {
    try {
      await prisma.$transaction(async (tx) => {
        const data = await policyData(tx, mock)
        const { id } = await tx.policy.create({
          data: {
            ...data,
            endorsementSeq: await endorsementSeqFor(tx, mock.type, data.parentPolicyId),
          },
          select: { id: true },
        })
        await writeInsurers(tx, id, mock)
        // Softcopy contoh tidak dibuat: tanpa isi berkas, barisnya hanya
        // menampilkan versi yang tidak bisa dibuka. Softcopy diunggah user.
      })
      created++
    } catch (err) {
      console.error(`[seedInitialPoliciesIfEmpty] Failed seeding ${mock.policyNo}`, err)
    }
  }
  return created
}
