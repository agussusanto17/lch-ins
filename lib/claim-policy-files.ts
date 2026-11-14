/**
 * Klaim dicatat ke polis induk, endorsement dan pembatalan digabung ke sana; deductible mengikuti
 * endorsement yang berlaku pada tanggal kejadian (Agus, 13 November 2026).
 */

import type { PolicyType } from "@/lib/data/types"
import type { DeductibleGroupText } from "@/lib/deductible-text"

export interface ClaimPolicyFile {
  policyId: string
  policyNo: string
  /** "Polis", "Endorsement ke-1", atau "Pembatalan". */
  label: string
  /**
   * Klaim tercatat ke endorsement atau pembatalan ini, yaitu klaim lama dari
   * sebelum pilihannya digabung ke polis induk. Polis induk tidak ditandai.
   */
  selected: boolean
  /** Versi terakhir berkas Polis; kosong bila belum diunggah. */
  file: { url: string; fileName: string; version: number } | null
}

export interface PolicyFamilyRow {
  id: string
  policyNo: string
  type: PolicyType
  endorsementSeq: number | null
  /** "YYYY-MM-DD". */
  inceptionDate: string
  file: ClaimPolicyFile["file"]
}

export const isPolicyChange = (type: PolicyType) =>
  type === "Endorsement" || type === "Cancellation"

/**
 * Polis induk dulu, lalu endorsement menurut urutannya, lalu pembatalan.
 * Renewal bukan bagian keluarga ini karena polisnya berdiri sendiri.
 */
export function policyFamilyFiles(
  rows: PolicyFamilyRow[],
  rootId: string,
  selectedId: string
): ClaimPolicyFile[] {
  const root = rows.find((r) => r.id === rootId)
  const changes = rows
    .filter((r) => r.id !== rootId && isPolicyChange(r.type))
    .sort(
      (a, b) =>
        Number(a.type === "Cancellation") - Number(b.type === "Cancellation") ||
        (a.endorsementSeq ?? Number.MAX_SAFE_INTEGER) - (b.endorsementSeq ?? Number.MAX_SAFE_INTEGER) ||
        a.inceptionDate.localeCompare(b.inceptionDate)
    )
  const label = (r: PolicyFamilyRow) =>
    r.id === rootId
      ? "Polis"
      : r.type === "Cancellation"
        ? "Pembatalan"
        : r.endorsementSeq
          ? `Endorsement ke-${r.endorsementSeq}`
          : "Endorsement"
  return [...(root ? [root] : []), ...changes].map((r) => ({
    policyId: r.id,
    policyNo: r.policyNo,
    label: label(r),
    selected: r.id === selectedId && r.id !== rootId,
    file: r.file,
  }))
}

/** Teks tautan berkas: PDF disebut PDF, berkas lain disebut berkas. */
export function policyFileLinkText(file: NonNullable<ClaimPolicyFile["file"]>) {
  const kind = /\.pdf$/i.test(file.fileName) ? "Lihat PDF" : "Lihat berkas"
  return file.version > 1 ? `${kind} (versi ${file.version})` : kind
}

export interface PolicyLink {
  id: string
  type: PolicyType
  parentPolicyId: string | null
}

export interface PolicyFamily {
  /** Polis induk; sama dengan id untuk polis baru dan renewal. */
  rootId: string
  /** Jumlah endorsement yang tercatat untuk polis induknya. */
  endorsements: number
  /** Polis induknya sudah punya pembatalan. */
  cancelled: boolean
}

/**
 * Keluarga tiap polis: naik ke induk selama endorsement atau pembatalan, sama dengan
 * rosterPolicyId di server. Endorsement tanpa induk yang ditemukan menjadi induknya sendiri.
 */
export function policyFamilies(rows: readonly PolicyLink[]): Map<string, PolicyFamily> {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const rootOf = (row: PolicyLink) => {
    let current = row
    for (let i = 0; i < 20; i++) {
      const parent =
        isPolicyChange(current.type) && current.parentPolicyId
          ? byId.get(current.parentPolicyId)
          : undefined
      if (!parent) break
      current = parent
    }
    return current.id
  }
  const roots = new Map(rows.map((r) => [r.id, rootOf(r)]))
  const counts = new Map<string, Omit<PolicyFamily, "rootId">>()
  for (const row of rows) {
    const rootId = roots.get(row.id) ?? row.id
    if (rootId === row.id) continue
    const count = counts.get(rootId) ?? { endorsements: 0, cancelled: false }
    if (row.type === "Cancellation") count.cancelled = true
    else count.endorsements += 1
    counts.set(rootId, count)
  }
  return new Map(
    rows.map((r) => {
      const rootId = roots.get(r.id) ?? r.id
      return [r.id, { rootId, ...(counts.get(rootId) ?? { endorsements: 0, cancelled: false }) }]
    })
  )
}

export interface ClaimPolicyChoice extends PolicyFamily {
  id: string
  policyNo: string
  insuredName: string
}

/**
 * Pilihan polis di form klaim: satu baris per polis induk. Klaim lama yang
 * terlanjur tercatat ke endorsement tetap menampilkan pilihannya.
 */
export function claimPolicyChoices<P extends ClaimPolicyChoice>(
  policies: readonly P[],
  selectedId: string | null | undefined
): P[] {
  return policies.filter((p) => p.rootId === p.id || p.id === selectedId)
}

/** "Nomor polis — Tertanggung (1 endorsement, dibatalkan)". */
export function claimPolicyLabel(p: ClaimPolicyChoice) {
  const base = `${p.policyNo} — ${p.insuredName}`
  if (p.rootId !== p.id) return base
  const notes = [
    p.endorsements ? `${p.endorsements} endorsement` : null,
    p.cancelled ? "dibatalkan" : null,
  ].filter((n): n is string => n !== null)
  return notes.length ? `${base} (${notes.join(", ")})` : base
}

/**
 * Deductible dari endorsement slip di Policy Database; daftarnya lengkap sesudah perubahan
 * karena endorsement slip menyalin seluruh slip sebelumnya.
 */
export interface PolicyChangeTerms {
  policyId: string
  /** "Endorsement ke-1". */
  label: string
  policyNo: string
  /** Tanggal efektif endorsement, "YYYY-MM-DD". */
  effectiveDate: string
  deductibleIntro: string | null
  deductibles: DeductibleGroupText[]
}

/**
 * Deductible endorsement terakhir yang efektif sampai tanggal itu, atau milik polis; `next` adalah
 * endorsement sesudahnya. Tanggal efektif sama mengikuti urutan `changes` dari server.
 */
export function deductiblesOn(
  base: { deductibleIntro: string | null; deductibles: DeductibleGroupText[] },
  changes: readonly PolicyChangeTerms[],
  date: string
) {
  const sorted = [...changes].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
  const applied = sorted.filter((c) => c.effectiveDate <= date).at(-1) ?? null
  const next = sorted.find((c) => c.effectiveDate > date) ?? null
  return {
    intro: applied ? applied.deductibleIntro : base.deductibleIntro,
    deductibles: applied ? applied.deductibles : base.deductibles,
    applied,
    next,
  }
}
