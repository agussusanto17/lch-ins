import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

import { PUBLIC_ROUTES } from "@/lib/access"

/**
 * Di Next 16 berkas ini menggantikan middleware.
 *
 * Isinya sengaja hanya pemeriksaan optimistis: ada tidaknya cookie sesi.
 * Proxy berjalan di setiap rute, termasuk yang di-prefetch, jadi tidak boleh
 * menyentuh database. Pemeriksaan yang sebenarnya, termasuk status aktif dan
 * hak akses role, ada di lib/server/session.ts.
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

  // Catatan: jangan redirect otomatis dari rute publik (/login) ke / di sini
  // hanya berdasarkan keberadaan cookie. Jika cookie tersebut stale/kedaluwarsa,
  // layout aplikasi akan melempar kembali ke /login sehingga terjadi loop redirect tak terbatas.
  // Pengecekan sesi yang valid untuk /login didelegasikan ke app/login/page.tsx via currentUser().

  // Layout aplikasi perlu tahu path yang diminta untuk memeriksa hak akses,
  // dan Next tidak memberikannya ke layout. Jadi path dititipkan lewat header.
  // `set` menimpa nilai yang mungkin dikirim klien, jadi tidak bisa dipalsukan.
  const forwarded = new Headers(req.headers)
  forwarded.set("x-pathname", path)
  return NextResponse.next({ request: { headers: forwarded } })
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
}
