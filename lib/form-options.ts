/**
 * Pilihan dropdown dari master data, dimuat di `lib/server/form-options.ts` dan dibagikan lewat
 * `FormOptionsProvider`. Hanya tipe dan helper, aman di client maupun server.
 */
import type { ClaimStatus, ClientType, PolicyType } from "./data/types"

export interface CoverOption {
  id: string
  /** Kode 4 digit dari master, contoh 0109. */
  code: string
  name: string
  /** Token {COVER} di nomor slip, contoh PAR. Kosong berarti tanpa segmen cover. */
  abbreviation: string | null
  /** Label bawaan Detail tambahan slip, misalnya Retroactive Date. */
  detailLabels: string[]
  /** Slip type of cover ini dibagi Section 1 dan 2, misalnya CAR dan EAR. */
  usesSections: boolean
  /** Slip type of cover ini open cover (rate tanpa premi pasti), misalnya MOP. */
  openCover: boolean
  /** Slip type of cover ini memakai tarif OJK; mati untuk Heavy Equipment. */
  ojkTariff: boolean
  /** Label periode bawaan di dokumen, misalnya Date of Tournament. */
  periodLabel: string | null
  /** Lama periode bawaan dalam hari, untuk tanggal akhir otomatis. */
  periodDays: number | null
  /** Teks pengganti tanggal akhir di dokumen, misalnya until final destination. */
  periodEndText: string | null
}

/** Pilihan deductible dari Master Data > Deductible. */
export interface DeductibleChoice {
  /** Kosong berarti berlaku untuk semua type of cover dalam COB itu. */
  coverTypeId: string | null
  text: string
}

export interface CobOption {
  id: string
  code: string
  /** Nama tampilan, hasil `normalizeCob` dari nama di master. */
  label: string
  covers: CoverOption[]
  deductibles: DeductibleChoice[]
}

export interface NamedOption {
  id: string
  name: string
}

export interface CurrencyOption {
  code: string
  name: string
}

/** Jenis lookup yang dipakai sebagai pilihan di form klien. */
export const FORM_LOOKUP_TYPES = [
  "id_type",
  "income_source",
  "insurance_purpose",
  "address_type",
  "client_document_type",
] as const

export type FormLookupType = (typeof FORM_LOOKUP_TYPES)[number]

/** Lookup status dan tipe yang dipakai form klaim, polis, dan klien. */
export const SYSTEM_LOOKUP_TYPES = [
  "claim_status",
  "claim_stage",
  "policy_type",
  "client_status",
  "client_type",
] as const

export type SystemLookupType = (typeof SYSTEM_LOOKUP_TYPES)[number]

export interface LookupOption {
  code: string
  name: string
}

/**
 * Lookup yang nilainya dipakai logika sistem (klaim terbuka, polis induk, KYC per tipe klien).
 * Nama dan urutan diatur di Master Data, tapi nilai baru ditambah developer, seperti COB.
 */
export const FIXED_LOOKUP_TYPES: readonly string[] = [
  "claim_status",
  "policy_type",
  "client_type",
]

export function isFixedLookupType(type: string) {
  return FIXED_LOOKUP_TYPES.includes(type)
}

/** Kode master untuk setiap nilai yang dipakai sistem. */
export const CLAIM_STATUS_CODES: Record<ClaimStatus, string> = {
  Outstanding: "outstanding",
  Settled: "settled",
  Closed: "closed",
  Rejected: "rejected",
}
export const POLICY_TYPE_CODES: Record<PolicyType, string> = {
  Baru: "new",
  Renewal: "renewal",
  Endorsement: "endorsement",
  Cancellation: "cancellation",
}
export const CLIENT_TYPE_CODES: Record<ClientType, string> = {
  Perorangan: "individual",
  Korporasi: "corporate",
}

/**
 * Nilai sistem yang aktif di master, berlabel dan berurutan seperti Master Data. Nilai tersimpan
 * yang nonaktif tetap ikut; tanpa data master (test), semua nilai sistem dengan namanya sendiri.
 */
export function fixedLookupItems<T extends string>(
  rows: readonly LookupOption[],
  codes: Record<T, string>,
  current?: T | null
): { label: string; value: T }[] {
  const values = Object.keys(codes) as T[]
  if (!rows.length) return values.map((v) => ({ label: v, value: v }))
  const items = rows.flatMap((r) => {
    const value = values.find((v) => codes[v] === r.code)
    return value ? [{ label: r.name, value }] : []
  })
  if (current && !items.some((i) => i.value === current)) {
    items.push({ label: current, value: current })
  }
  return items
}

/**
 * Dicocokkan lewat kode supaya nama yang diganti di Master Data tidak mengubah logika, lalu lewat
 * nama untuk data lama tanpa kode yang dikenal.
 */
export function systemValueFromRow<T extends string>(
  codes: Record<T, string>,
  row: { code?: string | null; name?: string | null } | null | undefined,
  fallback: NoInfer<T>
): T {
  const values = Object.keys(codes) as T[]
  const code = row?.code?.trim().toLowerCase()
  const name = row?.name?.trim().toLowerCase()
  return (
    values.find((v) => codes[v] === code) ??
    values.find((v) => v.toLowerCase() === name) ??
    fallback
  )
}

/** Label nama master untuk satu nilai sistem, atau nilainya sendiri. */
export function fixedLookupLabel<T extends string>(
  rows: readonly LookupOption[],
  codes: Record<T, string>,
  value: T
) {
  return rows.find((r) => r.code === codes[value])?.name ?? value
}

/**
 * Pilihan daftar bebas (tahapan klaim, status klien): nama master aktif plus nilai tersimpan yang
 * nonaktif. Tanpa data master memakai daftar bawaan.
 */
export function dynamicLookupItems(
  rows: readonly LookupOption[],
  fallback: readonly string[],
  current?: string | null
): string[] {
  const names = rows.length ? rows.map((r) => r.name) : [...fallback]
  return current && !names.includes(current) ? [...names, current] : names
}

export interface FormOptions {
  cobs: CobOption[]
  insurers: NamedOption[]
  currencies: CurrencyOption[]
  wordingForms: NamedOption[]
  /** Nama nilai lookup per jenis, sudah urut sesuai sort order di master. */
  lookups: Record<FormLookupType, string[]>
  /** Jenis manfaat PA (lookup pa_benefit) untuk limit manfaat di slip. */
  paBenefits: { id: string; code: string; name: string }[]
  /** Status dan tipe klaim, polis, dan klien yang aktif, urut seperti di master. */
  systemLookups: Record<SystemLookupType, LookupOption[]>
}

export const EMPTY_FORM_OPTIONS: FormOptions = {
  cobs: [],
  insurers: [],
  currencies: [],
  wordingForms: [],
  lookups: {
    id_type: [],
    income_source: [],
    insurance_purpose: [],
    address_type: [],
    client_document_type: [],
  },
  paBenefits: [],
  systemLookups: {
    claim_status: [],
    claim_stage: [],
    policy_type: [],
    client_status: [],
    client_type: [],
  },
}

/**
 * Pilihan plus nilai tersimpan yang sudah tidak ada di master, supaya membuka data lama untuk
 * diedit tidak mengosongkan isiannya.
 */
export function withCurrent(values: string[], current?: string | null) {
  if (!current || values.includes(current)) return values
  return [current, ...values]
}

export function cobLabels(options: FormOptions) {
  return options.cobs.map((c) => c.label)
}

export function coversFor(options: FormOptions, cob: string): CoverOption[] {
  return options.cobs.find((c) => c.label === cob)?.covers ?? []
}

/** Singkatan cover dari master untuk nomor slip, atau null bila tidak ada. */
export function coverAbbreviation(
  options: FormOptions,
  cob: string,
  typeOfCover: string
) {
  const cover = coversFor(options, cob).find((c) => c.name === typeOfCover)
  return cover?.abbreviation || null
}

/**
 * Pilihan deductible untuk type of cover slip (Property bisa dua): yang khusus type of cover dulu,
 * lalu yang berlaku untuk semua cover di COB-nya.
 */
export function deductibleChoicesFor(
  options: FormOptions,
  cob: string,
  typesOfCover: string[]
): string[] {
  const cobOption = options.cobs.find((c) => c.label === cob)
  if (!cobOption) return []
  const coverIds = cobOption.covers
    .filter((c) => typesOfCover.includes(c.name))
    .map((c) => c.id)
  const specific = cobOption.deductibles.filter(
    (d) => d.coverTypeId !== null && coverIds.includes(d.coverTypeId)
  )
  const general = cobOption.deductibles.filter((d) => d.coverTypeId === null)
  return Array.from(new Set([...specific, ...general].map((d) => d.text)))
}
