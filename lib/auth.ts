import "server-only"

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"

import { prisma } from "./prisma"

/**
 * Konfigurasi Better Auth untuk LCH.
 *
 * Sesi disimpan di tabel `sessions`, bukan di dalam cookie. Cookie hanya
 * membawa token sesi. Pilihan ini diambil supaya sesi bisa dicabut dari sisi
 * server: menonaktifkan pengguna langsung berlaku, tidak menunggu token
 * kedaluwarsa, dan id sesinya bisa ikut dicatat di audit trail.
 *
 * Login hanya lewat email dan kata sandi. Tidak ada pendaftaran mandiri, tidak
 * ada OAuth. Akun dibuat oleh Admin lewat modul Pengguna, karena ini sistem
 * internal untuk sekitar sepuluh orang.
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
    // Sesi berlaku tujuh hari dan diperpanjang kalau dipakai, supaya pengguna
    // tidak logout di tengah kerja. Angka ini dipilih sendiri dan bisa diubah
    // kalau LCH punya kebijakan lain.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  user: {
    // Dua kolom ini sudah ada di tabel users dan dipakai logika aplikasi, bukan
    // oleh Better Auth. `input: false` menutup kemungkinan keduanya diisi dari
    // request, supaya pengguna tidak bisa mengangkat rolenya sendiri.
    additionalFields: {
      roleId: { type: "string", required: true, input: false },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  advanced: {
    database: {
      // Id dibuat Postgres lewat gen_random_uuid(), sama seperti tabel lain di
      // skema ini. Kalau Better Auth yang membuat id, nilainya bukan UUID dan
      // kolom bertipe uuid akan menolak.
      generateId: false,
    },
  },

  // nextCookies harus jadi plugin terakhir supaya cookie dari Server Action
  // ikut terpasang di response.
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
