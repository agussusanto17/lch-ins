import { headers } from "next/headers"
import { connection } from "next/server"

import { requireAccess } from "@/lib/server/session"

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()
  const pathname = (await headers()).get("x-pathname") ?? "/"
  await requireAccess(pathname)

  return <div className="min-h-svh bg-muted/50">{children}</div>
}
