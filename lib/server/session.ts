import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { canAccess } from "@/lib/access"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export interface CurrentUser {
  id: string
  name: string
  email: string
  roleCode: string
  roleName: string
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
      role: { select: { code: true, name: true } },
    },
  })
  if (!user || !user.isActive) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleCode: user.role.code,
    roleName: user.role.name,
    sessionId: session.session.id,
  }
})

/** Wajib login. Dipakai di layout aplikasi. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser()
  if (!user) redirect("/login")
  return user
}

/**
 * Wajib login dan rolenya boleh membuka path ini.
 *
 * Pemeriksaan di proxy hanya melihat ada tidaknya cookie, jadi pemeriksaan
 * yang sebenarnya ada di sini, sedekat mungkin dengan datanya.
 */
export async function requireAccess(path: string): Promise<CurrentUser> {
  const user = await requireUser()
  if (!canAccess(user.roleCode, path)) redirect("/")
  return user
}
