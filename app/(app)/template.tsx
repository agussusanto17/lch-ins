import { headers } from "next/headers"

import { requireAccess } from "@/lib/server/session"

/**
 * Berbeda dengan layout yang dipertahankan antar rute (layout persistence),
 * template di-render ulang pada setiap navigasi, termasuk navigasi client-side.
 * Ini memastikan pengecekan hak akses dan pembatasan mustChangePassword
 * selalu dievaluasi di server pada setiap perpindahan halaman.
 */
export default async function AppTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/"
  await requireAccess(pathname)

  return <>{children}</>
}
