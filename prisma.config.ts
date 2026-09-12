import { defineConfig, env } from "prisma/config"

/**
 * Konfigurasi Prisma 7. Connection string tidak lagi ditulis di schema.prisma,
 * jadi tempatnya di sini.
 *
 * Isi DATABASE_URL di .env, contoh ada di .env.example:
 * DATABASE_URL="postgresql://lch:password@localhost:5432/lch_dev?schema=public"
 */

// Next.js memuat .env sendiri, tapi Prisma CLI tidak. Tanpa ini perintah
// seperti `prisma validate` gagal dengan "Cannot resolve environment variable".
// Di server produksi env-nya sudah ada, jadi kalau .env tidak ada ya dilewat.
try {
  process.loadEnvFile(".env")
} catch {
  // .env tidak ada, pakai env yang sudah ada di shell.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    // Seed belum ada. Nanti diisi lookup_values yang is_system, mata uang,
    // COB, dan tarif OJK dari CSV hasil ekstraksi SE OJK.
  },
})
