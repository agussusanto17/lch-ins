import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

import { PUBLIC_ROUTES } from "@/lib/access"

/**
 * Pengganti middleware di Next 16. Hanya cek optimistis cookie sesi karena berjalan di setiap
 * rute termasuk prefetch; pemeriksaan sebenarnya (status aktif, role) ada di lib/server/session.ts.
 */
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublic = PUBLIC_ROUTES.includes(path)
  const hasSessionCookie = getSessionCookie(req)

  if (!hasSessionCookie && !isPublic) {
    const url = new URL("/login", req.nextUrl)
    // Simpan tujuan awal supaya setelah login pengguna kembali ke sana.
    if (path !== "/") url.searchParams.set("next", path)
    return NextResponse.redirect(url)
  }

  // Jangan redirect /login ke / hanya karena cookie ada: cookie kedaluwarsa memicu loop redirect.
  // Sesi di /login dicek oleh app/login/page.tsx.

  // Next tidak memberi path ke layout, padahal perlu untuk hak akses, jadi dititipkan lewat header.
  // `set` menimpa nilai kiriman klien, jadi tidak bisa dipalsukan.
  const forwarded = new Headers(req.headers)
  forwarded.set("x-pathname", path)
  return NextResponse.next({ request: { headers: forwarded } })
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
}
