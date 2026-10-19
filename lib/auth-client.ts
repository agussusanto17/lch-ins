"use client"

import { createAuthClient } from "better-auth/react"

/**
 * Klien Better Auth untuk komponen browser. Hanya dipakai halaman login dan
 * tombol keluar; selebihnya sesi dibaca di server lewat lib/server/session.ts.
 */
export const authClient = createAuthClient()

export const { signIn, signOut, useSession } = authClient
