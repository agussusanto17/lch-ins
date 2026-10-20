/**
 * Single source of truth for role definitions, display labels,
 * server authorization validation, and access control matrices for LCH.
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
 * Validate whether a code is one of the 6 official LCH canonical roles.
 */
export function isValidRoleCode(code: string): code is RoleCode {
  return (ALLOWED_ROLE_CODES as readonly string[]).includes(code)
}

/**
 * Validate roles collection on the server to prevent privilege escalation or
 * invalid role codes from client payloads.
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
 * Access control matrix by role.
 * Values represent path prefixes. "/" only matches root dashboard.
 * Admin role uses "*" granting full access.
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

/** Public routes accessible without authentication. */
export const PUBLIC_ROUTES = ["/login"]

/**
 * Check whether a user with given roles (or single role) is authorized for a path.
 * Supports multi-role assignments: grants access if any assigned role permits it.
 */
export function canAccess(
  roles: string | string[] | undefined,
  path: string
): boolean {
  if (!roles) return false
  const roleList = Array.isArray(roles) ? roles : [roles]
  if (roleList.length === 0) return false

  // System utility routes accessible to all authenticated users
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
