/**
 * Fallback ke variabel integrasi Prisma Postgres Vercel (prefix `lch_`) bila DATABASE_URL kosong.
 * Hanya `postgres(ql)://` diterima karena PrismaPg tersambung lewat TCP; Accelerate dilewati.
 */

const CANDIDATES = [
  "DATABASE_URL",
  "lch_POSTGRES_URL",
  "lch_PRISMA_DATABASE_URL",
  "POSTGRES_URL",
] as const

const DIRECT_URL = /^postgres(ql)?:\/\//i

/** Kunci sslmode ke `verify-full`; mulai pg v9, `require` tidak lagi memverifikasi sertifikat. */
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
