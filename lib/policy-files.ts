import type { PolicyFile, PolicyFileKind } from "./data/types"

export interface PolicyFileKindInfo {
  kind: PolicyFileKind
  label: string
  /** Berkas tambahan, tidak dihitung di kelengkapan berkas polis (x/3). */
  extra?: boolean
}

/**
 * Berkas polis terdiri dari tiga jenis (Agus, 9 November 2026), masing-masing
 * dengan riwayat versinya sendiri. Jenis Slip menampung dokumen slip untuk
 * polis yang slipnya dibuat di luar sistem LCH (meeting LCH, 10 November 2026).
 */
export const POLICY_FILE_KINDS: PolicyFileKindInfo[] = [
  { kind: "Policy", label: "Polis" },
  { kind: "PremiumNote", label: "Premium Note" },
  { kind: "CommissionNote", label: "Commission Note" },
  { kind: "Slip", label: "Slip", extra: true },
]

/** Tiga jenis utama yang dihitung di kolom Berkas daftar polis. */
export const MAIN_POLICY_FILE_KINDS = POLICY_FILE_KINDS.filter((k) => !k.extra)

/**
 * Jenis berkas yang tampil untuk sebuah polis. Slip hanya untuk polis yang
 * tidak tertaut ke placing slip di sistem, karena slip di sistem sudah bisa
 * dicetak; file Slip yang sudah terunggah tetap tampil.
 */
export function policyFileKindsFor(policy: {
  placingSlipId?: string | null
  files?: readonly PolicyFile[]
}) {
  return POLICY_FILE_KINDS.filter(
    (k) =>
      k.kind !== "Slip" ||
      !policy.placingSlipId ||
      (policy.files ?? []).some((f) => f.kind === "Slip")
  )
}

export function policyFileKindLabel(kind: PolicyFileKind) {
  return POLICY_FILE_KINDS.find((k) => k.kind === kind)?.label ?? kind
}

/** Versi terakhir berkas satu jenis. */
export function latestPolicyFile(files: PolicyFile[], kind: PolicyFileKind) {
  let latest: PolicyFile | undefined
  for (const f of files) {
    if (f.kind === kind && (!latest || f.version > latest.version)) latest = f
  }
  return latest
}

/** Riwayat satu jenis, versi terbaru di atas. */
export function policyFilesOfKind(files: PolicyFile[], kind: PolicyFileKind) {
  return files.filter((f) => f.kind === kind).sort((a, b) => b.version - a.version)
}
