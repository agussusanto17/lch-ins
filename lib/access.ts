/**
 * Hak akses per role, ditulis di sini dan bukan di halaman pengaturan.
 *
 * LCH sudah setuju hak akses cukup diatur di config kode, jadi tidak ada layar
 * permission. Daftar di bawah masih sementara: LCH belum mengisi Sheet Hak
 * Akses karena menunggu meeting internal. Begitu isiannya masuk, ubah daftar
 * ini saja, tidak ada yang lain yang perlu disentuh.
 *
 * Nilainya adalah awalan path. "/finance" berarti seluruh halaman di bawahnya
 * ikut terbuka. Admin memakai "*" yang berarti semua halaman.
 */
export const ACCESS_BY_ROLE: Record<string, string[]> = {
  admin: ["*"],
  marketing: ["/", "/marketing", "/policies", "/reports"],
  placement: [
    "/",
    "/underwriting",
    "/policies",
    "/claims",
    "/master-data",
    "/reports",
  ],
  claim: ["/", "/claims", "/policies", "/reports"],
  finance: ["/", "/finance", "/accounting", "/policies", "/reports"],
}

/** Halaman yang boleh dibuka tanpa login. */
export const PUBLIC_ROUTES = ["/login"]

/**
 * Apakah role boleh membuka path ini.
 *
 * Path "/" hanya cocok persis, supaya tidak otomatis membuka seluruh aplikasi.
 */
export function canAccess(roleCode: string | undefined, path: string) {
  if (!roleCode) return false
  const allowed = ACCESS_BY_ROLE[roleCode]
  if (!allowed) return false
  if (allowed.includes("*")) return true
  return allowed.some((prefix) =>
    prefix === "/" ? path === "/" : path === prefix || path.startsWith(`${prefix}/`)
  )
}
