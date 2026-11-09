import type { PolicyFile, PolicyFileKind } from "./data/types"

/**
 * Berkas polis terdiri dari tiga jenis (Agus, 9 November 2026), masing-masing
 * dengan riwayat versinya sendiri.
 */
export const POLICY_FILE_KINDS: { kind: PolicyFileKind; label: string }[] = [
  { kind: "Policy", label: "Polis" },
  { kind: "PremiumNote", label: "Premium Note" },
  { kind: "CommissionNote", label: "Commission Note" },
]

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
