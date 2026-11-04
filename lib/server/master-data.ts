import "server-only"

import { createHash } from "node:crypto"

import type {
  Adjuster,
  BankAccount,
  BiScale,
  ClassOfBusiness,
  CoverType,
  Currency,
  Insurer,
  LookupValue,
  Occupation,
  Prisma,
  TariffEqProperty,
  TariffFlood,
  TariffOccupation,
  WordingForm,
} from "@/lib/generated/prisma/client"

import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/server/services/audit"

// Interfaces & types

export interface MasterCobRecord extends ClassOfBusiness {
  rateMode: LookupValue
  formVariant: LookupValue
  coverTypes: CoverType[]
  _count: {
    sppa: number
    placingSlips: number
    policies: number
    clients: number
  }
}

export interface CobInput {
  code: string
  name: string
  rateModeId: string
  formVariantId: string
  isActive?: boolean
}

export interface CoverTypeInput {
  cobId: string
  code: string
  name: string
  /** Token {COVER} di nomor slip, contoh PAR. Kosong berarti tanpa segmen cover. */
  abbreviation?: string | null
  isActive?: boolean
}

export interface CurrencyInput {
  code: string
  name: string
}

export interface InsurerInput {
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  isActive?: boolean
}

export interface AdjusterInput {
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  isActive?: boolean
}

export interface BankAccountRecord extends BankAccount {
  bank: LookupValue
  currency: Currency
}

export interface BankAccountInput {
  bankId: string
  accountNo: string
  accountName: string
  currencyCode: string
  isPremiumTrust?: boolean
  coaAccountId?: string | null
  isActive?: boolean
}

export interface LookupValueInput {
  lookupType: string
  code: string
  name: string
  sortOrder?: number
  isSystem?: boolean
  isActive?: boolean
}

/*
 * Prisma mengembalikan kolom Decimal sebagai objek Decimal.js, dan React
 * menolak objek berkelas di batas server-ke-client: sekali buka Master Data
 * memunculkan sekitar 1.800 peringatan "Only plain objects can be passed to
 * Client Components", cukup untuk menenggelamkan error yang sesungguhnya.
 *
 * Nilainya sendiri tetap sampai — Decimal.js punya toJSON() sehingga React
 * mengirimnya sebagai string — tapi tipe di sisi client tetap berbunyi
 * Decimal. Artinya `rateMin.toNumber()` lolos pemeriksaan TypeScript lalu
 * gagal saat dijalankan, karena yang diterima string. Tarif dikonversi di
 * sini supaya tipe dan isinya sama-sama jujur: number.
 */
export type TariffOccupationRow = Omit<
  TariffOccupation,
  "rateMin" | "rateMax"
> & {
  rateMin: number
  rateMax: number
}

export type TariffEqPropertyRow = Omit<TariffEqProperty, "rate"> & {
  rate: number
}

export type TariffFloodRow = Omit<TariffFlood, "rateMin" | "rateMax"> & {
  rateMin: number | null
  rateMax: number | null
}

export type BiScaleRow = Omit<BiScale, "percentage"> & {
  percentage: number
}

export interface LossLimitScaleRow {
  valuesPct: number
  premiumPct: number
}

export interface OccupationRecord extends Occupation {
  tariffs: TariffOccupationRow[]
}

// Query functions

export async function listMasterCob(): Promise<MasterCobRecord[]> {
  const cobs = await prisma.classOfBusiness.findMany({
    orderBy: { code: "asc" },
    include: {
      rateMode: true,
      formVariant: true,
      coverTypes: {
        orderBy: { code: "asc" },
      },
      _count: {
        select: {
          sppa: true,
          placingSlips: true,
          policies: true,
          clients: true,
        },
      },
    },
  })
  return cobs as unknown as MasterCobRecord[]
}

export async function listInsurers(): Promise<Insurer[]> {
  return prisma.insurer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          slipSecurityPanel: true,
          policyInsurers: true,
          creditNotes: true,
        },
      },
    },
  })
}

export async function listAdjusters(): Promise<Adjuster[]> {
  return prisma.adjuster.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          claims: true,
        },
      },
    },
  })
}

export async function listBankAccounts(): Promise<BankAccountRecord[]> {
  const accounts = await prisma.bankAccount.findMany({
    orderBy: { accountNo: "asc" },
    include: {
      bank: true,
      currency: true,
    },
  })
  return accounts as BankAccountRecord[]
}

export async function listCurrencies(): Promise<Currency[]> {
  return prisma.currency.findMany({
    orderBy: { code: "asc" },
  })
}

export async function listWordingForms(): Promise<WordingForm[]> {
  return prisma.wordingForm.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          slipWordingForms: true,
        },
      },
    },
  })
}

export async function listLookupValues(type?: string): Promise<LookupValue[]> {
  return prisma.lookupValue.findMany({
    where: type ? { lookupType: type } : undefined,
    orderBy: [{ lookupType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  })
}

export async function listDistinctLookupTypes(): Promise<string[]> {
  const types = await prisma.lookupValue.findMany({
    select: { lookupType: true },
    distinct: ["lookupType"],
    orderBy: { lookupType: "asc" },
  })
  return types.map((t) => t.lookupType)
}

export async function listOccupations(params?: {
  search?: string
  limit?: number
}): Promise<OccupationRecord[]> {
  const q = params?.search?.trim()
  const rows = await prisma.occupation.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    // Tanpa limit, semua okupasi dimuat; halaman master data menyaring di klien.
    take: params?.limit,
    orderBy: { code: "asc" },
    include: {
      tariffs: {
        orderBy: { constructionClass: "asc" },
      },
    },
  })
  return rows.map((o) => ({
    ...o,
    tariffs: o.tariffs.map((t) => ({
      ...t,
      rateMin: t.rateMin.toNumber(),
      rateMax: t.rateMax.toNumber(),
    })),
  }))
}

export async function listTariffEqProperty(): Promise<TariffEqPropertyRow[]> {
  const rows = await prisma.tariffEqProperty.findMany({
    orderBy: [{ constructionCategory: "asc" }, { zone: "asc" }],
  })
  return rows.map((r) => ({ ...r, rate: r.rate.toNumber() }))
}

export async function listTariffFlood(): Promise<TariffFloodRow[]> {
  const rows = await prisma.tariffFlood.findMany({
    orderBy: [{ line: "asc" }, { region: "asc" }, { zone: "asc" }],
  })
  return rows.map((r) => ({
    ...r,
    rateMin: r.rateMin?.toNumber() ?? null,
    rateMax: r.rateMax?.toNumber() ?? null,
  }))
}

export async function listBiScales(): Promise<BiScaleRow[]> {
  const rows = await prisma.biScale.findMany({
    orderBy: { indemnityMonths: "asc" },
  })
  return rows.map((r) => ({ ...r, percentage: r.percentage.toNumber() }))
}

/** Skala premi loss limit OJK, urut dari 100% nilai penuh ke bawah. */
export async function listLossLimitScales(): Promise<LossLimitScaleRow[]> {
  const rows = await prisma.lossLimitScale.findMany({
    orderBy: { valuesPct: "desc" },
  })
  return rows.map((r) => ({
    valuesPct: r.valuesPct.toNumber(),
    premiumPct: r.premiumPct.toNumber(),
  }))
}

// Mutation functions (COB & cover type)

// createCob, updateCob, dan deleteCob tidak lagi dipanggil dari aplikasi
// (lihat app/(app)/master-data/actions.ts). Yang memakainya skrip developer.

export async function createCob(
  input: CobInput,
  userId: string
): Promise<ClassOfBusiness> {
  const created = await prisma.$transaction(async (tx) => {
    const res = await tx.classOfBusiness.create({
      data: {
        code: input.code.trim(),
        name: input.name.trim(),
        rateModeId: input.rateModeId,
        formVariantId: input.formVariantId,
        isActive: input.isActive ?? true,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "classes_of_business",
      entityId: res.id,
      action: "Create",
      after: res,
    })
    return res
  })
  return created
}

export async function updateCob(
  id: string,
  input: CobInput,
  userId: string
): Promise<ClassOfBusiness> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.classOfBusiness.findUniqueOrThrow({ where: { id } })
    const updated = await tx.classOfBusiness.update({
      where: { id },
      data: {
        code: input.code.trim(),
        name: input.name.trim(),
        rateModeId: input.rateModeId,
        formVariantId: input.formVariantId,
        isActive: input.isActive ?? before.isActive,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "classes_of_business",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return updated
  })
}

export async function toggleCobStatus(
  id: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.classOfBusiness.findUniqueOrThrow({ where: { id } })
    const updated = await tx.classOfBusiness.update({
      where: { id },
      data: { isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "classes_of_business",
      entityId: id,
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    })
  })
}

export async function deleteCob(id: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const cob = await tx.classOfBusiness.findUniqueOrThrow({
      where: { id },
      include: {
        _count: {
          select: {
            coverTypes: true,
            sppa: true,
            placingSlips: true,
            policies: true,
            clients: true,
          },
        },
      },
    })

    const count = cob._count
    if (
      count.coverTypes > 0 ||
      count.sppa > 0 ||
      count.placingSlips > 0 ||
      count.policies > 0 ||
      count.clients > 0
    ) {
      throw new Error(
        `COB "${cob.name}" tidak dapat dihapus karena sudah dipakai oleh data transaksi. Silakan gunakan opsi nonaktifkan.`
      )
    }

    await tx.classOfBusiness.delete({ where: { id } })
    await recordAudit(tx, {
      userId,
      entity: "classes_of_business",
      entityId: id,
      action: "Delete",
      before: cob,
    })
  })
}

export async function createCoverType(
  input: CoverTypeInput,
  userId: string
): Promise<CoverType> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.coverType.create({
      data: {
        cobId: input.cobId,
        code: input.code.trim(),
        name: input.name.trim(),
        abbreviation: input.abbreviation?.trim() || null,
        isActive: input.isActive ?? true,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "cover_types",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function updateCoverType(
  id: string,
  input: CoverTypeInput,
  userId: string
): Promise<CoverType> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.coverType.findUniqueOrThrow({ where: { id } })
    const updated = await tx.coverType.update({
      where: { id },
      data: {
        cobId: input.cobId,
        code: input.code.trim(),
        name: input.name.trim(),
        abbreviation: input.abbreviation?.trim() || null,
        isActive: input.isActive ?? before.isActive,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "cover_types",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return updated
  })
}

export async function toggleCoverTypeStatus(
  id: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.coverType.findUniqueOrThrow({ where: { id } })
    const updated = await tx.coverType.update({
      where: { id },
      data: { isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "cover_types",
      entityId: id,
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    })
  })
}

export async function deleteCoverType(id: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const ct = await tx.coverType.findUniqueOrThrow({
      where: { id },
      include: {
        _count: {
          select: {
            sppa: true,
            placingSlips: true,
            policies: true,
            clauses: true,
          },
        },
      },
    })

    const count = ct._count
    if (
      count.sppa > 0 ||
      count.placingSlips > 0 ||
      count.policies > 0 ||
      count.clauses > 0
    ) {
      throw new Error(
        `Type of Cover "${ct.name}" tidak dapat dihapus karena sudah dipakai transaksi. Silakan nonaktifkan.`
      )
    }

    await tx.coverType.delete({ where: { id } })
    await recordAudit(tx, {
      userId,
      entity: "cover_types",
      entityId: id,
      action: "Delete",
      before: ct,
    })
  })
}

// Mutation functions (insurers & adjusters)

export async function createInsurer(
  input: InsurerInput,
  userId: string
): Promise<Insurer> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.insurer.create({
      data: {
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        isActive: input.isActive ?? true,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "insurers",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function updateInsurer(
  id: string,
  input: InsurerInput,
  userId: string
): Promise<Insurer> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.insurer.findUniqueOrThrow({ where: { id } })
    const updated = await tx.insurer.update({
      where: { id },
      data: {
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        isActive: input.isActive ?? before.isActive,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "insurers",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return updated
  })
}

export async function toggleInsurerStatus(
  id: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.insurer.findUniqueOrThrow({ where: { id } })
    const updated = await tx.insurer.update({
      where: { id },
      data: { isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "insurers",
      entityId: id,
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    })
  })
}

export async function createAdjuster(
  input: AdjusterInput,
  userId: string
): Promise<Adjuster> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.adjuster.create({
      data: {
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        isActive: input.isActive ?? true,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "adjusters",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function updateAdjuster(
  id: string,
  input: AdjusterInput,
  userId: string
): Promise<Adjuster> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.adjuster.findUniqueOrThrow({ where: { id } })
    const updated = await tx.adjuster.update({
      where: { id },
      data: {
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        isActive: input.isActive ?? before.isActive,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "adjusters",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return updated
  })
}

export async function toggleAdjusterStatus(
  id: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.adjuster.findUniqueOrThrow({ where: { id } })
    const updated = await tx.adjuster.update({
      where: { id },
      data: { isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "adjusters",
      entityId: id,
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    })
  })
}

// Mutation functions (bank accounts, currencies, wording forms)

export async function createBankAccount(
  input: BankAccountInput,
  userId: string
): Promise<BankAccount> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.bankAccount.create({
      data: {
        bankId: input.bankId,
        accountNo: input.accountNo.trim(),
        accountName: input.accountName.trim(),
        currencyCode: input.currencyCode.trim(),
        isPremiumTrust: input.isPremiumTrust ?? false,
        coaAccountId: input.coaAccountId || null,
        isActive: input.isActive ?? true,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "bank_accounts",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function updateBankAccount(
  id: string,
  input: BankAccountInput,
  userId: string
): Promise<BankAccount> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.bankAccount.findUniqueOrThrow({ where: { id } })
    const updated = await tx.bankAccount.update({
      where: { id },
      data: {
        bankId: input.bankId,
        accountNo: input.accountNo.trim(),
        accountName: input.accountName.trim(),
        currencyCode: input.currencyCode.trim(),
        isPremiumTrust: input.isPremiumTrust ?? before.isPremiumTrust,
        coaAccountId: input.coaAccountId || null,
        isActive: input.isActive ?? before.isActive,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "bank_accounts",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return updated
  })
}

export async function toggleBankAccountStatus(
  id: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.bankAccount.findUniqueOrThrow({ where: { id } })
    const updated = await tx.bankAccount.update({
      where: { id },
      data: { isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "bank_accounts",
      entityId: id,
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    })
  })
}

/**
 * audit_logs.entity_id bertipe UUID, sedangkan kunci mata uang adalah kode ISO.
 * Kode diubah jadi UUID tetap (gaya UUIDv5) supaya semua jejak satu mata uang
 * terkumpul di id yang sama.
 */
function currencyAuditId(code: string) {
  const h = createHash("sha1").update(`currencies:${code}`).digest("hex")
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`
}

/**
 * Mata uang baru. Kodenya ISO 4217 (tiga huruf) dan menjadi kunci, jadi tidak
 * bisa diubah; mata uang yang tidak dipakai cukup dinonaktifkan.
 */
export async function createCurrency(
  input: CurrencyInput,
  userId: string
): Promise<Currency> {
  return prisma.$transaction(async (tx) => {
    const code = input.code.trim().toUpperCase()
    const existing = await tx.currency.findUnique({ where: { code } })
    if (existing) {
      throw new Error(`Mata uang ${code} sudah ada di master data.`)
    }
    const created = await tx.currency.create({
      data: { code, name: input.name.trim(), isActive: true },
    })
    await recordAudit(tx, {
      userId,
      entity: "currencies",
      entityId: currencyAuditId(created.code),
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function toggleCurrencyStatus(
  code: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.currency.findUniqueOrThrow({ where: { code } })
    const updated = await tx.currency.update({
      where: { code },
      data: { isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "currencies",
      entityId: currencyAuditId(code),
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    })
  })
}

export async function createWordingForm(
  name: string,
  userId: string
): Promise<WordingForm> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.wordingForm.create({
      data: {
        name: name.trim(),
        isActive: true,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "wording_forms",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function toggleWordingFormStatus(
  id: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.wordingForm.findUniqueOrThrow({ where: { id } })
    const updated = await tx.wordingForm.update({
      where: { id },
      data: { isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "wording_forms",
      entityId: id,
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    })
  })
}

// Mutation functions (lookup values)

export async function createLookupValue(
  input: LookupValueInput,
  userId: string
): Promise<LookupValue> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.lookupValue.create({
      data: {
        lookupType: input.lookupType.trim(),
        code: input.code.trim(),
        name: input.name.trim(),
        sortOrder: input.sortOrder ?? 0,
        isSystem: input.isSystem ?? false,
        isActive: input.isActive ?? true,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "lookup_values",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return created
  })
}

export async function updateLookupValue(
  id: string,
  input: LookupValueInput,
  userId: string
): Promise<LookupValue> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.lookupValue.findUniqueOrThrow({ where: { id } })
    const updated = await tx.lookupValue.update({
      where: { id },
      data: {
        // Jika isSystem: code tidak boleh berubah
        code: before.isSystem ? before.code : input.code.trim(),
        name: input.name.trim(),
        sortOrder: input.sortOrder ?? before.sortOrder,
        isActive: input.isActive ?? before.isActive,
      },
    })
    await recordAudit(tx, {
      userId,
      entity: "lookup_values",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return updated
  })
}

export async function toggleLookupValueStatus(
  id: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.lookupValue.findUniqueOrThrow({ where: { id } })
    const updated = await tx.lookupValue.update({
      where: { id },
      data: { isActive },
    })
    await recordAudit(tx, {
      userId,
      entity: "lookup_values",
      entityId: id,
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive: updated.isActive },
    })
  })
}

export async function deleteLookupValue(
  id: string,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const lookup = await tx.lookupValue.findUniqueOrThrow({ where: { id } })
    if (lookup.isSystem) {
      throw new Error(
        `Nilai pilihan sistem "${lookup.name}" dilindungi dan tidak dapat dihapus. Anda hanya dapat menonaktifkannya.`
      )
    }

    await tx.lookupValue.delete({ where: { id } })
    await recordAudit(tx, {
      userId,
      entity: "lookup_values",
      entityId: id,
      action: "Delete",
      before: lookup,
    })
  })
}

// Pilihan deductible

export interface DeductibleOptionRecord {
  id: string
  cobId: string
  cobCode: string
  cobName: string
  /** Kosong berarti berlaku untuk semua type of cover dalam COB itu. */
  coverTypeId: string | null
  coverTypeCode: string | null
  coverTypeName: string | null
  text: string
  isActive: boolean
}

export interface DeductibleOptionInput {
  cobId: string
  coverTypeId: string | null
  text: string
}

const deductibleOptionInclude = {
  cob: { select: { code: true, name: true } },
  coverType: { select: { code: true, name: true } },
} as const

function toDeductibleOptionRecord(row: {
  id: string
  cobId: string
  coverTypeId: string | null
  text: string
  isActive: boolean
  cob: { code: string; name: string }
  coverType: { code: string; name: string } | null
}): DeductibleOptionRecord {
  return {
    id: row.id,
    cobId: row.cobId,
    cobCode: row.cob.code,
    cobName: row.cob.name,
    coverTypeId: row.coverTypeId,
    coverTypeCode: row.coverType?.code ?? null,
    coverTypeName: row.coverType?.name ?? null,
    text: row.text,
    isActive: row.isActive,
  }
}

export async function listDeductibleOptions(): Promise<DeductibleOptionRecord[]> {
  const rows = await prisma.deductibleOption.findMany({
    orderBy: [{ cob: { code: "asc" } }, { coverType: { code: "asc" } }, { text: "asc" }],
    include: deductibleOptionInclude,
  })
  return rows.map(toDeductibleOptionRecord)
}

/** Type of cover yang dipilih harus milik COB yang dipilih. */
async function assertCoverTypeInCob(
  tx: Prisma.TransactionClient,
  input: DeductibleOptionInput
) {
  if (!input.coverTypeId) return
  const cover = await tx.coverType.findUnique({
    where: { id: input.coverTypeId },
    select: { cobId: true },
  })
  if (!cover || cover.cobId !== input.cobId) {
    throw new Error("Type of cover tidak termasuk COB yang dipilih.")
  }
}

export async function createDeductibleOption(
  input: DeductibleOptionInput,
  userId: string
): Promise<DeductibleOptionRecord> {
  return prisma.$transaction(async (tx) => {
    await assertCoverTypeInCob(tx, input)
    const created = await tx.deductibleOption.create({
      data: {
        cobId: input.cobId,
        coverTypeId: input.coverTypeId,
        text: input.text.trim(),
      },
      include: deductibleOptionInclude,
    })
    await recordAudit(tx, {
      userId,
      entity: "deductible_options",
      entityId: created.id,
      action: "Create",
      after: created,
    })
    return toDeductibleOptionRecord(created)
  })
}

export async function updateDeductibleOption(
  id: string,
  input: DeductibleOptionInput,
  userId: string
): Promise<DeductibleOptionRecord> {
  return prisma.$transaction(async (tx) => {
    await assertCoverTypeInCob(tx, input)
    const before = await tx.deductibleOption.findUniqueOrThrow({ where: { id } })
    const updated = await tx.deductibleOption.update({
      where: { id },
      data: {
        cobId: input.cobId,
        coverTypeId: input.coverTypeId,
        text: input.text.trim(),
      },
      include: deductibleOptionInclude,
    })
    await recordAudit(tx, {
      userId,
      entity: "deductible_options",
      entityId: id,
      action: "Update",
      before,
      after: updated,
    })
    return toDeductibleOptionRecord(updated)
  })
}

export async function toggleDeductibleOptionStatus(
  id: string,
  isActive: boolean,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.deductibleOption.findUniqueOrThrow({ where: { id } })
    await tx.deductibleOption.update({ where: { id }, data: { isActive } })
    await recordAudit(tx, {
      userId,
      entity: "deductible_options",
      entityId: id,
      action: "Update",
      before: { isActive: before.isActive },
      after: { isActive },
    })
  })
}

/**
 * Pilihan deductible boleh dihapus kapan saja: slip menyimpan salinan teksnya,
 * bukan relasi ke pilihan ini.
 */
export async function deleteDeductibleOption(
  id: string,
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.deductibleOption.findUniqueOrThrow({ where: { id } })
    await tx.deductibleOption.delete({ where: { id } })
    await recordAudit(tx, {
      userId,
      entity: "deductible_options",
      entityId: id,
      action: "Delete",
      before,
    })
  })
}
