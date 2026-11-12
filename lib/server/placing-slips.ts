import "server-only"

import { randomUUID } from "node:crypto"
import { cache } from "react"

import { Prisma, type SlipItemKind, type SlipStatus } from "@/lib/generated/prisma/client"
import { validateClauseUniquenessAcrossSections } from "@/lib/validation"

import {
  MAX_DEDUCTIBLES,
  type ChangeSlipLock,
  type ClassOfBusiness as CobType,
  type ClauseOverride,
  type EndorsementCalc,
  type LineItem,
  type PlacingSlip,
  type RateException,
  type RateExceptionReason,
  type RateLine,
  type SecurityPanelRow,
  type SlipDetailRow,
  type SlipLocation,
  type OpenCoverRate,
  type SlipParticipant,
} from "@/lib/data/types"
import { SLIPS as MOCK_SLIPS } from "@/lib/data/slips"
import { CLIENTS } from "@/lib/data/clients"
import {
  coverCodeFor,
  derivedDocNumber,
  joinCoverCodes,
  slipSectionTitles,
  usesAdditionalFee,
  usesSectionSumInsured,
} from "@/components/underwriting/slip-model"
import { normalizeCob } from "@/lib/format"
import { cleanDetailRows } from "@/lib/slip-details"
import { cleanOpenCoverRates } from "@/lib/open-cover"
import { cleanPaBenefitLimits } from "@/lib/pa-benefits"
import { loadCancelledPolicies } from "@/lib/server/cancelled-policies"
import { slipFilesOrder, toSlipAttachment } from "@/lib/server/slip-files"
import { deleteStoredFiles } from "@/lib/server/stored-files"
import { PARTICIPANT_LIMITS } from "@/lib/slip-participants"
import { cleanClauseGroups, groupedClauseOrder } from "@/lib/clause-groups"
import { usesItemRates } from "@/lib/slip-items"
import { slipRiskLocationText } from "@/lib/slip-locations"
import { cobLookupKeys } from "@/lib/server/cob"
import { prisma } from "@/lib/prisma"
import { getSppaById } from "@/lib/server/sppa"
import { checkVehiclePair } from "@/lib/server/vehicles"
import {
  buildVehicleDescription,
  parseVehicleDescription,
} from "@/lib/data/ojk-motor"
import { nextDocumentNumber } from "@/server/services/number-generator"
import { recordAudit } from "@/server/services/audit"
import { slipCalc } from "@/lib/endorsement-calc"
import { changeSlipLockText } from "@/lib/endorsement-slip"
import { todayIso } from "@/lib/date"
import {
  documentDatesForStatus,
  type SlipDocumentDates,
} from "@/lib/document-dates"
import { shouldSeedMockData } from "@/lib/server/mock-seed"

const SLIP_ITEM_VEHICLE = {
  vehicleBrand: { select: { name: true } },
  vehicleType: { select: { name: true } },
} satisfies Prisma.SlipItemInclude

const SLIP_LOCATIONS = {
  include: {
    occupation: { select: { id: true, code: true, name: true } },
    constructionClass: { select: { id: true, code: true, name: true } },
  },
  orderBy: { sortOrder: "asc" },
} satisfies Prisma.SlipLocationFindManyArgs

/**
 * Endorsement atau cancellation slip yang dibuat dari slip ini dan belum
 * dibatalkan. Selama ada, slip ini tidak bisa direvisi (kunci revisi slip
 * asal, Agus 12 November 2026): kondisi sebelum perubahan sudah disimpan di
 * slip perubahan itu, jadi revisi slip asal tidak akan ikut ke sana.
 */
const SLIP_CHANGE_LOCK = {
  where: { kind: { in: ["Endorsement", "Cancellation"] }, status: { not: "Cancelled" } },
  select: { id: true, slipNo: true, kind: true, status: true },
  orderBy: { createdAt: "desc" },
  take: 1,
} satisfies Prisma.PlacingSlipFindManyArgs

function toChangeSlipLock(
  row: { id: string; slipNo: string | null; kind: string; status: SlipStatus } | undefined | null
): ChangeSlipLock | null {
  if (!row) return null
  return {
    id: row.id,
    slipNo: row.slipNo,
    kind: row.kind === "Cancellation" ? "Cancellation" : "Endorsement",
    status: row.status,
  }
}

export interface PlacingSlipRecord extends PlacingSlip {
  dbId: string
  clientName?: string
  cobName?: string
  coverTypeName?: string | null
  policyCount?: number
}

export interface PlacingSlipInput {
  clientId: string
  sppaId?: string | null
  cob: CobType | string
  typeOfCover?: string | null
  typeOfCover2?: string | null
  typeOfCoverLabel?: string | null
  typeOfCover2Label?: string | null
  coverCode?: string | null
  insuredName: string
  correspondenceAddress?: string | null
  currency?: string
  status?: SlipStatus
  periodTba?: boolean
  inceptionDate?: string | null
  expiryDate?: string | null
  /** Tanggal dokumen "YYYY-MM-DD"; lihat `lib/document-dates.ts`. */
  releaseDate?: string | null
  quotedDate?: string | null
  closingDate?: string | null
  periodNote?: string | null
  periodLabel?: string | null
  periodEndText?: string | null
  periodText?: string | null
  usesSections?: boolean
  /** Open cover dan rate-nya. Undefined berarti tidak diubah. */
  openCover?: boolean
  openCoverRates?: OpenCoverRate[]
  insuredDescription?: string | null
  detailRows?: SlipDetailRow[] | null
  occupation?: string | null
  occupationId?: string | null
  riskLocation?: string | null
  occupationLabel?: string | null
  /** Lokasi slip Property; tanpa daftar ini isian okupasi dan lokasi slip menjadi satu lokasi. */
  locations?: SlipLocation[]
  coverage?: string | null
  constructionClass?: string | null
  indemnityPeriod?: string | null
  interestSection1?: string | null
  interestSection2?: string | null
  specialConditions?: string | null
  deductibleIntro?: string | null
  exclusions?: string | null
  interestItems?: LineItem[]
  sumInsuredSection1?: LineItem[]
  sumInsuredSection2?: LineItem[]
  clauseIds?: string[]
  clauseOverrides?: Record<string, ClauseOverride>
  clauseGroups?: Record<string, string>
  /** Peserta PA grup. Undefined berarti tidak diubah. */
  participants?: SlipParticipant[]
  /** Limit manfaat PA (persen UP per kode manfaat). Undefined berarti tidak diubah. */
  paBenefitLimits?: Record<string, number> | null
  clauseIdsSection2?: string[]
  clauseOverridesSection2?: Record<string, ClauseOverride>
  clauseIdsGeneral?: string[]
  clauseOverridesGeneral?: Record<string, ClauseOverride>
  wordingForms?: string[]
  rateLines?: RateLine[]
  tplLines?: RateLine[]
  paLines?: RateLine[]
  rateExceptions?: Record<string, RateException>
  securityPanel?: SecurityPanelRow[]
  discountPct?: number
  adminCost?: number
  stampDuty?: number
  brokeragePct?: number
  includeVat?: boolean
  additionalFeeIncludeVat?: boolean
  subjectivity?: string | null
  closingInstruction?: string | null
  coverNoteRemarks?: string | null
  /** Endorsement dan cancellation slip: tanggal efektif dan uraian perubahan. */
  effectiveDate?: string | null
  changeDescription?: string | null
}

export interface ListPlacingSlipsParams {
  search?: string
  clientId?: string
  cob?: string
  status?: SlipStatus | string
}

let hasCheckedSeed = false

/**
 * Peta master data untuk menyimpan slip. Dibungkus `cache` supaya hanya
 * berlaku selama satu request: COB, cover, atau mata uang yang baru ditambah
 * di Master Data harus langsung dikenali, tanpa menunggu server restart.
 */
const getLookupsCache = cache(async () => {
  const [
    cobRows,
    coverTypeRows,
    occRows,
    currRows,
    rateKinds,
    secRoles,
    ccRows,
  ] = await Promise.all([
    prisma.classOfBusiness.findMany({
      select: { id: true, code: true, name: true },
    }),
    prisma.coverType.findMany({
      select: {
        id: true,
        cobId: true,
        code: true,
        name: true,
        abbreviation: true,
        ojkTariff: true,
      },
    }),
    prisma.occupation.findMany({
      select: { id: true, code: true, name: true },
    }),
    prisma.currency.findMany({
      select: { code: true },
    }),
    prisma.lookupValue.findMany({
      where: { lookupType: "rate_line_kind" },
      select: { id: true, code: true },
    }),
    prisma.lookupValue.findMany({
      where: { lookupType: "security_role" },
      select: { id: true, code: true },
    }),
    prisma.lookupValue.findMany({
      where: { lookupType: "construction_class" },
      select: { id: true, code: true },
    }),
  ])

  const cobsByName = new Map<string, { id: string; code: string; name: string }>()
  const cobsByCode = new Map<string, { id: string; code: string; name: string }>()
  for (const c of cobRows) {
    cobsByName.set(c.name.trim().toLowerCase(), c)
    cobsByCode.set(c.code.trim().toLowerCase(), c)
  }

  const coverTypesByName = new Map<
    string,
    {
      id: string
      code: string
      name: string
      cobId: string
      abbreviation: string | null
      ojkTariff: boolean
    }
  >()
  for (const ct of coverTypeRows) {
    coverTypesByName.set(`${ct.cobId}:${ct.name.trim().toLowerCase()}`, ct)
    coverTypesByName.set(`${ct.cobId}:${ct.code.trim().toLowerCase()}`, ct)
  }

  const occupationsByCode = new Map<string, { id: string; code: string; name: string }>()
  for (const o of occRows) {
    occupationsByCode.set(o.code.trim().toLowerCase(), o)
  }

  const rateLineKinds = new Map<string, string>()
  for (const rk of rateKinds) {
    rateLineKinds.set(rk.code.toLowerCase(), rk.id)
  }

  const securityRoles = new Map<string, string>()
  for (const sr of secRoles) {
    securityRoles.set(sr.code.toLowerCase(), sr.id)
  }

  const constructionClasses = new Map<string, string>()
  for (const cc of ccRows) {
    constructionClasses.set(cc.code.toUpperCase(), cc.id)
    constructionClasses.set(cc.code.toLowerCase(), cc.id)
  }

  const currencies = new Set<string>(currRows.map((c) => c.code))

  return {
    cobsByName,
    cobsByCode,
    coverTypesByName,
    occupationsByCode,
    constructionClasses,
    rateLineKinds,
    securityRoles,
    currencies,
  }
})

/**
 * Resolusi UUID klien berdasarkan UUID langsung atau fallback mapping ID mock / nama klien.
 */
async function resolveClientId(clientIdOrMock: string, fallbackInsuredName?: string): Promise<string> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    clientIdOrMock
  )
  if (isUuid) {
    const exists = await prisma.client.findUnique({
      where: { id: clientIdOrMock },
      select: { id: true },
    })
    if (exists) return exists.id
  }

  const mockMatch = CLIENTS.find((c) => c.id === clientIdOrMock)
  const targetName = mockMatch?.name || fallbackInsuredName

  if (targetName) {
    const foundByName = await prisma.client.findFirst({
      where: { name: { equals: targetName, mode: "insensitive" } },
      select: { id: true },
    })
    if (foundByName) return foundByName.id
  }

  const firstClient = await prisma.client.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  })
  if (firstClient) return firstClient.id

  throw new Error("Klien tidak ditemukan di database.")
}

async function resolveCob(cobNameOrCode: string) {
  const cache = await getLookupsCache()
  for (const key of cobLookupKeys(cobNameOrCode)) {
    const hit = cache.cobsByName.get(key) ?? cache.cobsByCode.get(key)
    if (hit) return hit
  }
  // Dulu jatuh ke COB pertama, sehingga slip COB yang tidak dikenal diam-diam
  // tersimpan sebagai PROPERTY. Lebih baik ditolak dengan pesan yang jelas.
  throw new Error(
    `Class of business "${cobNameOrCode}" tidak ada di master data.`
  )
}

/**
 * Type of cover kedua hanya untuk slip Property; COB lain dan isian kosong
 * disimpan null.
 */
async function slipCoverType2(
  cob: { id: string; name: string },
  typeOfCover2?: string | null
) {
  const label = usesSectionSumInsured(normalizeCob(cob.name)) ? typeOfCover2?.trim() : ""
  if (!label) return { coverType2Id: null, typeOfCover2: null }
  const coverType = await resolveCoverType(cob.id, label)
  return { coverType2Id: coverType?.id ?? null, typeOfCover2: label }
}

/**
 * Cover type master untuk type of cover slip, hanya di dalam COB yang sama.
 * Label lama yang tidak ada di master (misalnya "PAR + EQVET") tidak punya
 * padanan dan tetap disimpan sebagai teks saja.
 */
async function resolveCoverType(cobId: string, typeOfCover?: string | null) {
  if (!typeOfCover || !typeOfCover.trim()) return null
  const cache = await getLookupsCache()
  const key = `${cobId}:${typeOfCover.trim().toLowerCase()}`
  return cache.coverTypesByName.get(key) ?? null
}

/**
 * Tarif OJK type of cover slip menurut Master Data. Dipakai saat menyimpan,
 * supaya batas brokerage tidak bergantung pada flag kiriman browser. COB atau
 * type of cover yang tidak dikenal memakai tarif OJK.
 */
export async function coverUsesOjkTariff(
  cob: string,
  typeOfCover?: string | null
): Promise<boolean> {
  const cache = await getLookupsCache()
  const cobRow = cobLookupKeys(cob)
    .map((key) => cache.cobsByName.get(key) ?? cache.cobsByCode.get(key))
    .find(Boolean)
  if (!cobRow || !typeOfCover?.trim()) return true
  const key = `${cobRow.id}:${typeOfCover.trim().toLowerCase()}`
  return cache.coverTypesByName.get(key)?.ojkTariff !== false
}

/** "12 months" -> 12. */
/** Kolom DATE dari Prisma (tengah malam UTC) menjadi "YYYY-MM-DD". */
function dateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

/** "YYYY-MM-DD" menjadi nilai untuk kolom DATE. */
function dbDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null
}

/**
 * Tanggal dokumen setelah status berpindah dari `from` ke `to`: tanggal yang
 * sudah ada (termasuk yang diketik manual) dipakai, yang masih kosong diisi
 * hari ini (WIB).
 */
function withStatusDates(
  dates: SlipDocumentDates,
  from: SlipStatus,
  to: SlipStatus
): SlipDocumentDates {
  const current: SlipDocumentDates = {
    releaseDate: dates.releaseDate ?? null,
    quotedDate: dates.quotedDate ?? null,
    closingDate: dates.closingDate ?? null,
  }
  return { ...current, ...documentDatesForStatus(current, from, to, todayIso()) }
}

function dbDocumentDates(dates: SlipDocumentDates) {
  return {
    ...(dates.releaseDate !== undefined ? { releaseDate: dbDate(dates.releaseDate) } : {}),
    ...(dates.quotedDate !== undefined ? { quotedDate: dbDate(dates.quotedDate) } : {}),
    ...(dates.closingDate !== undefined ? { closingDate: dbDate(dates.closingDate) } : {}),
  }
}

function parseIndemnityMonths(val?: string | null): number | null {
  if (!val) return null
  const m = val.match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

/**
 * Resolusi UUID SPPA. Mendukung UUID database langsung maupun legacy mock ID (misal sp-001).
 */
async function resolveSppaId(sppaId?: string | null): Promise<string | null> {
  if (!sppaId || !sppaId.trim()) return null
  const trimmed = sppaId.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const exists = await prisma.sppa.findUnique({
      where: { id: trimmed },
      select: { id: true },
    })
    if (exists) return exists.id
  }

  const sppa = await getSppaById(trimmed)
  return sppa?.dbId ?? null
}

type PrismaPlacingSlipWithRelations = Prisma.PlacingSlipGetPayload<{
  include: {
    client: { select: { id: true; name: true } }
    cob: { select: { id: true; code: true; name: true } }
    coverType: {
      select: { id: true; code: true; name: true; abbreviation: true; ojkTariff: true }
    }
    coverType2: { select: { id: true; code: true; name: true; abbreviation: true } }
    occupation: { select: { id: true; code: true; name: true } }
    constructionClass: { select: { id: true; code: true; name: true } }
    currency: { select: { code: true } }
    creator: { select: { id: true; name: true } }
    parentPolicy: { select: { policyNo: true } }
    baseSlip: { select: { slipNo: true } }
    derivedSlips: typeof SLIP_CHANGE_LOCK
    locations: typeof SLIP_LOCATIONS
    items: {
      include: { vehicleBrand: { select: { name: true } }; vehicleType: { select: { name: true } } }
      orderBy: { sortOrder: "asc" }
    }
    rateLines: {
      include: { kind: { select: { id: true; code: true; name: true } } }
      orderBy: { sortOrder: "asc" }
    }
    securityPanel: {
      include: {
        insurer: { select: { id: true; name: true } }
        position: { select: { id: true; code: true; name: true } }
      }
      orderBy: { createdAt: "asc" }
    }
    clauses: {
      orderBy: { sortOrder: "asc" }
    }
    wordingForms: {
      include: { wordingForm: { select: { id: true; name: true } } }
    }
    _count: {
      select: { policies: true }
    }
  }
}>

/** Baris peserta dari database; hanya dimuat oleh detail slip. */
type ParticipantRow = Prisma.SlipParticipantGetPayload<object>

function toParticipant(p: ParticipantRow): SlipParticipant {
  return {
    id: p.id,
    name: p.name,
    idNumber: p.idNumber ?? undefined,
    birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : null,
    gender: p.gender ?? undefined,
    position: p.position ?? undefined,
    level: p.level ?? undefined,
    workLocation: p.workLocation ?? undefined,
    sumInsured: Number(p.sumInsured),
    beneficiary: p.beneficiary ?? undefined,
  }
}

function toPlacingSlipRecord(
  raw: PrismaPlacingSlipWithRelations & {
    participants?: ParticipantRow[]
    files?: Prisma.SlipFileGetPayload<object>[]
  }
): PlacingSlipRecord {
  const normCob = normalizeCob(raw.cob.name as CobType)

  // Items grouping
  const interestItems: LineItem[] = []
  const sumInsuredSection1: LineItem[] = []
  const sumInsuredSection2: LineItem[] = []

  for (const it of raw.items) {
    if (it.kind === "Interest") {
      const parsed = parseVehicleDescription(it.description)
      interestItems.push({
        id: it.id,
        description: it.description,
        amount: it.amount ? Number(it.amount) : 0,
        limitOnly: it.isLimitOnly || undefined,
        section: it.sectionNo === 2 ? 2 : undefined,
        vehicleBrandId: it.vehicleBrandId,
        vehicleTypeId: it.vehicleTypeId,
        vehicleBrandName: it.vehicleBrand?.name ?? null,
        vehicleTypeName: it.vehicleType?.name ?? null,
        licensePlate: parsed.licensePlate ?? null,
        chassisNumber: parsed.chassisNumber ?? null,
        engineNumber: parsed.engineNumber ?? null,
        year: parsed.year ?? null,
        color: parsed.color ?? null,
        vehicleModel: parsed.vehicleModel ?? null,
      })
    } else if (it.kind === "SumInsuredSection1") {
      sumInsuredSection1.push({
        id: it.id,
        description: it.description,
        amount: it.amount ? Number(it.amount) : 0,
        locationId: it.locationId,
      })
    } else if (it.kind === "SumInsuredSection2") {
      sumInsuredSection2.push({
        id: it.id,
        description: it.description,
        amount: it.amount ? Number(it.amount) : 0,
        locationId: it.locationId,
      })
    }
  }

  // Rate lines grouping
  const rateLines: RateLine[] = []
  const tplLines: RateLine[] = []
  const paLines: RateLine[] = []
  const rateExceptions: Record<string, RateException> = {}

  for (const rl of raw.rateLines) {
    const kindCode = rl.kind.code.toLowerCase()
    const lineItem: RateLine = {
      id: rl.id,
      label: rl.label,
      rate: rl.rate != null ? Number(rl.rate) : null,
      premium: Number(rl.premium),
      flatPremium: rl.isFlatPremium || undefined,
      basis: rl.limitAmount != null ? String(Number(rl.limitAmount)) : undefined,
      min: rl.rateMin != null ? Number(rl.rateMin) : null,
      max: rl.rateMax != null ? Number(rl.rateMax) : null,
      lossLimitPct: rl.lossLimitPct != null ? Number(rl.lossLimitPct) : null,
      deductibles: rl.deductibles,
      locationId: rl.locationId,
      vehicleId: rl.vehicleItemId,
    }

    if (kindCode === "tpl") {
      tplLines.push(lineItem)
    } else if (kindCode === "pa") {
      paLines.push(lineItem)
    } else {
      rateLines.push(lineItem)
    }

    if (rl.outOfBoundsReason) {
      let reason: RateExceptionReason = "Potongan sesuai nilai pertanggungan"
      let note = rl.outOfBoundsReason
      if (rl.outOfBoundsReason.startsWith("Perluasan jaminan:")) {
        reason = "Perluasan jaminan"
        note = rl.outOfBoundsReason.replace(/^Perluasan jaminan:\s*/, "")
      } else if (rl.outOfBoundsReason.startsWith("Potongan sesuai nilai pertanggungan:")) {
        reason = "Potongan sesuai nilai pertanggungan"
        note = rl.outOfBoundsReason.replace(/^Potongan sesuai nilai pertanggungan:\s*/, "")
      }
      rateExceptions[rl.id] = { reason, note }
    }
  }

  // Security Panel
  const securityPanel: SecurityPanelRow[] = raw.securityPanel.map((sp) => ({
    id: sp.id,
    insurer: sp.insurer.name,
    share: Number(sp.sharePct),
    role: sp.position.name === "As Leader" ? "As Leader" : "As Member",
    additionalFeePct: Number(sp.additionalFeePct),
  }))

  // Clauses & Overrides, per section. Section 0 (tanpa section) dan 2 hanya
  // dipakai slip Property.
  const clauseSet = (section: number) => {
    const ids: string[] = []
    const overrides: Record<string, ClauseOverride> = {}
    const copies: Record<string, ClauseOverride> = {}
    const groups: Record<string, string> = {}
    for (const cl of raw.clauses) {
      if (cl.section !== section) continue
      ids.push(cl.clauseId)
      copies[cl.clauseId] = { title: cl.title, wording: cl.wordingHtml }
      if (cl.groupTitle) groups[cl.clauseId] = cl.groupTitle
      if (cl.isEdited) {
        overrides[cl.clauseId] = {
          title: cl.title,
          wording: cl.wordingHtml,
        }
      }
    }
    return {
      ids,
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      copies,
      groups: Object.keys(groups).length > 0 ? groups : undefined,
    }
  }
  const clauses0 = clauseSet(0)
  const clauses1 = clauseSet(1)
  const clauses2 = clauseSet(2)

  // Wording forms
  const wordingForms = raw.wordingForms.map((wf) => wf.wordingForm.name)

  // Lokasi slip Property. Slip tanpa baris lokasi (data contoh) dibaca sebagai
  // satu lokasi dari isian slip oleh `slipLocations`.
  const locations: SlipLocation[] | undefined = raw.locations.length
    ? raw.locations.map((loc) => ({
        id: loc.id,
        riskLocation: loc.riskLocation ?? "",
        occupation: loc.occupation
          ? `${loc.occupation.code} - ${loc.occupation.name}`
          : undefined,
        occupationLabel: loc.occupationLabel || undefined,
        constructionClass: loc.constructionClass?.code || undefined,
      }))
    : undefined

  // Inception & Expiry formatting
  const inceptionDate = raw.inceptionDate
    ? raw.inceptionDate.toISOString().slice(0, 10)
    : null
  const expiryDate = raw.expiryDate
    ? raw.expiryDate.toISOString().slice(0, 10)
    : null

  // Sequence parsed from slipNo if available
  let seq = 0
  if (raw.slipNo) {
    const parts = raw.slipNo.split("/")
    if (parts.length > 0 && /^\d+$/.test(parts[0])) {
      seq = parseInt(parts[0], 10)
    }
  }

  return {
    id: raw.id,
    dbId: raw.id,
    slipNo: raw.slipNo,
    seq,
    cob: normCob,
    typeOfCover: raw.typeOfCover || raw.coverType?.name || "",
    typeOfCover2: raw.typeOfCover2 || raw.coverType2?.name || undefined,
    typeOfCoverLabel: raw.typeOfCoverLabel || undefined,
    typeOfCover2Label: raw.typeOfCover2Label || undefined,
    // Singkatan cover dari master didahulukan; slip lama tanpa cover type
    // memakai kode bawaan dari label type of cover.
    coverCode: joinCoverCodes(
      raw.coverType?.abbreviation ||
        coverCodeFor(normCob, raw.typeOfCover || raw.coverType?.name || ""),
      raw.coverType2?.abbreviation
    ),
    clientId: raw.clientId,
    sppaId: raw.sppaId,
    insuredName: raw.insuredName,
    correspondenceAddress: raw.correspondenceAddress || "",
    currency: raw.currencyCode,
    status: raw.status as SlipStatus,
    periodTba: raw.periodTba,
    inceptionDate,
    expiryDate,
    periodNote: raw.periodNote || undefined,
    periodLabel: raw.periodLabel || undefined,
    periodEndText: raw.periodEndText || undefined,
    periodText: raw.periodText || undefined,
    usesSections: raw.usesSections || undefined,
    openCover: raw.openCover || undefined,
    openCoverRates: cleanOpenCoverRates(raw.openCoverRates),
    // Tarif OJK mengikuti type of cover di Master Data, misalnya Heavy Equipment.
    ojkTariff: raw.coverType?.ojkTariff === false ? false : undefined,
    insuredDescription: raw.insuredDescription || undefined,
    detailRows: cleanDetailRows(raw.detailRows),
    paBenefitLimits:
      raw.paBenefitLimits == null ? null : cleanPaBenefitLimits(raw.paBenefitLimits),
    attachments: raw.files?.map(toSlipAttachment),
    occupation: raw.occupation
      ? `${raw.occupation.code} - ${raw.occupation.name}`
      : undefined,
    occupationLabel: raw.occupationLabel || undefined,
    riskLocation: raw.riskLocation || undefined,
    locations,
    coverage: raw.coverage || undefined,
    constructionClass: raw.constructionClass?.code || undefined,
    indemnityPeriod: raw.indemnityMonths ? `${raw.indemnityMonths} bulan` : undefined,
    interestSection1: raw.interestSection1 || undefined,
    interestSection2: raw.interestSection2 || undefined,
    specialConditions: raw.specialConditions || undefined,
    deductibleIntro: raw.deductibleIntro || undefined,
    exclusions: raw.exclusions || undefined,
    interestItems,
    sumInsuredSection1,
    sumInsuredSection2,
    clauseIds: clauses1.ids,
    clauseOverrides: clauses1.overrides,
    clauseCopies: clauses1.copies,
    clauseGroups: clauses1.groups,
    participants: raw.participants?.map(toParticipant),
    clauseIdsSection2: clauses2.ids,
    clauseOverridesSection2: clauses2.overrides,
    clauseCopiesSection2: clauses2.copies,
    clauseIdsGeneral: clauses0.ids,
    clauseOverridesGeneral: clauses0.overrides,
    clauseCopiesGeneral: clauses0.copies,
    wordingForms,
    rateLines,
    tplLines,
    paLines,
    rateExceptions: Object.keys(rateExceptions).length > 0 ? rateExceptions : undefined,
    securityPanel,
    discountPct: Number(raw.discountPct),
    adminCost: Number(raw.adminCost),
    stampDuty: Number(raw.stampDuty),
    brokeragePct: Number(raw.brokeragePct),
    includeVat: raw.includeVat,
    additionalFeeIncludeVat: raw.additionalFeeIncludeVat,
    subjectivity: raw.subjectivity || undefined,
    closingInstruction: raw.closingInstruction || undefined,
    coverNoteRemarks: raw.coverNoteRemarks || undefined,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    releaseDate: dateOnly(raw.releaseDate),
    quotedDate: dateOnly(raw.quotedDate),
    closingDate: dateOnly(raw.closingDate),
    // Endorsement dan cancellation slip (Harry, 11 November 2026).
    kind: raw.kind,
    parentPolicyId: raw.parentPolicyId,
    parentPolicyNo: raw.parentPolicy?.policyNo ?? null,
    baseSlipId: raw.baseSlipId,
    baseSlipNo: raw.baseSlip?.slipNo ?? null,
    effectiveDate: dateOnly(raw.effectiveDate),
    changeDescription: raw.changeDescription ?? null,
    beforeCalc: (raw.beforeCalc as EndorsementCalc | null) ?? null,
    changeSlipLock: toChangeSlipLock(raw.derivedSlips[0]),
    clientName: raw.client.name,
    cobName: raw.cob.name,
    coverTypeName: raw.coverType?.name || null,
    createdByName: raw.creator.name,
    policyCount: raw._count.policies,
  }
}

export async function listPlacingSlips(
  params: ListPlacingSlipsParams = {}
): Promise<PlacingSlipRecord[]> {
  await seedInitialSlipsIfEmpty()

  const { search, clientId, cob, status } = params
  const whereAnd: Prisma.PlacingSlipWhereInput[] = []

  if (search && search.trim()) {
    const q = search.trim()
    whereAnd.push({
      OR: [
        { slipNo: { contains: q, mode: "insensitive" } },
        { insuredName: { contains: q, mode: "insensitive" } },
        { riskLocation: { contains: q, mode: "insensitive" } },
        { client: { name: { contains: q, mode: "insensitive" } } },
      ],
    })
  }

  if (clientId && clientId !== "all") {
    try {
      const resolvedClientId = await resolveClientId(clientId)
      whereAnd.push({ clientId: resolvedClientId })
    } catch {
      whereAnd.push({ clientId })
    }
  }

  if (cob && cob !== "all") {
    const norm = normalizeCob(cob as CobType).toLowerCase()
    whereAnd.push({
      cob: {
        OR: [
          { name: { equals: norm, mode: "insensitive" } },
          { code: { equals: norm, mode: "insensitive" } },
        ],
      },
    })
  }

  if (status && status !== "all") {
    whereAnd.push({ status: status as SlipStatus })
  }

  const records = await prisma.placingSlip.findMany({
    where: whereAnd.length > 0 ? { AND: whereAnd } : undefined,
    include: {
      client: { select: { id: true, name: true } },
      cob: { select: { id: true, code: true, name: true } },
      coverType: {
        select: { id: true, code: true, name: true, abbreviation: true, ojkTariff: true },
      },
      coverType2: { select: { id: true, code: true, name: true, abbreviation: true } },
      occupation: { select: { id: true, code: true, name: true } },
      constructionClass: { select: { id: true, code: true, name: true } },
      currency: { select: { code: true } },
      creator: { select: { id: true, name: true } },
      parentPolicy: { select: { policyNo: true } },
      baseSlip: { select: { slipNo: true } },
      derivedSlips: SLIP_CHANGE_LOCK,
      locations: SLIP_LOCATIONS,
      items: { include: SLIP_ITEM_VEHICLE, orderBy: { sortOrder: "asc" } },
      rateLines: {
        include: { kind: { select: { id: true, code: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      securityPanel: {
        include: {
          insurer: { select: { id: true, name: true } },
          position: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      clauses: {
        orderBy: { sortOrder: "asc" },
      },
      wordingForms: {
        include: { wordingForm: { select: { id: true, name: true } } },
      },
      _count: {
        select: { policies: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  })

  return records.map(toPlacingSlipRecord)
}

/**
 * Mengambil detail satu Placing Slip berdasarkan UUID atau fallback legacy ID.
 */
/**
 * Isi slip baru yang disalin dari slip lain, berstatus Draft. Dipakai duplikat
 * slip dan pembuatan endorsement/cancellation slip.
 */
export function copySlipInput(source: PlacingSlipRecord): PlacingSlipInput {
  return {
    clientId: source.clientId || "",
    cob: source.cob,
    typeOfCover: source.typeOfCover,
    typeOfCover2: source.typeOfCover2,
    typeOfCoverLabel: source.typeOfCoverLabel,
    typeOfCover2Label: source.typeOfCover2Label,
    coverCode: source.coverCode,
    insuredName: source.insuredName,
    correspondenceAddress: source.correspondenceAddress,
    currency: source.currency,
    status: "Draft",
    periodTba: source.periodTba,
    inceptionDate: source.inceptionDate,
    expiryDate: source.expiryDate,
    periodNote: source.periodNote,
    periodLabel: source.periodLabel,
    periodEndText: source.periodEndText,
    periodText: source.periodText,
    insuredDescription: source.insuredDescription,
    usesSections: source.usesSections,
    openCover: source.openCover,
    openCoverRates: source.openCoverRates,
    detailRows: source.detailRows,
    occupation: source.occupation,
    occupationLabel: source.occupationLabel,
    riskLocation: source.riskLocation,
    locations: source.locations,
    coverage: source.coverage,
    constructionClass: source.constructionClass,
    indemnityPeriod: source.indemnityPeriod,
    interestSection1: source.interestSection1,
    interestSection2: source.interestSection2,
    specialConditions: source.specialConditions,
    deductibleIntro: source.deductibleIntro,
    exclusions: source.exclusions,
    interestItems: source.interestItems,
    sumInsuredSection1: source.sumInsuredSection1,
    sumInsuredSection2: source.sumInsuredSection2,
    clauseIds: source.clauseIds,
    clauseOverrides: source.clauseOverrides,
    clauseGroups: source.clauseGroups,
    participants: source.participants,
    paBenefitLimits: source.paBenefitLimits,
    clauseIdsSection2: source.clauseIdsSection2,
    clauseOverridesSection2: source.clauseOverridesSection2,
    clauseIdsGeneral: source.clauseIdsGeneral,
    clauseOverridesGeneral: source.clauseOverridesGeneral,
    wordingForms: source.wordingForms,
    rateLines: source.rateLines,
    tplLines: source.tplLines,
    paLines: source.paLines,
    rateExceptions: source.rateExceptions,
    securityPanel: source.securityPanel,
    discountPct: source.discountPct,
    adminCost: source.adminCost,
    stampDuty: source.stampDuty,
    brokeragePct: source.brokeragePct,
    includeVat: source.includeVat,
    additionalFeeIncludeVat: source.additionalFeeIncludeVat,
  }
}

/**
 * Endorsement atau cancellation slip dari slip polis yang sudah Closed (Harry,
 * 11 November 2026). Isinya salinan slip asal, jadi user tinggal mengubah yang
 * berubah. Kondisi sebelum perubahan disimpan sebagai dasar perhitungan premi.
 * Slip asal bisa placing slip, atau endorsement slip sebelumnya yang sudah
 * Closed untuk endorsement berikutnya.
 */
export async function createEndorsementSlip(
  baseSlipId: string,
  kind: "Endorsement" | "Cancellation",
  userId: string
): Promise<PlacingSlipRecord> {
  const base = await getPlacingSlipById(baseSlipId)
  if (!base) throw new Error("Slip asal tidak ditemukan.")
  if (base.status !== "Closed") {
    throw new Error("Endorsement dan cancellation dibuat dari slip yang sudah Closed.")
  }
  if (base.kind === "Cancellation") {
    throw new Error("Slip ini adalah cancellation slip; polisnya sudah dibatalkan.")
  }
  const parentPolicyId =
    base.kind === "Endorsement"
      ? base.parentPolicyId
      : (
          await prisma.policy.findFirst({
            where: {
              placingSlipId: base.dbId,
              policyType: { code: { in: ["new", "renewal"] } },
            },
            orderBy: [{ slipPart: "asc" }, { createdAt: "asc" }],
            select: { id: true },
          })
        )?.id
  if (!parentPolicyId) {
    throw new Error(
      "Polis dari slip ini belum tercatat di Policy Database. Catat polisnya dulu dari dokumen Closing Instruction."
    )
  }
  // Termasuk pembatalan dari Policy Database yang menunjuk endorsement polis ini.
  const cancellationNo = (await loadCancelledPolicies()).get(parentPolicyId)
  if (cancellationNo) throw new Error(`Polis ini sudah dibatalkan (${cancellationNo}).`)
  // Satu perubahan polis diproses sampai selesai dulu, supaya perhitungan
  // sebelum dan sesudahnya tidak tumpang tindih.
  const open = await prisma.placingSlip.findFirst({
    where: {
      parentPolicyId,
      kind: { in: ["Endorsement", "Cancellation"] },
      status: { in: ["Draft", "Released", "Quoted"] },
    },
    select: { slipNo: true, kind: true },
  })
  if (open) {
    throw new Error(
      `Masih ada ${open.kind === "Cancellation" ? "cancellation" : "endorsement"} slip ${open.slipNo ?? "(draft)"} untuk polis ini yang belum ditutup.`
    )
  }
  // Kondisi sebelum perubahan adalah endorsement terakhir yang sudah Closed,
  // dari baris slip mana pun user memulai.
  const latest = await prisma.placingSlip.findFirst({
    where: { parentPolicyId, kind: "Endorsement", status: "Closed" },
    orderBy: [{ closingDate: "desc" }, { updatedAt: "desc" }],
    select: { id: true },
  })
  const source = latest && latest.id !== base.dbId ? await getPlacingSlipById(latest.id) : base
  if (!source) throw new Error("Slip asal tidak ditemukan.")

  const created = await createPlacingSlip(copySlipInput(source), userId)
  await prisma.placingSlip.update({
    where: { id: created.dbId },
    data: {
      kind,
      parentPolicyId,
      baseSlipId: source.dbId,
      effectiveDate: dbDate(todayIso()),
      beforeCalc: slipCalc(source) as unknown as Prisma.InputJsonValue,
    },
  })
  const full = await getPlacingSlipById(created.dbId)
  if (!full) throw new Error("Gagal mengambil endorsement slip yang baru dibuat.")
  return full
}

export async function getPlacingSlipById(id: string): Promise<PlacingSlipRecord | null> {
  await seedInitialSlipsIfEmpty()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  )

  const whereClause: Prisma.PlacingSlipWhereUniqueInput = isUuid
    ? { id }
    : { slipNo: id }

  const record = await prisma.placingSlip.findUnique({
    where: whereClause,
    include: {
      client: { select: { id: true, name: true } },
      cob: { select: { id: true, code: true, name: true } },
      coverType: {
        select: { id: true, code: true, name: true, abbreviation: true, ojkTariff: true },
      },
      coverType2: { select: { id: true, code: true, name: true, abbreviation: true } },
      occupation: { select: { id: true, code: true, name: true } },
      constructionClass: { select: { id: true, code: true, name: true } },
      currency: { select: { code: true } },
      creator: { select: { id: true, name: true } },
      parentPolicy: { select: { policyNo: true } },
      baseSlip: { select: { slipNo: true } },
      derivedSlips: SLIP_CHANGE_LOCK,
      locations: SLIP_LOCATIONS,
      items: { include: SLIP_ITEM_VEHICLE, orderBy: { sortOrder: "asc" } },
      rateLines: {
        include: { kind: { select: { id: true, code: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      securityPanel: {
        include: {
          insurer: { select: { id: true, name: true } },
          position: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      clauses: {
        orderBy: { sortOrder: "asc" },
      },
      participants: { orderBy: { sortOrder: "asc" } },
      files: { orderBy: slipFilesOrder },
      wordingForms: {
        include: { wordingForm: { select: { id: true, name: true } } },
      },
      _count: {
        select: { policies: true },
      },
    },
  })

  if (!record) return null
  return toPlacingSlipRecord(record)
}

/**
 * Detail tambahan yang disimpan ke kolom JSON. Input tanpa field ini (bukan
 * dari form slip) tidak mengubah isi yang sudah tersimpan.
 */
function detailRowsData(rows: SlipDetailRow[] | null | undefined) {
  if (rows === undefined) return undefined
  return cleanDetailRows(rows).map((r) => ({ label: r.label, value: r.value }))
}

/** Rate open cover yang valid untuk kolom JSON. Undefined berarti tidak diubah. */
function openCoverRatesData(rates: OpenCoverRate[] | undefined) {
  if (rates === undefined) return undefined
  return cleanOpenCoverRates(rates).map((r) => ({
    id: r.id,
    label: r.label,
    basis: r.basis,
    rate: r.rate,
    ...(r.unit ? { unit: r.unit } : {}),
  }))
}

/** Limit manfaat PA yang valid; kosong disimpan sebagai NULL (memakai bawaan). */
function paBenefitLimitsData(limits: Record<string, number> | null | undefined) {
  if (limits === undefined) return undefined
  const clean = cleanPaBenefitLimits(limits)
  return Object.keys(clean).length ? clean : Prisma.DbNull
}

/** Filled-in deductibles only, trimmed and capped at MAX_DEDUCTIBLES. */
function cleanDeductibles(deductibles: string[] | undefined) {
  return (deductibles ?? [])
    .map((d) => d.trim())
    .filter(Boolean)
    .slice(0, MAX_DEDUCTIBLES)
}

/**
 * Additional fee (%) per asuransi di panel, hanya untuk Property dan Motor
 * Vehicle; COB lain 0 (Harry, 12 November 2026: fee diisi saat closing).
 */
function panelFeePct(cobName: string, pct: number | undefined) {
  return new Prisma.Decimal(
    usesAdditionalFee(normalizeCob(cobName)) ? Math.max(0, pct ?? 0) : 0
  )
}

/** Tanda PPN additional fee hanya berlaku untuk COB yang punya additional fee. */
function slipAdditionalFeeIncludeVat(cobName: string, includeVat: boolean | undefined) {
  return usesAdditionalFee(normalizeCob(cobName)) && (includeVat ?? false)
}

interface SavedLocation {
  /** Id baru di slip_locations. */
  id: string
  /** Id lokasi di form, yang dirujuk `locationId` baris sum insured dan rate. */
  sourceId: string
  riskLocation: string | null
  occupationId: string | null
  occupationLabel: string | null
  constructionClassId: string | null
}

/**
 * Lokasi slip Property yang akan disimpan, dengan id baru. Input tanpa daftar
 * lokasi menjadi satu lokasi dari isian okupasi, risk location, dan kelas
 * slip. COB lain tidak punya lokasi.
 */
async function resolveSlipLocations(
  input: PlacingSlipInput,
  cobName: string
): Promise<SavedLocation[]> {
  if (normalizeCob(cobName) !== "Property") return []
  const cache = await getLookupsCache()
  const occupationIdFor = (occupation?: string | null) => {
    const code = occupation?.trim().split(/[^0-9A-Za-z]/)[0].toLowerCase()
    return (code && cache.occupationsByCode.get(code)?.id) || null
  }
  const classIdFor = (code?: string | null) =>
    (code && cache.constructionClasses.get(code)) || null

  if (!input.locations?.length) {
    return [
      {
        id: randomUUID(),
        sourceId: "",
        riskLocation: input.riskLocation?.trim() || null,
        occupationId: input.occupationId || occupationIdFor(input.occupation),
        occupationLabel: input.occupationLabel?.trim() || null,
        constructionClassId: classIdFor(input.constructionClass),
      },
    ]
  }
  return input.locations.map((loc) => ({
    id: randomUUID(),
    sourceId: loc.id,
    riskLocation: loc.riskLocation.trim() || null,
    occupationId: occupationIdFor(loc.occupation),
    occupationLabel: loc.occupationLabel?.trim() || null,
    constructionClassId: classIdFor(loc.constructionClass),
  }))
}

/**
 * Okupasi, risk location, dan kelas slip Property diisi dari lokasinya, supaya
 * polis, daftar slip, dan pencarian tetap membaca satu nilai.
 */
function slipLocationFields(locations: SavedLocation[]) {
  if (!locations.length) return {}
  const first = locations[0]
  return {
    occupationId: first.occupationId,
    occupationLabel: first.occupationLabel,
    constructionClassId: first.constructionClassId,
    riskLocation:
      slipRiskLocationText(
        locations.map((l) => ({ riskLocation: l.riskLocation ?? "" }))
      ) || null,
  }
}

async function insertSlipLocations(
  tx: Prisma.TransactionClient,
  slipId: string,
  locations: SavedLocation[]
) {
  if (!locations.length) return
  await tx.slipLocation.createMany({
    data: locations.map((l, i) => ({
      id: l.id,
      slipId,
      sortOrder: i,
      riskLocation: l.riskLocation,
      occupationId: l.occupationId,
      occupationLabel: l.occupationLabel,
      constructionClassId: l.constructionClassId,
    })),
  })
}

/**
 * Baris Interest tersimpan (kendaraan atau objek) untuk baris rate, TPL, atau
 * PA. Baris tanpa objek ikut objek pertama. undefined berarti objeknya tidak
 * tersimpan karena kosong, jadi barisnya ikut dibuang.
 */
function savedItemId(
  itemIds: Map<string, string>,
  itemId?: string | null
): string | null | undefined {
  if (!itemId) return itemIds.values().next().value ?? null
  return itemIds.get(itemId)
}

/** Lokasi tersimpan untuk `locationId` dari form; yang tidak dikenal ikut lokasi pertama. */
function savedLocationId(
  locations: SavedLocation[],
  sourceId?: string | null
) {
  if (!locations.length) return null
  return (
    locations.find((l) => sourceId && l.sourceId === sourceId)?.id ??
    locations[0].id
  )
}

/**
 * Copies selected clauses to slip_clauses with wording from slip override or master.
 * The general group (section 0) and Section 2 are stored only for slips with
 * sections: Property, and CAR/EAR-style slips with sections switched on.
 */
async function insertSlipClauses(
  tx: Prisma.TransactionClient,
  slipId: string,
  cobName: string,
  input: Pick<
    PlacingSlipInput,
    | "clauseIds"
    | "clauseOverrides"
    | "clauseGroups"
    | "clauseIdsSection2"
    | "clauseOverridesSection2"
    | "clauseIdsGeneral"
    | "clauseOverridesGeneral"
    | "usesSections"
  >
) {
  // Satu klausula hanya di satu kelompok: tanpa section, Section 1, atau Section 2.
  const cob = normalizeCob(cobName)
  const sectioned =
    slipSectionTitles({ cob, usesSections: input.usesSections === true }) !== null
  if (sectioned) {
    const issues = validateClauseUniquenessAcrossSections({
      clauseIds: input.clauseIds ?? [],
      clauseIdsSection2: input.clauseIdsSection2 ?? [],
      clauseIdsGeneral: input.clauseIdsGeneral ?? [],
    })
    if (issues.length > 0) {
      throw new Error(issues[0])
    }
  }

  // Slip tanpa section boleh mengelompokkan daftar utamanya dengan judul;
  // klausul sekelompok disimpan berdampingan.
  const groups = sectioned
    ? undefined
    : cleanClauseGroups([...new Set(input.clauseIds ?? [])], input.clauseGroups)
  const sections = [
    {
      section: 1,
      ids: groupedClauseOrder([...new Set(input.clauseIds ?? [])], groups),
      overrides: input.clauseOverrides,
    },
  ]
  if (sectioned) {
    sections.push(
      {
        section: 0,
        ids: input.clauseIdsGeneral ?? [],
        overrides: input.clauseOverridesGeneral,
      },
      {
        section: 2,
        ids: input.clauseIdsSection2 ?? [],
        overrides: input.clauseOverridesSection2,
      }
    )
  }
  for (const { section, ids, overrides } of sections) {
    let clIdx = 0
    for (const clId of new Set(ids ?? [])) {
      const clause = await tx.clause.findUnique({
        where: { id: clId },
        select: { id: true, title: true, wordingHtml: true },
      })

      if (clause) {
        const override = overrides?.[clId]
        await tx.slipClause.create({
          data: {
            slipId,
            section,
            clauseId: clause.id,
            title: override?.title || clause.title,
            wordingHtml: override?.wording || clause.wordingHtml,
            isEdited: Boolean(override),
            groupTitle: section === 1 ? (groups?.[clause.id] ?? null) : null,
            sortOrder: clIdx++,
          },
        })
      }
    }
  }
}

/**
 * Ganti seluruh peserta PA grup slip. Isian teks dirapikan dan dipotong sesuai
 * batas; urutan disimpan sebagai sort_order.
 */
async function replaceParticipants(
  tx: Prisma.TransactionClient,
  slipId: string,
  list: SlipParticipant[]
) {
  await tx.slipParticipant.deleteMany({ where: { slipId } })
  if (!list.length) return
  const text = (v?: string | null) => v?.trim().slice(0, PARTICIPANT_LIMITS.text) || null
  await tx.slipParticipant.createMany({
    data: list.slice(0, PARTICIPANT_LIMITS.rows).map((p, i) => ({
      slipId,
      name: p.name.trim().slice(0, PARTICIPANT_LIMITS.text),
      idNumber: text(p.idNumber),
      birthDate: p.birthDate ? new Date(`${p.birthDate}T00:00:00Z`) : null,
      gender: text(p.gender),
      position: text(p.position),
      level: text(p.level),
      workLocation: text(p.workLocation),
      sumInsured: new Prisma.Decimal(Math.max(0, p.sumInsured || 0)),
      beneficiary: text(p.beneficiary),
      sortOrder: i,
    })),
  })
}

export async function createPlacingSlip(
  input: PlacingSlipInput,
  userId: string
): Promise<PlacingSlipRecord> {
  const cache = await getLookupsCache()
  const resolvedClientId = await resolveClientId(input.clientId, input.insuredName)
  const resolvedCob = await resolveCob(input.cob)
  const resolvedCoverType = await resolveCoverType(resolvedCob.id, input.typeOfCover)
  const coverType2 = await slipCoverType2(resolvedCob, input.typeOfCover2)

  let occupationId: string | null = input.occupationId || null
  if (!occupationId && input.occupation) {
    const code = input.occupation.trim().split(/[^0-9A-Za-z]/)[0].toLowerCase()
    const foundOcc = cache.occupationsByCode.get(code)
    if (foundOcc) occupationId = foundOcc.id
  }

  const currencyCode = (input.currency || "IDR").toUpperCase()
  if (!cache.currencies.has(currencyCode)) {
    throw new Error(`Mata uang ${currencyCode} tidak didukung.`)
  }

  let constructionClassId: string | null = null
  if (input.constructionClass) {
    constructionClassId = cache.constructionClasses.get(input.constructionClass) || null
  }

  const indemnityMonths = parseIndemnityMonths(input.indemnityPeriod)

  const inceptionDate = input.inceptionDate ? new Date(input.inceptionDate) : null
  const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null
  const resolvedSppaId = await resolveSppaId(input.sppaId)
  const locations = await resolveSlipLocations(input, resolvedCob.name)
  // Baris rate Motor Vehicle dan COB lain selain Property menunjuk objeknya.
  const itemRates = usesItemRates(normalizeCob(resolvedCob.name as CobType))

  const record = await prisma.$transaction(async (tx) => {
    const slip = await tx.placingSlip.create({
      data: {
        clientId: resolvedClientId,
        sppaId: resolvedSppaId,
        cobId: resolvedCob.id,
        coverTypeId: resolvedCoverType?.id || null,
        typeOfCover: input.typeOfCover?.trim() || null,
        ...coverType2,
        typeOfCoverLabel: input.typeOfCoverLabel?.trim() || null,
        typeOfCover2Label: coverType2.typeOfCover2
          ? input.typeOfCover2Label?.trim() || null
          : null,
        insuredName: input.insuredName.trim(),
        correspondenceAddress: input.correspondenceAddress?.trim() || null,
        currencyCode,
        status: (input.status as SlipStatus) || "Draft",
        ...dbDocumentDates(
          withStatusDates(input, "Draft", (input.status as SlipStatus) || "Draft")
        ),
        periodTba: input.periodTba ?? false,
        inceptionDate,
        expiryDate,
        periodNote: input.periodNote?.trim() || null,
        periodLabel: input.periodLabel?.trim() || null,
        periodEndText: input.periodEndText?.trim() || null,
        periodText: input.periodText?.trim() || null,
        usesSections: input.usesSections === true,
        openCover: input.openCover === undefined ? undefined : input.openCover === true,
        openCoverRates: openCoverRatesData(input.openCoverRates),
        insuredDescription: input.insuredDescription?.trim() || null,
        detailRows: detailRowsData(input.detailRows),
        paBenefitLimits: paBenefitLimitsData(input.paBenefitLimits),
        occupationId,
        occupationLabel: input.occupationLabel?.trim() || null,
        riskLocation: input.riskLocation?.trim() || null,
        coverage: input.coverage?.trim() || null,
        constructionClassId,
        ...slipLocationFields(locations),
        indemnityMonths,
        interestSection1: input.interestSection1?.trim() || null,
        interestSection2: input.interestSection2?.trim() || null,
        specialConditions: input.specialConditions?.trim() || null,
        deductibleIntro: input.deductibleIntro?.trim() || null,
        exclusions: input.exclusions?.trim() || null,
        discountPct: new Prisma.Decimal(input.discountPct ?? 0),
        adminCost: new Prisma.Decimal(input.adminCost ?? 0),
        stampDuty: new Prisma.Decimal(input.stampDuty ?? 0),
        brokeragePct: new Prisma.Decimal(input.brokeragePct ?? 0),
        includeVat: input.includeVat ?? false,
        additionalFeeIncludeVat: slipAdditionalFeeIncludeVat(resolvedCob.name, input.additionalFeeIncludeVat),
        subjectivity: input.subjectivity?.trim() || null,
        closingInstruction: input.closingInstruction?.trim() || null,
        coverNoteRemarks: input.coverNoteRemarks?.trim() || null,
        createdBy: userId,
      },
    })

    await insertSlipLocations(tx, slip.id, locations)

    // Insert items
    let sortIdx = 0
    const itemIds = new Map<string, string>()
    const itemsToCreate: {
      id?: string
      slipId: string
      kind: SlipItemKind
      description: string
      amount: Prisma.Decimal | null
      isLimitOnly?: boolean
      sectionNo?: number | null
      sortOrder: number
      vehicleBrandId?: string | null
      vehicleTypeId?: string | null
      locationId?: string | null
    }[] = []

    if (input.interestItems) {
      const motor = normalizeCob(resolvedCob.name as CobType) === "Motor Vehicle"
      for (const it of input.interestItems) {
        // Kendaraan dengan TSI tetap disimpan walau datanya belum lengkap,
        // karena rate-nya menempel ke kendaraan itu.
        const hasMotorData =
          motor &&
          Boolean(
            it.vehicleBrandId ||
            it.licensePlate ||
            it.chassisNumber ||
            it.vehicleModel ||
            (it.amount || 0) > 0
          )
        if (it.description?.trim() || hasMotorData) {
          const finalDesc = motor
            ? buildVehicleDescription(it) || it.description?.trim() || "Kendaraan Bermotor"
            : it.description.trim()
          const itemId = randomUUID()
          itemIds.set(it.id, itemId)
          itemsToCreate.push({
            id: itemId,
            slipId: slip.id,
            kind: "Interest",
            description: finalDesc,
            amount: new Prisma.Decimal(it.amount || 0),
            isLimitOnly: it.limitOnly === true,
            sectionNo: it.section === 2 ? 2 : null,
            sortOrder: sortIdx++,
            ...(motor ? await checkVehiclePair(tx, it.vehicleBrandId, it.vehicleTypeId) : {}),
          })
        }
      }
    }

    if (input.sumInsuredSection1) {
      for (const it of input.sumInsuredSection1) {
        if (it.description.trim()) {
          itemsToCreate.push({
            slipId: slip.id,
            kind: "SumInsuredSection1",
            description: it.description.trim(),
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
            locationId: savedLocationId(locations, it.locationId),
          })
        }
      }
    }

    if (input.sumInsuredSection2) {
      for (const it of input.sumInsuredSection2) {
        if (it.description.trim()) {
          itemsToCreate.push({
            slipId: slip.id,
            kind: "SumInsuredSection2",
            description: it.description.trim(),
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
            locationId: savedLocationId(locations, it.locationId),
          })
        }
      }
    }

    if (itemsToCreate.length > 0) {
      await tx.slipItem.createMany({ data: itemsToCreate })
    }

    // Insert rate lines
    let rateSortIdx = 0
    const rateKindId = cache.rateLineKinds.get("rate")!
    const tplKindId = cache.rateLineKinds.get("tpl")!
    const paKindId = cache.rateLineKinds.get("pa")!

    const rateLinesToCreate: {
      slipId: string
      kindId: string
      label: string
      limitAmount: Prisma.Decimal | null
      rate: Prisma.Decimal | null
      premium: Prisma.Decimal
      isFlatPremium?: boolean
      rateMin: Prisma.Decimal | null
      rateMax: Prisma.Decimal | null
      lossLimitPct: Prisma.Decimal | null
      deductibles: string[]
      outOfBoundsReason: string | null
      sortOrder: number
      locationId?: string | null
      vehicleItemId?: string | null
    }[] = []

    if (input.rateLines) {
      for (const rl of input.rateLines) {
        const vehicleItemId = itemRates
          ? savedItemId(itemIds, rl.vehicleId)
          : null
        if (vehicleItemId === undefined) continue
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: slip.id,
          kindId: rateKindId,
          label: rl.label,
          limitAmount: null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          isFlatPremium: rl.flatPremium === true,
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          lossLimitPct:
            rl.lossLimitPct != null ? new Prisma.Decimal(rl.lossLimitPct) : null,
          deductibles: cleanDeductibles(rl.deductibles),
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
          locationId: savedLocationId(locations, rl.locationId),
          vehicleItemId,
        })
      }
    }

    if (input.tplLines) {
      for (const rl of input.tplLines) {
        const vehicleItemId = itemRates
          ? savedItemId(itemIds, rl.vehicleId)
          : null
        if (vehicleItemId === undefined) continue
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: slip.id,
          kindId: tplKindId,
          label: rl.label,
          limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          lossLimitPct: null,
          deductibles: cleanDeductibles(rl.deductibles),
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
          vehicleItemId,
        })
      }
    }

    if (input.paLines) {
      for (const rl of input.paLines) {
        const vehicleItemId = itemRates
          ? savedItemId(itemIds, rl.vehicleId)
          : null
        if (vehicleItemId === undefined) continue
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: slip.id,
          kindId: paKindId,
          label: rl.label,
          limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          lossLimitPct: null,
          deductibles: cleanDeductibles(rl.deductibles),
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
          vehicleItemId,
        })
      }
    }

    if (rateLinesToCreate.length > 0) {
      await tx.slipRateLine.createMany({ data: rateLinesToCreate })
    }

    // Insert security panel
    if (input.securityPanel && input.securityPanel.length > 0) {
      const leaderRoleId = cache.securityRoles.get("leader")!
      const memberRoleId = cache.securityRoles.get("member")!

      for (const sp of input.securityPanel) {
        if (!sp.insurer.trim()) continue

        // Resolve or create insurer
        let insurer = await tx.insurer.findFirst({
          where: { name: { equals: sp.insurer.trim(), mode: "insensitive" } },
          select: { id: true },
        })
        if (!insurer) {
          insurer = await tx.insurer.create({
            data: { name: sp.insurer.trim() },
            select: { id: true },
          })
        }

        const positionId = sp.role === "As Leader" ? leaderRoleId : memberRoleId
        await tx.slipSecurityPanel.create({
          data: {
            slipId: slip.id,
            insurerId: insurer.id,
            sharePct: new Prisma.Decimal(sp.share || 0),
            positionId,
            additionalFeePct: panelFeePct(resolvedCob.name, sp.additionalFeePct),
          },
        })
      }
    }

    // Insert clauses
    await insertSlipClauses(tx, slip.id, resolvedCob.name, input)
    if (input.participants?.length) {
      await replaceParticipants(tx, slip.id, input.participants)
    }

    // Insert wording forms
    if (input.wordingForms && input.wordingForms.length > 0) {
      for (const wf of input.wordingForms) {
        if (!wf.trim()) continue
        let form = await tx.wordingForm.findFirst({
          where: { name: { equals: wf.trim(), mode: "insensitive" } },
          select: { id: true },
        })
        if (!form) {
          form = await tx.wordingForm.create({
            data: { name: wf.trim() },
            select: { id: true },
          })
        }

        await tx.slipWordingForm.create({
          data: {
            slipId: slip.id,
            wordingFormId: form.id,
          },
        })
      }
    }

    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: slip.id,
      action: "Create",
      after: {
        insuredName: slip.insuredName,
        cob: resolvedCob.name,
        status: slip.status,
      },
    })

    return slip
  })

  const full = await getPlacingSlipById(record.id)
  if (!full) throw new Error("Gagal mengambil data placing slip setelah pembuatan.")
  return full
}

export async function updatePlacingSlip(
  id: string,
  input: PlacingSlipInput,
  userId: string
): Promise<PlacingSlipRecord> {
  const cache = await getLookupsCache()
  const existing = await prisma.placingSlip.findUnique({
    where: { id },
    include: { cob: true },
  })

  if (!existing) {
    throw new Error("Placing slip tidak ditemukan.")
  }

  if (existing.status === "Cancelled") {
    throw new Error("Placing Slip berstatus Cancelled tidak dapat diubah.")
  }

  // Kunci revisi slip asal: setelah ada endorsement atau cancellation slip,
  // perubahan polis dibuat lewat slip perubahan.
  const lock = toChangeSlipLock(
    await prisma.placingSlip.findFirst({
      where: { ...SLIP_CHANGE_LOCK.where, baseSlipId: id },
      select: SLIP_CHANGE_LOCK.select,
      orderBy: SLIP_CHANGE_LOCK.orderBy,
    })
  )
  if (lock) throw new Error(changeSlipLockText(lock))

  const resolvedClientId = await resolveClientId(input.clientId, input.insuredName)
  const resolvedCob = await resolveCob(input.cob)
  const resolvedCoverType = await resolveCoverType(resolvedCob.id, input.typeOfCover)
  const coverType2 = await slipCoverType2(resolvedCob, input.typeOfCover2)

  let occupationId: string | null = input.occupationId || null
  if (!occupationId && input.occupation) {
    const code = input.occupation.trim().split(/[^0-9A-Za-z]/)[0].toLowerCase()
    const foundOcc = cache.occupationsByCode.get(code)
    if (foundOcc) occupationId = foundOcc.id
  }

  const currencyCode = (input.currency || "IDR").toUpperCase()
  if (!cache.currencies.has(currencyCode)) {
    throw new Error(`Mata uang ${currencyCode} tidak didukung.`)
  }

  let constructionClassId: string | null = null
  if (input.constructionClass) {
    constructionClassId = cache.constructionClasses.get(input.constructionClass) || null
  }

  const indemnityMonths = parseIndemnityMonths(input.indemnityPeriod)
  const inceptionDate = input.inceptionDate ? new Date(input.inceptionDate) : null
  const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null
  const resolvedSppaId =
    input.sppaId !== undefined ? await resolveSppaId(input.sppaId) : existing.sppaId
  const locations = await resolveSlipLocations(input, resolvedCob.name)
  // Baris rate Motor Vehicle dan COB lain selain Property menunjuk objeknya.
  const itemRates = usesItemRates(normalizeCob(resolvedCob.name as CobType))

  const nextStatus = (input.status as SlipStatus) || existing.status
  const previousDates: SlipDocumentDates = {
    releaseDate: dateOnly(existing.releaseDate),
    quotedDate: dateOnly(existing.quotedDate),
    closingDate: dateOnly(existing.closingDate),
  }
  // Field yang tidak dikirim berarti tidak diubah.
  const documentDates = withStatusDates(
    {
      releaseDate:
        input.releaseDate !== undefined ? input.releaseDate : previousDates.releaseDate,
      quotedDate:
        input.quotedDate !== undefined ? input.quotedDate : previousDates.quotedDate,
      closingDate:
        input.closingDate !== undefined ? input.closingDate : previousDates.closingDate,
    },
    existing.status,
    nextStatus
  )

  await prisma.$transaction(async (tx) => {
    await tx.placingSlip.update({
      where: { id },
      data: {
        ...dbDocumentDates(documentDates),
        clientId: resolvedClientId,
        sppaId: resolvedSppaId,
        cobId: resolvedCob.id,
        coverTypeId: resolvedCoverType?.id || null,
        typeOfCover: input.typeOfCover?.trim() || null,
        ...coverType2,
        typeOfCoverLabel: input.typeOfCoverLabel?.trim() || null,
        typeOfCover2Label: coverType2.typeOfCover2
          ? input.typeOfCover2Label?.trim() || null
          : null,
        insuredName: input.insuredName.trim(),
        correspondenceAddress: input.correspondenceAddress?.trim() || null,
        currencyCode,
        status: (input.status as SlipStatus) || existing.status,
        periodTba: input.periodTba ?? existing.periodTba,
        inceptionDate,
        expiryDate,
        periodNote: input.periodNote?.trim() || null,
        periodLabel: input.periodLabel?.trim() || null,
        periodEndText: input.periodEndText?.trim() || null,
        periodText: input.periodText?.trim() || null,
        usesSections: input.usesSections === true,
        openCover: input.openCover === undefined ? undefined : input.openCover === true,
        openCoverRates: openCoverRatesData(input.openCoverRates),
        insuredDescription: input.insuredDescription?.trim() || null,
        detailRows: detailRowsData(input.detailRows),
        paBenefitLimits: paBenefitLimitsData(input.paBenefitLimits),
        occupationId,
        occupationLabel: input.occupationLabel?.trim() || null,
        riskLocation: input.riskLocation?.trim() || null,
        coverage: input.coverage?.trim() || null,
        constructionClassId,
        ...slipLocationFields(locations),
        indemnityMonths,
        interestSection1: input.interestSection1?.trim() || null,
        interestSection2: input.interestSection2?.trim() || null,
        specialConditions: input.specialConditions?.trim() || null,
        deductibleIntro: input.deductibleIntro?.trim() || null,
        exclusions: input.exclusions?.trim() || null,
        discountPct: new Prisma.Decimal(input.discountPct ?? 0),
        adminCost: new Prisma.Decimal(input.adminCost ?? 0),
        stampDuty: new Prisma.Decimal(input.stampDuty ?? 0),
        brokeragePct: new Prisma.Decimal(input.brokeragePct ?? 0),
        includeVat: input.includeVat ?? false,
        additionalFeeIncludeVat: slipAdditionalFeeIncludeVat(resolvedCob.name, input.additionalFeeIncludeVat),
        subjectivity: input.subjectivity?.trim() || null,
        closingInstruction: input.closingInstruction?.trim() || null,
        coverNoteRemarks: input.coverNoteRemarks?.trim() || null,
        // Endorsement dan cancellation slip: tanggal efektif dan uraian perubahan.
        ...(existing.kind !== "Placing"
          ? {
              effectiveDate: input.effectiveDate ? dbDate(input.effectiveDate) : null,
              changeDescription: input.changeDescription?.trim() || null,
            }
          : {}),
      },
    })

    // Lokasi lama terhapus bersama baris sum insured dan rate-nya.
    await tx.slipLocation.deleteMany({ where: { slipId: id } })
    await insertSlipLocations(tx, id, locations)

    // Refresh items
    await tx.slipItem.deleteMany({ where: { slipId: id } })
    let sortIdx = 0
    const itemIds = new Map<string, string>()
    const itemsToCreate: {
      id?: string
      slipId: string
      kind: SlipItemKind
      description: string
      amount: Prisma.Decimal | null
      isLimitOnly?: boolean
      sectionNo?: number | null
      sortOrder: number
      vehicleBrandId?: string | null
      vehicleTypeId?: string | null
      locationId?: string | null
    }[] = []

    if (input.interestItems) {
      const motor = normalizeCob(resolvedCob.name as CobType) === "Motor Vehicle"
      for (const it of input.interestItems) {
        // Kendaraan dengan TSI tetap disimpan walau datanya belum lengkap,
        // karena rate-nya menempel ke kendaraan itu.
        const hasMotorData =
          motor &&
          Boolean(
            it.vehicleBrandId ||
            it.licensePlate ||
            it.chassisNumber ||
            it.vehicleModel ||
            (it.amount || 0) > 0
          )
        if (it.description?.trim() || hasMotorData) {
          const finalDesc = motor
            ? buildVehicleDescription(it) || it.description?.trim() || "Kendaraan Bermotor"
            : it.description.trim()
          const itemId = randomUUID()
          itemIds.set(it.id, itemId)
          itemsToCreate.push({
            id: itemId,
            slipId: id,
            kind: "Interest",
            description: finalDesc,
            amount: new Prisma.Decimal(it.amount || 0),
            isLimitOnly: it.limitOnly === true,
            sectionNo: it.section === 2 ? 2 : null,
            sortOrder: sortIdx++,
            ...(motor ? await checkVehiclePair(tx, it.vehicleBrandId, it.vehicleTypeId) : {}),
          })
        }
      }
    }

    if (input.sumInsuredSection1) {
      for (const it of input.sumInsuredSection1) {
        if (it.description.trim()) {
          itemsToCreate.push({
            slipId: id,
            kind: "SumInsuredSection1",
            description: it.description.trim(),
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
            locationId: savedLocationId(locations, it.locationId),
          })
        }
      }
    }

    if (input.sumInsuredSection2) {
      for (const it of input.sumInsuredSection2) {
        if (it.description.trim()) {
          itemsToCreate.push({
            slipId: id,
            kind: "SumInsuredSection2",
            description: it.description.trim(),
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: sortIdx++,
            locationId: savedLocationId(locations, it.locationId),
          })
        }
      }
    }

    if (itemsToCreate.length > 0) {
      await tx.slipItem.createMany({ data: itemsToCreate })
    }

    // Refresh rate lines
    await tx.slipRateLine.deleteMany({ where: { slipId: id } })
    let rateSortIdx = 0
    const rateKindId = cache.rateLineKinds.get("rate")!
    const tplKindId = cache.rateLineKinds.get("tpl")!
    const paKindId = cache.rateLineKinds.get("pa")!

    const rateLinesToCreate: {
      slipId: string
      kindId: string
      label: string
      limitAmount: Prisma.Decimal | null
      rate: Prisma.Decimal | null
      premium: Prisma.Decimal
      isFlatPremium?: boolean
      rateMin: Prisma.Decimal | null
      rateMax: Prisma.Decimal | null
      lossLimitPct: Prisma.Decimal | null
      deductibles: string[]
      outOfBoundsReason: string | null
      sortOrder: number
      locationId?: string | null
      vehicleItemId?: string | null
    }[] = []

    if (input.rateLines) {
      for (const rl of input.rateLines) {
        const vehicleItemId = itemRates
          ? savedItemId(itemIds, rl.vehicleId)
          : null
        if (vehicleItemId === undefined) continue
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: id,
          kindId: rateKindId,
          label: rl.label,
          limitAmount: null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          isFlatPremium: rl.flatPremium === true,
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          lossLimitPct:
            rl.lossLimitPct != null ? new Prisma.Decimal(rl.lossLimitPct) : null,
          deductibles: cleanDeductibles(rl.deductibles),
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
          locationId: savedLocationId(locations, rl.locationId),
          vehicleItemId,
        })
      }
    }

    if (input.tplLines) {
      for (const rl of input.tplLines) {
        const vehicleItemId = itemRates
          ? savedItemId(itemIds, rl.vehicleId)
          : null
        if (vehicleItemId === undefined) continue
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: id,
          kindId: tplKindId,
          label: rl.label,
          limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          lossLimitPct: null,
          deductibles: cleanDeductibles(rl.deductibles),
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
          vehicleItemId,
        })
      }
    }

    if (input.paLines) {
      for (const rl of input.paLines) {
        const vehicleItemId = itemRates
          ? savedItemId(itemIds, rl.vehicleId)
          : null
        if (vehicleItemId === undefined) continue
        const exception = input.rateExceptions?.[rl.id]
        const reason = exception ? `${exception.reason}: ${exception.note}` : null
        rateLinesToCreate.push({
          slipId: id,
          kindId: paKindId,
          label: rl.label,
          limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
          rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
          premium: new Prisma.Decimal(rl.premium || 0),
          rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
          rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
          lossLimitPct: null,
          deductibles: cleanDeductibles(rl.deductibles),
          outOfBoundsReason: reason,
          sortOrder: rateSortIdx++,
          vehicleItemId,
        })
      }
    }

    if (rateLinesToCreate.length > 0) {
      await tx.slipRateLine.createMany({ data: rateLinesToCreate })
    }

    // Refresh security panel
    await tx.slipSecurityPanel.deleteMany({ where: { slipId: id } })
    if (input.securityPanel && input.securityPanel.length > 0) {
      const leaderRoleId = cache.securityRoles.get("leader")!
      const memberRoleId = cache.securityRoles.get("member")!

      for (const sp of input.securityPanel) {
        if (!sp.insurer.trim()) continue

        let insurer = await tx.insurer.findFirst({
          where: { name: { equals: sp.insurer.trim(), mode: "insensitive" } },
          select: { id: true },
        })
        if (!insurer) {
          insurer = await tx.insurer.create({
            data: { name: sp.insurer.trim() },
            select: { id: true },
          })
        }

        const positionId = sp.role === "As Leader" ? leaderRoleId : memberRoleId
        await tx.slipSecurityPanel.create({
          data: {
            slipId: id,
            insurerId: insurer.id,
            sharePct: new Prisma.Decimal(sp.share || 0),
            positionId,
            additionalFeePct: panelFeePct(resolvedCob.name, sp.additionalFeePct),
          },
        })
      }
    }

    // Refresh clauses
    await tx.slipClause.deleteMany({ where: { slipId: id } })
    await insertSlipClauses(tx, id, resolvedCob.name, input)
    // Peserta hanya diganti bila dikirim; slip dari daftar tidak memuatnya.
    if (input.participants !== undefined) {
      await replaceParticipants(tx, id, input.participants)
    }

    // Refresh wording forms
    await tx.slipWordingForm.deleteMany({ where: { slipId: id } })
    if (input.wordingForms && input.wordingForms.length > 0) {
      for (const wf of input.wordingForms) {
        if (!wf.trim()) continue
        let form = await tx.wordingForm.findFirst({
          where: { name: { equals: wf.trim(), mode: "insensitive" } },
          select: { id: true },
        })
        if (!form) {
          form = await tx.wordingForm.create({
            data: { name: wf.trim() },
            select: { id: true },
          })
        }

        await tx.slipWordingForm.create({
          data: {
            slipId: id,
            wordingFormId: form.id,
          },
        })
      }
    }

    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: id,
      action: "Update",
      before: {
        insuredName: existing.insuredName,
        status: existing.status,
        ...previousDates,
        brokeragePct: Number(existing.brokeragePct),
        includeVat: existing.includeVat,
        additionalFeeIncludeVat: existing.additionalFeeIncludeVat,
      },
      after: {
        insuredName: input.insuredName,
        status: input.status || existing.status,
        releaseDate: documentDates.releaseDate ?? null,
        quotedDate: documentDates.quotedDate ?? null,
        closingDate: documentDates.closingDate ?? null,
        brokeragePct: input.brokeragePct ?? 0,
        includeVat: input.includeVat ?? false,
        additionalFeeIncludeVat: slipAdditionalFeeIncludeVat(resolvedCob.name, input.additionalFeeIncludeVat),
      },
    })
  })

  const full = await getPlacingSlipById(id)
  if (!full) throw new Error("Gagal mengambil data placing slip setelah perbaruan.")
  return full
}

/**
 * Release Placing Slip dan terbitkan nomor resmi dokumen (PRD A-16).
 */
export async function releasePlacingSlip(
  id: string,
  userId: string
): Promise<PlacingSlipRecord> {
  const existing = await prisma.placingSlip.findUnique({
    where: { id },
    include: {
      cob: true,
      coverType: true,
      coverType2: true,
      items: true,
      rateLines: true,
      client: true,
    },
  })

  if (!existing) {
    throw new Error("Placing slip tidak ditemukan.")
  }

  if (existing.status === "Released") {
    const full = await getPlacingSlipById(id)
    return full!
  }

  if (existing.status === "Cancelled" || existing.status === "Closed") {
    throw new Error(`Placing Slip berstatus ${existing.status} tidak dapat di-release.`)
  }

  await prisma.$transaction(async (tx) => {
    // Generate nomor slip dokumen jika belum ada
    let slipNo = existing.slipNo
    if (!slipNo) {
      const coverCode = joinCoverCodes(
        existing.coverType?.abbreviation ||
          coverCodeFor(
            normalizeCob(existing.cob.name as CobType),
            existing.typeOfCover || existing.coverType?.name || ""
          ),
        existing.coverType2?.abbreviation
      )
      slipNo = await nextDocumentNumber(tx, { code: "PS", coverCode })
      // Endorsement dan cancellation slip memakai urutan yang sama dengan
      // placing slip supaya semua slip tercatat dalam satu urutan (Harry,
      // 11 November 2026): 008/LCH-PLCMT/ES-MV/XI/2026.
      if (existing.kind !== "Placing") {
        slipNo = derivedDocNumber(slipNo, existing.kind === "Endorsement" ? "ES" : "CS") ?? slipNo
      }
    }

    // Tanggal Placing Slip: tanggal release, kecuali sudah diisi manual.
    const releaseDate = dateOnly(existing.releaseDate) ?? todayIso()

    await tx.placingSlip.update({
      where: { id },
      data: {
        slipNo,
        status: "Released",
        releasedAt: new Date(),
        releasedBy: userId,
        releaseDate: dbDate(releaseDate),
      },
    })

    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: id,
      action: "Release",
      before: {
        status: existing.status,
        slipNo: existing.slipNo,
        releaseDate: dateOnly(existing.releaseDate),
      },
      after: { status: "Released", slipNo, releaseDate },
    })
  })

  const full = await getPlacingSlipById(id)
  if (!full) throw new Error("Gagal mengambil data placing slip setelah rilis.")
  return full
}

/**
 * Mengubah status Placing Slip (misal: "Draft", "Quoted", "Closed", "Cancelled").
 */
export async function togglePlacingSlipStatus(
  id: string,
  status: SlipStatus,
  userId: string
): Promise<PlacingSlipRecord> {
  const existing = await prisma.placingSlip.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      slipNo: true,
      releaseDate: true,
      quotedDate: true,
      closingDate: true,
    },
  })

  if (!existing) {
    throw new Error("Placing slip tidak ditemukan.")
  }

  if (status === "Released") {
    return releasePlacingSlip(id, userId)
  }

  const filled = documentDatesForStatus(
    {
      releaseDate: dateOnly(existing.releaseDate),
      quotedDate: dateOnly(existing.quotedDate),
      closingDate: dateOnly(existing.closingDate),
    },
    existing.status,
    status,
    todayIso()
  )

  await prisma.$transaction(async (tx) => {
    await tx.placingSlip.update({
      where: { id },
      data: { status, ...dbDocumentDates(filled) },
    })

    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: id,
      // Pembatalan punya aksi sendiri di audit trail (Batal), bukan Ubah.
      action: status === "Cancelled" ? "Cancel" : "Update",
      before: { status: existing.status },
      after: { status, ...filled },
    })
  })

  const full = await getPlacingSlipById(id)
  if (!full) throw new Error("Gagal mengambil data placing slip.")
  return full
}

/**
 * Menghapus Placing Slip secara permanen jika masih berstatus Draft dan tidak memiliki polis.
 */
export async function deletePlacingSlip(id: string, userId: string): Promise<void> {
  const existing = await prisma.placingSlip.findUnique({
    where: { id },
    select: {
      id: true,
      slipNo: true,
      status: true,
      insuredName: true,
      _count: {
        select: { policies: true },
      },
    },
  })

  if (!existing) {
    throw new Error("Placing slip tidak ditemukan.")
  }

  if (existing._count.policies > 0) {
    throw new Error(
      `Placing Slip ini sudah memiliki ${existing._count.policies} polis terhubung dan tidak dapat dihapus.`
    )
  }

  if (existing.status !== "Draft") {
    throw new Error(
      `Hanya Placing Slip berstatus "Draft" yang dapat dihapus fisik. Slip berstatus "${existing.status}" hanya dapat dibatalkan (Cancelled).`
    )
  }

  await prisma.$transaction(async (tx) => {
    // Baris lampiran ikut terhapus lewat foreign key; isi berkasnya dihapus di sini.
    const files = await tx.slipFile.findMany({ where: { slipId: id }, select: { filePath: true } })
    await deleteStoredFiles(tx, files.map((f) => f.filePath))
    await tx.slipItem.deleteMany({ where: { slipId: id } })
    await tx.slipRateLine.deleteMany({ where: { slipId: id } })
    await tx.slipSecurityPanel.deleteMany({ where: { slipId: id } })
    await tx.slipClause.deleteMany({ where: { slipId: id } })
    await tx.slipWordingForm.deleteMany({ where: { slipId: id } })
    await tx.placingSlip.delete({ where: { id } })

    await recordAudit(tx, {
      userId,
      entity: "placing_slips",
      entityId: id,
      action: "Delete",
      before: {
        id: existing.id,
        slipNo: existing.slipNo,
        insuredName: existing.insuredName,
        status: existing.status,
      },
    })
  })
}

/** Kode cover di nomor slip, misalnya PAREQ dari 002/LCH-PLCMT/PS-PAREQ/VIII/2026. */
function coverCodeOfSlipNo(slipNo: string) {
  return slipNo.split("/")[2]?.replace(/^PS-?/, "") || null
}

/**
 * Pembenihan data awal 3 Placing Slip mock LCH jika tabel placing_slips masih kosong.
 */
export async function seedInitialSlipsIfEmpty(): Promise<number> {
  if (!shouldSeedMockData()) return 0
  if (hasCheckedSeed) return 0

  const count = await prisma.placingSlip.count()
  if (count > 0) {
    hasCheckedSeed = true
    return 0
  }

  const admin = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true },
  })
  if (!admin) return 0

  let seededCount = 0

  for (const mock of MOCK_SLIPS) {
    try {
      const cache = await getLookupsCache()
      const resolvedClientId = await resolveClientId(mock.clientId || "", mock.insuredName)
      const resolvedCob = await resolveCob(mock.cob)
      const resolvedCoverType = await resolveCoverType(resolvedCob.id, mock.typeOfCover)

      let occupationId: string | null = null
      if (mock.occupation) {
        const code = mock.occupation.trim().split(/[^0-9A-Za-z]/)[0].toLowerCase()
        const foundOcc = cache.occupationsByCode.get(code)
        if (foundOcc) occupationId = foundOcc.id
      }

      let constructionClassId: string | null = null
      if (mock.constructionClass) {
        constructionClassId = cache.constructionClasses.get(mock.constructionClass) || null
      }

      const indemnityMonths = parseIndemnityMonths(mock.indemnityPeriod)
      const inceptionDate = mock.inceptionDate ? new Date(mock.inceptionDate) : null
      const expiryDate = mock.expiryDate ? new Date(mock.expiryDate) : null

      await prisma.$transaction(async (tx) => {
        // Nomor contoh diambil dari counter bulan berjalan seperti slip yang
        // di-release, bukan nomor tulisan tangan di data contoh, supaya tidak
        // terlihat kembar dengan nomor bulan lain (Agus, 9 November 2026).
        const slipNo = mock.slipNo
          ? await nextDocumentNumber(tx, {
              code: "PS",
              coverCode: coverCodeOfSlipNo(mock.slipNo),
            })
          : null
        const slip = await tx.placingSlip.create({
          data: {
            slipNo,
            clientId: resolvedClientId,
            cobId: resolvedCob.id,
            coverTypeId: resolvedCoverType?.id || null,
            typeOfCover: mock.typeOfCover?.trim() || null,
            insuredName: mock.insuredName,
            correspondenceAddress: mock.correspondenceAddress || null,
            currencyCode: mock.currency || "IDR",
            status: (mock.status as SlipStatus) || "Draft",
            periodTba: mock.periodTba ?? false,
            inceptionDate,
            expiryDate,
            occupationId,
            riskLocation: mock.riskLocation || null,
            coverage: mock.coverage || null,
            constructionClassId,
            indemnityMonths,
            interestSection1: mock.interestSection1 || null,
            interestSection2: mock.interestSection2 || null,
            specialConditions: mock.specialConditions || null,
            deductibleIntro: mock.deductibleIntro || null,
            discountPct: new Prisma.Decimal(mock.discountPct || 0),
            adminCost: new Prisma.Decimal(mock.adminCost || 0),
            stampDuty: new Prisma.Decimal(mock.stampDuty || 0),
            brokeragePct: new Prisma.Decimal(mock.brokeragePct || 0),
            includeVat: mock.includeVat ?? false,
            subjectivity: mock.subjectivity || null,
            closingInstruction: mock.closingInstruction || null,
            coverNoteRemarks: mock.coverNoteRemarks || null,
            releasedAt: mock.status === "Released" ? new Date() : null,
            releasedBy: mock.status === "Released" ? admin.id : null,
            createdBy: admin.id,
          },
        })

        // Items
        let itIdx = 0
        const itemsData: {
          slipId: string
          kind: SlipItemKind
          description: string
          amount: Prisma.Decimal | null
          isLimitOnly?: boolean
          sectionNo?: number | null
          sortOrder: number
        }[] = []

        for (const it of mock.interestItems || []) {
          itemsData.push({
            slipId: slip.id,
            kind: "Interest",
            description: it.description,
            amount: new Prisma.Decimal(it.amount || 0),
            isLimitOnly: it.limitOnly === true,
            sectionNo: it.section === 2 ? 2 : null,
            sortOrder: itIdx++,
          })
        }
        for (const it of mock.sumInsuredSection1 || []) {
          itemsData.push({
            slipId: slip.id,
            kind: "SumInsuredSection1",
            description: it.description,
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: itIdx++,
          })
        }
        for (const it of mock.sumInsuredSection2 || []) {
          itemsData.push({
            slipId: slip.id,
            kind: "SumInsuredSection2",
            description: it.description,
            amount: new Prisma.Decimal(it.amount || 0),
            sortOrder: itIdx++,
          })
        }
        if (itemsData.length > 0) {
          await tx.slipItem.createMany({ data: itemsData })
        }

        // Rate Lines
        let rIdx = 0
        const rateKindId = cache.rateLineKinds.get("rate")!
        const tplKindId = cache.rateLineKinds.get("tpl")!
        const paKindId = cache.rateLineKinds.get("pa")!

        const rateData: {
          slipId: string
          kindId: string
          label: string
          limitAmount: Prisma.Decimal | null
          rate: Prisma.Decimal | null
          premium: Prisma.Decimal
          isFlatPremium?: boolean
          rateMin: Prisma.Decimal | null
          rateMax: Prisma.Decimal | null
          deductibles: string[]
          outOfBoundsReason: string | null
          sortOrder: number
        }[] = []

        for (const rl of mock.rateLines || []) {
          rateData.push({
            slipId: slip.id,
            kindId: rateKindId,
            label: rl.label,
            limitAmount: null,
            rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
            premium: new Prisma.Decimal(rl.premium || 0),
            isFlatPremium: rl.flatPremium === true,
            rateMin: rl.min != null ? new Prisma.Decimal(rl.min) : null,
            rateMax: rl.max != null ? new Prisma.Decimal(rl.max) : null,
            deductibles: cleanDeductibles(rl.deductibles),
            outOfBoundsReason: null,
            sortOrder: rIdx++,
          })
        }
        for (const rl of mock.tplLines || []) {
          rateData.push({
            slipId: slip.id,
            kindId: tplKindId,
            label: rl.label,
            limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
            rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
            premium: new Prisma.Decimal(rl.premium || 0),
            rateMin: null,
            rateMax: null,
            deductibles: cleanDeductibles(rl.deductibles),
            outOfBoundsReason: null,
            sortOrder: rIdx++,
          })
        }
        for (const rl of mock.paLines || []) {
          rateData.push({
            slipId: slip.id,
            kindId: paKindId,
            label: rl.label,
            limitAmount: rl.basis ? new Prisma.Decimal(rl.basis) : null,
            rate: rl.rate != null ? new Prisma.Decimal(rl.rate) : null,
            premium: new Prisma.Decimal(rl.premium || 0),
            rateMin: null,
            rateMax: null,
            deductibles: cleanDeductibles(rl.deductibles),
            outOfBoundsReason: null,
            sortOrder: rIdx++,
          })
        }
        if (rateData.length > 0) {
          await tx.slipRateLine.createMany({ data: rateData })
        }

        // Security Panel
        if (mock.securityPanel) {
          const leaderRoleId = cache.securityRoles.get("leader")!
          const memberRoleId = cache.securityRoles.get("member")!
          for (const sp of mock.securityPanel) {
            let insurer = await tx.insurer.findFirst({
              where: { name: { equals: sp.insurer.trim(), mode: "insensitive" } },
              select: { id: true },
            })
            if (!insurer) {
              insurer = await tx.insurer.create({
                data: { name: sp.insurer.trim() },
                select: { id: true },
              })
            }
            const positionId = sp.role === "As Leader" ? leaderRoleId : memberRoleId
            await tx.slipSecurityPanel.create({
              data: {
                slipId: slip.id,
                insurerId: insurer.id,
                sharePct: new Prisma.Decimal(sp.share || 0),
                positionId,
              },
            })
          }
        }

        // Clauses (match first 5 clauses if mock clause ID is abstract)
        const clausesToLink = await tx.clause.findMany({ take: 8, select: { id: true, title: true, wordingHtml: true } })
        let clOrder = 0
        for (const cl of clausesToLink) {
          await tx.slipClause.create({
            data: {
              slipId: slip.id,
              clauseId: cl.id,
              title: cl.title,
              wordingHtml: cl.wordingHtml,
              isEdited: false,
              sortOrder: clOrder++,
            },
          })
        }

        // Wording Forms
        for (const wf of mock.wordingForms || []) {
          let form = await tx.wordingForm.findFirst({
            where: { name: { equals: wf.trim(), mode: "insensitive" } },
            select: { id: true },
          })
          if (!form) {
            form = await tx.wordingForm.create({
              data: { name: wf.trim() },
              select: { id: true },
            })
          }
          await tx.slipWordingForm.create({
            data: {
              slipId: slip.id,
              wordingFormId: form.id,
            },
          })
        }
      })
      seededCount++
    } catch (err) {
      console.error(`Gagal membenihkan mock slip ${mock.id}:`, err)
    }
  }

  hasCheckedSeed = true
  return seededCount
}
