import "server-only"

/** Label lama di data contoh yang namanya berbeda di master data. */
const LEGACY_COB_NAMES: Record<string, string> = {
  "personal accident": "general accident",
}

/** Kunci pencarian COB di master dalam huruf kecil; label lama ditambah nama master padanannya. */
export function cobLookupKeys(value: string): string[] {
  const key = value.trim().toLowerCase()
  const legacy = LEGACY_COB_NAMES[key]
  return legacy ? [key, legacy] : [key]
}
