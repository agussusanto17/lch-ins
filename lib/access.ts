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
    code: "finance",
    label: "Finance",
    description: "Penerbitan Debit/Credit Note, penerimaan, dan hutang-piutang premi",
  },
  {
    code: "accounting",
    label: "Accounting",
    description: "Verifikasi pembayaran, pengelolaan piutang/hutang, pembukuan jurnal",
  },
  {
    code: "direksi",
    label: "Direksi",
    description: "Pengawasan eksekutif dengan akses lihat penuh seluruh modul",
  },
  {
    code: "policy_admin",
    label: "Policy Admin",
    description: "Pengelolaan database polis dengan akses lihat modul Marketing dan Teknik",
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
  finance: "Finance",
  accounting: "Accounting",
  direksi: "Direksi",
  policy_admin: "Policy Admin",
}

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

export type AccessLevel = "kelola" | "lihat" | "tidak"

/** Mapping single-letter aliases untuk matriks hak akses. */
const K = "kelola" as const
const L = "lihat" as const
const T = "tidak" as const

/** Urutan kolom pada ACCESS_MATRIX, mengikuti Sheet Hak Akses LCH. */
const COLUMNS = [
  "admin",
  "marketing",
  "placement",
  "claim",
  "finance",
  "accounting",
  "direksi",
  "policy_admin",
] as const satisfies readonly RoleCode[]

/**
 * Matriks hak akses per menu berdasarkan Sheet Hak Akses LCH.
 *
 * Kolom: Admin, Marketing, Placement, Klaim, Finance, Accounting, Direksi, Policy Admin.
 * Menggunakan pencocokan awalan terpanjang untuk menentukan hak akses subrute.
 */
export const ACCESS_MATRIX: Record<string, readonly AccessLevel[]> = {
  // Kolom: Admin, Marketing, Placement, Claim, Finance, Accounting, Direksi, Policy Admin
  "/": [K, L, L, L, L, L, L, L],
  "/marketing": [K, K, K, L, T, T, L, L],
  "/underwriting": [K, L, K, L, L, L, L, L],
  "/underwriting/master-clauses": [K, T, T, T, T, T, T, T],
  "/policies": [K, L, K, L, L, L, L, K],
  "/claims": [K, L, K, K, L, L, L, T],
  "/finance/notes": [K, L, L, L, K, L, L, T],
  "/finance/payments": [K, L, L, L, K, K, L, T],
  "/finance/receivables": [K, L, L, L, K, K, L, T],
  "/accounting/journal": [K, T, T, T, K, K, L, T],
  "/accounting/statements": [K, T, T, T, L, K, L, T],
  "/master-data": [K, T, T, T, T, T, T, T],
  // Report Operational: Lihat untuk Marketing, Klaim, dan Direksi disetujui
  // 10 November 2026. Halamannya tanpa aksi ubah, jadi Lihat sudah mencakup
  // filter, print, dan export. Bagian Klaim diatur `canSeeReportClaims`.
  "/reports": [K, L, K, L, T, T, L, T],
  "/users": [K, T, T, T, T, T, L, T],

  // Menu audit trail dan pengaturan dibatasi Admin karena berdampak lintas modul.
  "/audit-trail": [K, T, T, T, T, T, T, T],
  "/settings": [K, T, T, T, T, T, T, T],
}

/** Public routes accessible without authentication. */
export const PUBLIC_ROUTES = ["/login"]

/** Halaman yang boleh dibuka siapa pun yang sudah login. */
const ALWAYS_ALLOWED = ["/change-password"]

const RANK: Record<AccessLevel, number> = { tidak: 0, lihat: 1, kelola: 2 }

/** Baris matriks yang paling cocok untuk sebuah path. Prefix terpanjang menang. */
function matchRow(path: string): readonly AccessLevel[] | null {
  let best: readonly AccessLevel[] | null = null
  let bestLength = -1

  for (const [prefix, row] of Object.entries(ACCESS_MATRIX)) {
    const hit =
      prefix === "/"
        ? path === "/"
        : path === prefix || path.startsWith(`${prefix}/`)
    if (hit && prefix.length > bestLength) {
      best = row
      bestLength = prefix.length
    }
  }

  return best
}

/**
 * Tingkat akses tertinggi yang dimiliki pengguna untuk sebuah path.
 *
 * Pengguna bisa memegang lebih dari satu role, misalnya Harry yang bekerja di
 * Marketing sekaligus Teknik. Dalam hal itu yang berlaku adalah yang paling
 * longgar di antara role-rolenya.
 */
export function accessLevel(
  roles: string | string[] | undefined,
  path: string
): AccessLevel {
  if (ALWAYS_ALLOWED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return "kelola"
  }

  if (!roles) return "tidak"
  const roleList = Array.isArray(roles) ? roles : [roles]
  if (roleList.length === 0) return "tidak"

  const row = matchRow(path)
  // Path yang belum terdaftar di matriks hanya terbuka untuk Admin, supaya
  // halaman baru tidak otomatis bisa dibuka semua orang.
  if (!row) return roleList.includes("admin") ? "kelola" : "tidak"

  let best: AccessLevel = "tidak"
  for (const role of roleList) {
    const column = COLUMNS.indexOf(role as (typeof COLUMNS)[number])
    if (column === -1) continue
    const level = row[column]
    if (RANK[level] > RANK[best]) best = level
  }

  return best
}

/** Menunya tampil dan halamannya boleh dibuka. */
export function canAccess(
  roles: string | string[] | undefined,
  path: string
): boolean {
  return accessLevel(roles, path) !== "tidak"
}

/** Boleh menambah, mengubah, menghapus, dan release di halaman ini. */
export function canManage(
  roles: string | string[] | undefined,
  path: string
): boolean {
  return accessLevel(roles, path) === "kelola"
}

/**
 * Role yang melihat bagian Klaim di Report Operational. Teknik hanya melihat
 * produksi dan polis (permintaan LCH, 4 November 2026, PR #112). Pengguna
 * berperan ganda, misalnya Marketing dan Teknik, mengikuti role yang paling
 * longgar, sama seperti `accessLevel`.
 */
const REPORT_CLAIM_ROLES: readonly RoleCode[] = [
  "admin",
  "marketing",
  "claim",
  "direksi",
]

export function canSeeReportClaims(
  roles: string | string[] | undefined
): boolean {
  if (!roles) return false
  const roleList = Array.isArray(roles) ? roles : [roles]
  return roleList.some((role) =>
    (REPORT_CLAIM_ROLES as readonly string[]).includes(role)
  )
}
