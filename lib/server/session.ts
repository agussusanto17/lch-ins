import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { canAccess, ROLE_LABELS, type RoleCode } from "@/lib/access"
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
 * Pengguna yang sedang login, atau null.
 *
 * Dibungkus `cache` supaya satu render hanya sekali menanyakan sesi dan role,
 * meski dipanggil dari beberapa komponen.
 *
 * Status aktif dicek di sini, bukan hanya saat login. Itu yang membuat
 * menonaktifkan pengguna langsung berlaku: permintaan berikutnya sudah ditolak
 * tanpa menunggu sesinya kedaluwarsa.
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

/** Wajib login. Dipakai di layout aplikasi. */
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
 * Wajib login dan rolenya boleh membuka path ini.
 * Memeriksa juga kewajiban ganti password pertama kali secara server-side.
 */
export async function requireAccess(path: string): Promise<CurrentUser> {
  const user = await requireUser(path)

  // Jika akun diwajibkan mengganti password (misal akun seeder / baru dibuat admin),
  // cegah akses ke modul bisnis dan kunci navigasi ke /change-password
  if (user.mustChangePassword && path !== "/change-password") {
    redirect("/change-password")
  }

  // Jika pengguna sudah selesai ganti password tetapi membuka /change-password,
  // kembalikan ke dashboard
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
 * Khusus modul administratif (User Management dll).
 * Memvalidasi apakah user memiliki privilege Admin secara server-side.
 */
export async function requireAdmin(path?: string): Promise<CurrentUser> {
  const user = await requireUser(path)

  const isAdmin = user.roles.includes("admin") || user.roleCode === "admin"
  if (!isAdmin) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat mengelola pengguna.")
  }

  return user
}
