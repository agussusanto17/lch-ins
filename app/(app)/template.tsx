import { headers } from "next/headers"

import { requireAccess } from "@/lib/server/session"

/**
 * Template di-render ulang pada setiap navigasi, termasuk client-side (layout tidak),
 * jadi hak akses dan mustChangePassword selalu diperiksa di server.
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
