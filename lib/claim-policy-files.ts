/**
 * Berkas polis yang ditampilkan saat polis dipilih di form klaim (Agus, 13
 * November 2026): polis induk beserta endorsement dan pembatalannya, supaya
 * petugas klaim bisa membuka PDF polis sebelum klaim disimpan.
 */

import type { PolicyType } from "@/lib/data/types"

export interface ClaimPolicyFile {
  policyId: string
  policyNo: string
  /** "Polis", "Endorsement ke-1", atau "Pembatalan". */
  label: string
  /** Polis atau endorsement yang dipilih di klaim. */
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
    selected: r.id === selectedId,
    file: r.file,
  }))
}

/** Teks tautan berkas: PDF disebut PDF, berkas lain disebut berkas. */
export function policyFileLinkText(file: NonNullable<ClaimPolicyFile["file"]>) {
  const kind = /\.pdf$/i.test(file.fileName) ? "Lihat PDF" : "Lihat berkas"
  return file.version > 1 ? `${kind} (versi ${file.version})` : kind
}
