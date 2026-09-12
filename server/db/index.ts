import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"

const connectionString =
  process.env.DATABASE_URL || "postgresql://zero@localhost:5432/lch_db"

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

const client = globalForDb.conn ?? postgres(connectionString, { max: 10 })
if (process.env.NODE_ENV !== "production") globalForDb.conn = client

export const db = drizzle(client, { schema })
export type Database = typeof db
export * from "./schema"
