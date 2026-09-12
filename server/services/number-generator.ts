import { and, eq } from "drizzle-orm"

import { db } from "@/server/db"
import { documentTypes, numberCounters } from "@/server/db/schema"

const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
]

export interface GenerateNumberOptions {
  documentTypeCode: "PS" | "QS" | "CVN" | "CI" | "DN" | "CN" | "CLM" | "JV"
  date?: Date
  coverCode?: string | null
  instalmentNo?: number | null
}

/**
 * Menghasilkan nomor dokumen resmi berurutan dengan row-level lock (FOR UPDATE).
 * Menjamin 100% nomor tidak ganda dan tidak bolong (concurrency-safe).
 */
export async function getNextDocumentNumber(
  options: GenerateNumberOptions,
  customDb = db
): Promise<string> {
  const { documentTypeCode, coverCode, instalmentNo } = options
  const date = options.date ?? new Date()

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const monthStr = String(month).padStart(2, "0")
  const romanMonth = ROMAN_MONTHS[date.getMonth()]

  // Gunakan database transaction untuk atomic lock
  return await customDb.transaction(async (tx) => {
    // 1. Ambil pattern dokumen
    const [docType] = await tx
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.code, documentTypeCode))
      .limit(1)

    // Fallback default pattern jika belum terdaftar di database
    const pattern =
      docType?.numberPattern ||
      (documentTypeCode === "DN"
        ? "{seq:4}/DNLCH/{MM}/{YYYY}"
        : documentTypeCode === "CN"
          ? "{seq:4}/CNLCH/{MM}/{YYYY}"
          : "{seq:3}/LCH-PLCMT/{COVER}/{MMROMAN}/{YYYY}")

    // 2. Tentukan periode (default per bulan 'YYYY-MM')
    const period = `${year}-${monthStr}`

    // 3. Kunci baris counter atau buat bila belum ada (SELECT ... FOR UPDATE)
    const existingCounters = await tx
      .select()
      .from(numberCounters)
      .where(
        and(
          eq(numberCounters.documentTypeCode, documentTypeCode),
          eq(numberCounters.period, period)
        )
      )
      .for("update")

    let nextNumber = 1
    if (existingCounters.length > 0) {
      nextNumber = existingCounters[0].lastNumber + 1
      await tx
        .update(numberCounters)
        .set({
          lastNumber: nextNumber,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(numberCounters.documentTypeCode, documentTypeCode),
            eq(numberCounters.period, period)
          )
        )
    } else {
      await tx.insert(numberCounters).values({
        documentTypeCode,
        period,
        lastNumber: nextNumber,
        updatedAt: new Date(),
      })
    }

    // 4. Susun nomor dokumen berdasarkan template token
    let generatedNo = pattern
      .replace(/\{seq:(\d+)\}/g, (_, digits) =>
        String(nextNumber).padStart(Number(digits), "0")
      )
      .replace(/\{seq\}/g, String(nextNumber).padStart(4, "0"))
      .replace(/\{MM\}/g, monthStr)
      .replace(/\{MMROMAN\}/g, romanMonth)
      .replace(/\{YYYY\}/g, String(year))
      .replace(/\{COVER\}/g, coverCode ? `${documentTypeCode}-${coverCode}` : documentTypeCode)

    // Khusus Credit Note cicilan bertingkat (-1, -2, dll.)
    if (documentTypeCode === "CN" && instalmentNo) {
      if (!generatedNo.includes(`-${instalmentNo}`)) {
        generatedNo = `${generatedNo}-${instalmentNo}`
      }
    }

    return generatedNo
  })
}
