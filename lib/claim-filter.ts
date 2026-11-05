import { CLAIM_STAGES, CLAIM_STATUSES } from "@/lib/data/reference"
import type { ClaimStage, ClaimStatus } from "@/lib/data/types"

/**
 * Bentuk minimal baris klaim yang cukup untuk disaring oleh filter.
 * Dipakai bersama oleh tabel UI claims-view dan halaman cetak daftar klaim.
 */
export interface FilterableClaim {
  id: string
  claimNo: string
  policyNo?: string | null
  insuredName: string
  cob: string
  status: string
  stage?: string | null
  location?: string | null
  lossDescription?: string | null
}

export interface ClaimFilterParams {
  status: ClaimStatus | "all"
  stage: ClaimStage | "all"
  cob: string
  search: string
}

export const DEFAULT_CLAIM_FILTERS: ClaimFilterParams = {
  status: "all",
  stage: "all",
  cob: "all",
  search: "",
}

type RawFilterInput = Record<string, string | string[] | undefined>

function readString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/**
 * Membaca parameter query URL menjadi filter klaim yang tervalidasi.
 * Nilai di luar daftar referensi dikembalikan ke 'all' atau ''.
 */
export function parseClaimFilters(input: RawFilterInput): ClaimFilterParams {
  const rawStatus = readString(input.status)?.trim()
  const rawStage = readString(input.stage)?.trim()
  const rawCob = readString(input.cob)?.trim()
  const rawSearch = readString(input.search)?.trim() ?? ""

  const status: ClaimFilterParams["status"] =
    rawStatus && (CLAIM_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as ClaimStatus)
      : "all"

  const stage: ClaimFilterParams["stage"] =
    rawStage && (CLAIM_STAGES as readonly string[]).includes(rawStage)
      ? (rawStage as ClaimStage)
      : "all"

  const cob = rawCob && rawCob !== "all" ? rawCob.slice(0, 80) : "all"

  return {
    status,
    stage,
    cob,
    search: rawSearch.slice(0, 100),
  }
}

/**
 * Menyusun query string URL dari filter klaim yang aktif.
 * Parameter yang bernilai default tidak disertakan agar URL tetap bersih.
 */
export function claimFilterQuery(filters: ClaimFilterParams): string {
  const params = new URLSearchParams()
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.stage !== "all") params.set("stage", filters.stage)
  if (filters.cob !== "all") params.set("cob", filters.cob)
  if (filters.search.trim()) params.set("search", filters.search.trim())
  return params.toString()
}

/**
 * URL cetak daftar klaim dengan membawa filter aktif saat ini.
 */
export function claimPrintHref(filters: ClaimFilterParams): string {
  const query = claimFilterQuery(filters)
  return query ? `/claims/print?${query}` : "/claims/print"
}

/**
 * URL kembali dari halaman cetak ke layar klaim dengan filter yang sama.
 */
export function claimBackHref(filters: ClaimFilterParams): string {
  const query = claimFilterQuery(filters)
  return query ? `/claims?${query}` : "/claims"
}

/**
 * Menyaring baris klaim berdasarkan status, tahapan, COB, dan pencarian bebas.
 * Mengikuti aturan yang sama antara tampilan layar dan dokumen cetak.
 */
export function filterClaims<T extends FilterableClaim>(
  items: T[],
  filters: ClaimFilterParams
): T[] {
  const { status, stage, cob, search } = filters
  const q = search.trim().toLowerCase()

  return items.filter((c) => {
    if (status !== "all" && c.status !== status) return false
    if (stage !== "all" && c.stage !== stage) return false
    if (cob !== "all" && c.cob !== cob) return false
    if (!q) return true
    return (
      c.claimNo.toLowerCase().includes(q) ||
      c.insuredName.toLowerCase().includes(q) ||
      (c.policyNo || "").toLowerCase().includes(q) ||
      c.cob.toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q) ||
      (c.lossDescription || "").toLowerCase().includes(q)
    )
  })
}
