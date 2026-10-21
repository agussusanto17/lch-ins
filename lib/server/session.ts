import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { canAccess, canManage, ROLE_LABELS, type RoleCode } from "@/lib/access"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export interface CurrentUser {
  id: string
  name: string
  email: string
  roles: string[]
  roleCode: string
  roleName: string
  jobTitle?: string | null
  mustChangePassword: boolean
  sessionId: string
}

/**
 * Currently authenticated user, or null.
 *
 * Wrapped in React `cache` so session and roles are queried once per render,
 * even when called across multiple server components.
 *
 * Active status is verified here on each request, ensuring deactivated accounts
 * lose access immediately without waiting for session expiration.
 */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      roles: true,
      jobTitle: true,
      mustChangePassword: true,
      role: { select: { code: true, name: true } },
    },
  })
  if (!user || !user.isActive) return null

  // Prioritaskan array roles, dengan fallback ke roleId/role lama
  const roles =
    user.roles && user.roles.length > 0
      ? user.roles
      : user.role
      ? [user.role.code]
      : []

  const primaryRoleCode = roles[0] ?? user.role?.code ?? ""
  const primaryRoleName =
    (primaryRoleCode in ROLE_LABELS
      ? ROLE_LABELS[primaryRoleCode as RoleCode]
      : undefined) ??
    user.role?.name ??
    "-"

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles,
    roleCode: primaryRoleCode,
    roleName: primaryRoleName,
    jobTitle: user.jobTitle,
    mustChangePassword: user.mustChangePassword,
    sessionId: session.session.id,
  }
})

/** Require authenticated session. Used in application layout. */
export async function requireUser(path?: string): Promise<CurrentUser> {
  const user = await currentUser()
  if (!user) {
    const target =
      path && path !== "/" ? `/login?next=${encodeURIComponent(path)}` : "/login"
    redirect(target)
  }
  return user
}

/**
 * Require authenticated session and verify role authorization for path.
 * Enforces mandatory first-time password change on the server.
 */
export async function requireAccess(path: string): Promise<CurrentUser> {
  const user = await requireUser(path)

  // If user must change password (e.g. newly created or reset accounts),
  // block business module access and enforce navigation to /change-password.
  if (user.mustChangePassword && path !== "/change-password") {
    redirect("/change-password")
  }

  // If user has already changed password but navigates to /change-password,
  // redirect to dashboard.
  if (!user.mustChangePassword && path === "/change-password") {
    redirect("/")
  }

  if (path === "/change-password") {
    return user
  }

  if (!canAccess(user.roles, path)) {
    redirect("/")
  }

  return user
}

/**
 * Wajib login, boleh membuka path ini, dan rolenya bertingkat Kelola.
 *
 * Dipakai di Server Action yang mengubah data. `requireAccess` saja tidak
 * cukup: banyak role diberi Lihat pada menu di luar bidangnya, jadi tanpa
 * pemeriksaan ini mereka bisa membuka halaman sekaligus mengubah isinya.
 */
export async function requireManage(path: string): Promise<CurrentUser> {
  const user = await requireAccess(path)
  assertPasswordChanged(user)

  if (!canManage(user.roles, path)) {
    throw new Error(
      "Akses ditolak: role Anda hanya dapat melihat halaman ini, tidak mengubahnya."
    )
  }

  return user
}

/**
 * Require Admin role privileges on the server (e.g. User Management)
 * and ensure mandatory password change has been completed.
 */
export async function requireAdmin(path = "/users"): Promise<CurrentUser> {
  const user = await requireAccess(path)

  const isAdmin = user.roles.includes("admin") || user.roleCode === "admin"
  if (!isAdmin) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat mengelola pengguna.")
  }

  return user
}

/**
 * Validasi tegas bahwa pengguna tidak dalam status wajib ganti kata sandi.
 * Digunakan pada Server Actions dan operasi data sensitif.
 */
export function assertPasswordChanged(user: CurrentUser): void {
  if (user.mustChangePassword) {
    throw new Error("Wajib menyetel kata sandi baru sebelum dapat melakukan tindakan ini.")
  }
}
