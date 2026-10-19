import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"

/**
 * Semua endpoint Better Auth: sign-in, sign-out, dan pembacaan sesi.
 *
 * Endpoint sign-up ikut terpasang di sini, tetapi tidak dipakai: akun dibuat
 * Admin lewat modul Pengguna, bukan lewat pendaftaran mandiri.
 */
export const { GET, POST } = toNextJsHandler(auth)
