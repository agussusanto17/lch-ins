/**
 * Connection string Postgres untuk Prisma.
 *
 * `DATABASE_URL` dipakai lebih dulu (lokal dan server sendiri). Kalau kosong,
 * pakai variabel yang dibuat integrasi Prisma Postgres di Vercel. Integrasi di
 * project ini memakai prefix `lch_`, jadi namanya `lch_POSTGRES_URL` dan
 * `lch_PRISMA_DATABASE_URL`, bukan `DATABASE_URL`. Tanpa fallback ini halaman
 * yang membaca database gagal di Vercel walaupun databasenya sudah tersambung.
 *
 * Hanya URL `postgres://` atau `postgresql://` yang diterima, karena client
 * memakai driver adapter PrismaPg yang tersambung langsung lewat TCP. URL
 * Accelerate (`prisma+postgres://`) dilewati.
 */

const CANDIDATES = [
  "DATABASE_URL",
  "lch_POSTGRES_URL",
  "lch_PRISMA_DATABASE_URL",
  "POSTGRES_URL",
] as const

const DIRECT_URL = /^postgres(ql)?:\/\//i

/**
 * `sslmode=require` (bawaan URL integrasi Vercel) saat ini diperlakukan driver
 * `pg` sebagai `verify-full`, tapi di pg v9 akan melemah jadi mode libpq yang
 * tidak memverifikasi sertifikat. Dikunci ke `verify-full` supaya koneksi ke
 * database cloud tetap memeriksa sertifikat server.
 */
function withVerifiedSsl(url: string) {
  return url.replace(
    /([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i,
    "$1verify-full"
  )
}

export function databaseUrl(env: NodeJS.ProcessEnv = process.env) {
  for (const name of CANDIDATES) {
    const value = env[name]?.trim()
    if (value && DIRECT_URL.test(value)) return withVerifiedSsl(value)
  }
  return undefined
}

/** Nama variabel yang dicari, untuk pesan error. */
export const DATABASE_URL_CANDIDATES = CANDIDATES
