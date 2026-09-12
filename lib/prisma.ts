import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/prisma/client"

/**
 * Satu instance PrismaClient untuk seluruh aplikasi.
 *
 * Prisma 7 wajib memakai driver adapter, jadi koneksinya lewat PrismaPg.
 * Di dev, Next.js memuat ulang modul setiap kali file berubah, jadi instance
 * disimpan di globalThis supaya koneksi ke Postgres tidak menumpuk.
 *
 * Instance dibuat saat pertama kali dipakai, bukan saat modul diimpor. Next.js
 * mengimpor modul halaman saat build untuk membaca konfigurasinya, dan server
 * build tidak punya DATABASE_URL. Kalau client dibuat di level modul, build
 * gagal padahal tidak ada query yang dijalankan.
 */

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diisi. Lihat .env.example.")
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

let client: ReturnType<typeof createPrismaClient> | undefined

function getPrismaClient() {
  if (!client) {
    client = globalForPrisma.prisma ?? createPrismaClient()
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client
  }
  return client
}

export const prisma = new Proxy({} as ReturnType<typeof createPrismaClient>, {
  get: (_target, property) => Reflect.get(getPrismaClient(), property),
})
