import "server-only"

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { APIError } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"

import { prisma } from "./prisma"

/**
 * Sesi disimpan di tabel `sessions` (cookie hanya membawa token) supaya bisa dicabut dari server.
 * Login hanya email dan kata sandi; akun dibuat Admin lewat modul Pengguna, tanpa sign-up/OAuth.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    // Pendaftaran mandiri dimatikan lewat rute, bukan di sini: endpoint sign-up
    // Better Auth tidak diekspos ke klien dan pembuatan akun lewat modul Admin.
    autoSignIn: false,
    minPasswordLength: 10,
  },

  session: {
    // Diperpanjang kalau dipakai supaya pengguna tidak logout di tengah kerja.
    // Tujuh hari dipilih sendiri, bukan kebijakan LCH.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  user: {
    // `input: false` mencegah kolom diisi dari request klien, supaya pengguna tidak bisa
    // mengangkat rolenya sendiri.
    additionalFields: {
      roles: {
        type: "string[]",
        required: false,
        defaultValue: [],
        input: false,
      },
      jobTitle: { type: "string", required: false, input: false },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      roleId: { type: "string", required: false, input: false },
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Akun nonaktif ditolak di sini; tanpa hook, browser bolak-balik ke /login (SIT-003).
        // Jalan setelah kata sandi cocok, jadi pesannya tidak membuka keberadaan akun.
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          })
          if (!user?.isActive) {
            throw APIError.from("FORBIDDEN", {
              code: "ACCOUNT_INACTIVE",
              message: "Akun ini sudah dinonaktifkan.",
            })
          }
        },
      },
    },
  },

  advanced: {
    database: {
      // Id dibuat Postgres (gen_random_uuid()); id Better Auth bukan UUID dan ditolak kolom uuid.
      generateId: false,
    },
  },

  // nextCookies harus jadi plugin terakhir supaya cookie dari Server Action
  // ikut terpasang di response.
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
