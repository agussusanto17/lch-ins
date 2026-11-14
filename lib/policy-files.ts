import type { PolicyFile, PolicyFileKind } from "./data/types"

export interface PolicyFileKindInfo {
  kind: PolicyFileKind
  label: string
  /** Berkas tambahan, tidak dihitung di kelengkapan berkas polis (x/3). */
  extra?: boolean
}

/**
 * Tiga jenis berkas polis, masing-masing dengan riwayat versi (Agus, 9 November 2026).
 * Slip menampung dokumen slip yang dibuat di luar sistem LCH (meeting LCH, 10 November 2026).
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
 * Slip hanya tampil untuk polis tanpa placing slip di sistem, karena slip sistem sudah bisa
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
