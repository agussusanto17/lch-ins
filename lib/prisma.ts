import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/prisma/client"

/**
 * Satu instance PrismaClient untuk seluruh aplikasi.
 *
 * Prisma 7 wajib memakai driver adapter, jadi koneksinya lewat PrismaPg.
 * Di dev, Next.js memuat ulang modul setiap kali file berubah, jadi instance
 * disimpan di globalThis supaya koneksi ke Postgres tidak menumpuk.
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
