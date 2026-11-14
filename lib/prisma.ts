import { PrismaPg } from "@prisma/adapter-pg"

import { DATABASE_URL_CANDIDATES, databaseUrl } from "./database-url"
import { PrismaClient } from "./generated/prisma/client"

/**
 * Instance disimpan di globalThis supaya koneksi Postgres tidak menumpuk saat hot reload dev.
 * Dibuat saat pertama dipakai, karena build mengimpor modul halaman tanpa DATABASE_URL.
 */

function createPrismaClient() {
  const connectionString = databaseUrl()
  if (!connectionString) {
    throw new Error(
      `Connection string Postgres belum diisi. Isi salah satu dari ${DATABASE_URL_CANDIDATES.join(", ")}. Lihat .env.example.`
    )
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
