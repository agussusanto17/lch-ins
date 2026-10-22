import type { Prisma } from "@/lib/generated/prisma/client"

/**
 * Penomoran dokumen resmi LCH (PRD A-16).
 *
 * Nomor dibuat saat dokumen di-release atau diterbitkan, bukan saat draft, dan
 * WAJIB diambil di transaksi yang sama dengan penyimpanan dokumen. Kalau
 * penyimpanan gagal, kenaikan counter ikut dibatalkan sehingga nomor tidak
 * bolong. Unique constraint di kolom nomor dokumen tetap jadi pengaman kedua.
 *
 *   await prisma.$transaction(async (tx) => {
 *     const slipNo = await nextDocumentNumber(tx, { code: "PS", coverCode: "PAR" })
 *     await tx.placingSlip.update({ where: { id }, data: { slipNo, status: "Released" } })
 *   })
 */

export type DocumentTypeCode =
  "PS" | "QS" | "CVN" | "CI" | "DN" | "CN" | "CLM" | "JV"

/** Kode lookup reset_period di seed. */
export type ResetPeriodCode = "monthly" | "yearly" | "continuous"

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

/**
 * Tahun dan bulan menurut WIB. Server produksi biasanya berjalan di UTC, jadi
 * dokumen yang terbit pukul 00.00–06.59 WIB tanggal 1 tidak boleh ikut
 * bulan sebelumnya.
 */
export function wibYearMonth(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date)
  const year = Number(parts.find((p) => p.type === "year")?.value)
  const month = Number(parts.find((p) => p.type === "month")?.value)
  return { year, month }
}

/**
 * Kunci periode counter sesuai periode reset jenis dokumen. Nilai yang tidak
 * dikenal dianggap bulanan, sama dengan default seed sambil menunggu LCH.
 */
export function counterPeriod(
  reset: ResetPeriodCode | string,
  { year, month }: { year: number; month: number }
) {
  if (reset === "continuous") return "ALL"
  if (reset === "yearly") return String(year)
  return `${year}-${String(month).padStart(2, "0")}`
}

/**
 * Susun nomor dari pola jenis dokumen. Token yang didukung:
 * {seq:N} atau {seq} (4 digit), {MM}, {MMROMAN}, {YYYY}, dan {COVER}.
 *
 * Bila dokumen tidak punya kode cover, `{COVER}` beserta pemisah di depannya
 * dihapus: `PS-{COVER}` menjadi `PS`, dan `CLM-LCH001/{COVER}/III/2026`
 * menjadi `CLM-LCH001/III/2026`.
 */
export function formatDocumentNumber(
  pattern: string,
  {
    seq,
    year,
    month,
    coverCode,
  }: { seq: number; year: number; month: number; coverCode?: string | null }
) {
  const cover = coverCode?.trim()
  const withCover = cover
    ? pattern.replace(/\{COVER\}/g, cover)
    : pattern.replace(/[-/]?\{COVER\}/g, "")
  return withCover
    .replace(/\{seq(?::(\d+))?\}/g, (_, digits?: string) =>
      String(seq).padStart(Number(digits ?? 4), "0")
    )
    .replace(/\{MMROMAN\}/g, ROMAN_MONTHS[month - 1])
    .replace(/\{MM\}/g, String(month).padStart(2, "0"))
    .replace(/\{YYYY\}/g, String(year))
}

/**
 * Ambil nomor berikutnya untuk satu jenis dokumen.
 *
 * Counter dinaikkan dengan satu statement `INSERT ... ON CONFLICT DO UPDATE`.
 * Statement ini mengunci baris counter sampai transaksi selesai, sama seperti
 * `SELECT ... FOR UPDATE`, dan sekaligus aman saat dua request membuat baris
 * periode baru bersamaan (SELECT FOR UPDATE tidak bisa mengunci baris yang
 * belum ada).
 */
export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  {
    code,
    date = new Date(),
    coverCode,
  }: { code: DocumentTypeCode; date?: Date; coverCode?: string | null }
) {
  const docType = await tx.documentType.findUnique({
    where: { code },
    select: { numberPattern: true, resetPeriod: { select: { code: true } } },
  })
  if (!docType) {
    throw new Error(
      `Jenis dokumen ${code} belum ada di master document_types. Jalankan seed.`
    )
  }

  const { year, month } = wibYearMonth(date)
  const period = counterPeriod(docType.resetPeriod.code, { year, month })

  const [row] = await tx.$queryRaw<{ last_number: number }[]>`
    INSERT INTO number_counters (document_type_code, period, last_number, updated_at)
    VALUES (${code}, ${period}, 1, now())
    ON CONFLICT (document_type_code, period)
    DO UPDATE SET last_number = number_counters.last_number + 1, updated_at = now()
    RETURNING last_number`

  return formatDocumentNumber(docType.numberPattern, {
    seq: row.last_number,
    year,
    month,
    coverCode,
  })
}

/**
 * Nomor Credit Note per cicilan memakai satu nomor dasar yang sama:
 * 0581/CNLCH/08/2026-1, 0581/CNLCH/08/2026-2, dan seterusnya (PRD B-03).
 * Ambil nomor dasar sekali dengan nextDocumentNumber(tx, { code: "CN" }).
 */
export function instalmentNumbers(baseNumber: string, instalmentCount: number) {
  if (!Number.isInteger(instalmentCount) || instalmentCount < 1) {
    throw new Error("Jumlah cicilan minimal 1")
  }
  return Array.from(
    { length: instalmentCount },
    (_, i) => `${baseNumber}-${i + 1}`
  )
}
