import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"

/**
 * Semua endpoint Better Auth: sign-in, sign-out, dan pembacaan sesi.
 * Sign-up ikut terpasang tapi tidak dipakai; akun dibuat Admin lewat modul Pengguna.
 */
export const { GET, POST } = toNextJsHandler(auth)
