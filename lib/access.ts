/**
 * Sumber tunggal kebenaran (single source of truth) untuk seluruh definisi role,
 * label tampilan, validasi server, dan matriks hak akses sistem LCH.
 */

export const CANONICAL_ROLES = [
  {
    code: "admin",
    label: "Admin",
    description: "Akses penuh seluruh modul sistem & manajemen pengguna",
  },
  {
    code: "marketing",
    label: "Marketing",
    description: "Pengelolaan klien, prospek SPPA, dan database polis",
  },
  {
    code: "placement",
    label: "Teknik",
    description: "Placing slip, cover note, underwriting, dan referensi tarif",
  },
  {
    code: "claim",
    label: "Klaim",
    description: "Pencatatan, verifikasi, dan tahapan dokumen klaim",
  },
  {
    code: "accounting",
    label: "Accounting",
    description: "Pencatatan jurnal memorial dan pelaporan keuangan",
  },
  {
    code: "finance",
    label: "Finance",
    description: "Penerbitan Debit/Credit Note, penerimaan, dan hutang-piutang premi",
  },
] as const

export type RoleCode = (typeof CANONICAL_ROLES)[number]["code"]

export const ALLOWED_ROLE_CODES: readonly RoleCode[] = CANONICAL_ROLES.map(
  (r) => r.code
)

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin: "Admin",
  marketing: "Marketing",
  placement: "Teknik",
  claim: "Klaim",
  accounting: "Accounting",
  finance: "Finance",
}

/**
 * Validasi apakah kode merupakan salah satu dari 6 role resmi LCH.
 */
export function isValidRoleCode(code: string): code is RoleCode {
  return (ALLOWED_ROLE_CODES as readonly string[]).includes(code)
}

/**
 * Validasi kumpulan role pada server untuk mencegah privilege escalation atau
 * nilai role liar dari payload klien.
 */
export function validateRoleCodes(
  roles: unknown
): { valid: true; roles: RoleCode[] } | { valid: false; error: string } {
  if (!Array.isArray(roles) || roles.length === 0) {
    return { valid: false, error: "Setidaknya satu role wajib dipilih." }
  }

  const cleanRoles: RoleCode[] = []
  for (const item of roles) {
    if (typeof item !== "string" || !isValidRoleCode(item)) {
      return { valid: false, error: `Role tidak valid: ${String(item)}` }
    }
    if (!cleanRoles.includes(item)) {
      cleanRoles.push(item)
    }
  }

  return { valid: true, roles: cleanRoles }
}

/**
 * Matriks hak akses per role.
 * Nilainya adalah awalan path. "/" hanya cocok persis dengan rute root dashboard.
 * Role Admin menggunakan "*" yang otomatis membuka seluruh sistem.
 */
export const ACCESS_BY_ROLE: Record<RoleCode, string[]> = {
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
  accounting: ["/", "/accounting", "/reports"],
  finance: ["/", "/finance", "/accounting", "/policies", "/reports"],
}

/** Halaman yang boleh dibuka tanpa login. */
export const PUBLIC_ROUTES = ["/login"]

/**
 * Apakah pengguna dengan kumpulan role (atau single role) boleh membuka path ini.
 * Mendukung multi-role: jika salah satu role mengizinkan, akses dibuka.
 */
export function canAccess(
  roles: string | string[] | undefined,
  path: string
): boolean {
  if (!roles) return false
  const roleList = Array.isArray(roles) ? roles : [roles]
  if (roleList.length === 0) return false

  // Rute utilitas sistem yang dapat diakses oleh semua pengguna terautentikasi
  if (path === "/change-password" || path.startsWith("/change-password/")) {
    return true
  }

  return roleList.some((role) => {
    const allowed = ACCESS_BY_ROLE[role as RoleCode]
    if (!allowed) return false
    if (allowed.includes("*")) return true
    return allowed.some((prefix) =>
      prefix === "/" ? path === "/" : path === prefix || path.startsWith(`${prefix}/`)
    )
  })
}
