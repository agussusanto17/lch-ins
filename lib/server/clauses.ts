import "server-only"

import { prisma } from "@/lib/prisma"
import { wordingText } from "@/lib/data/clauses"
import { sanitizeHtml } from "@/lib/sanitize"

/** Pilihan jumlah clause per halaman, sama dengan pilihan di TablePagination. */
const CLAUSE_PAGE_SIZES = [10, 25, 50, 100]

export interface ClauseFilter {
  query?: string
  /** Kelompok produk asal di pustaka LCH: PAR, EQVET, Cargo, dan seterusnya. */
  sourceGroup?: string
  cobId?: string
  /** Hanya clause yang wording-nya belum diisi, misalnya judul hasil impor contoh slip. */
  emptyWording?: boolean
  page?: number
  pageSize?: number
}

export interface ClauseListItem {
  id: string
  title: string
  sourceGroup: string
  wordingHtml: string
  cobName: string | null
  coverTypeName: string | null
  inPackage: boolean
  packageGroup: string | null
}

/** Ubah filter jadi where Prisma. Nilai kosong berarti tidak menyaring. */
function whereFrom(filter: ClauseFilter) {
  const q = filter.query?.trim()
  return {
    isActive: true,
    ...(filter.sourceGroup ? { sourceGroup: filter.sourceGroup } : {}),
    ...(filter.cobId ? { cobId: filter.cobId } : {}),
    ...(filter.emptyWording ? { wordingHtml: "" } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { wordingHtml: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }
}

export async function listClauses(filter: ClauseFilter) {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = CLAUSE_PAGE_SIZES.includes(filter.pageSize ?? 0)
    ? filter.pageSize!
    : CLAUSE_PAGE_SIZES[0]
  const where = whereFrom(filter)

  const [rows, total] = await Promise.all([
    prisma.clause.findMany({
      where,
      orderBy: [{ title: "asc" }, { sourceGroup: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        cob: { select: { name: true } },
        coverType: { select: { name: true } },
      },
    }),
    prisma.clause.count({ where }),
  ])

  const items: ClauseListItem[] = rows.map((c) => ({
    id: c.id,
    title: c.title,
    sourceGroup: c.sourceGroup,
    wordingHtml: c.wordingHtml,
    cobName: c.cob?.name ?? null,
    coverTypeName: c.coverType?.name ?? null,
    inPackage: c.inPackage,
    packageGroup: c.packageGroup,
  }))

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getClause(id: string) {
  return prisma.clause.findUnique({ where: { id } })
}

/** Kelompok produk yang benar-benar ada di database, untuk isi filter. */
export async function listSourceGroups() {
  const rows = await prisma.clause.findMany({
    where: { isActive: true, sourceGroup: { not: "" } },
    distinct: ["sourceGroup"],
    select: { sourceGroup: true },
    orderBy: { sourceGroup: "asc" },
  })
  return rows.map((r) => r.sourceGroup)
}

// Inactive options still used by a clause are kept so filters and forms can show their name.
export async function listCobOptions() {
  return prisma.classOfBusiness.findMany({
    where: { OR: [{ isActive: true }, { clauses: { some: {} } }] },
    select: { id: true, name: true, code: true, isActive: true },
    orderBy: { code: "asc" },
  })
}

export async function listCoverTypeOptions(cobId?: string) {
  return prisma.coverType.findMany({
    where: {
      OR: [{ isActive: true }, { clauses: { some: {} } }],
      ...(cobId ? { cobId } : {}),
    },
    select: { id: true, name: true, code: true, cobId: true, isActive: true },
    orderBy: { code: "asc" },
  })
}

export interface ClauseInput {
  title: string
  wordingHtml: string
  sourceGroup: string
  cobId: string | null
  coverTypeId: string | null
  /** Paket klausul bawaan; tidak dikirim berarti tidak masuk paket. */
  inPackage?: boolean
  packageGroup?: string | null
  packageOrder?: number | null
}

/** Rapikan dan validasi isian sebelum disimpan. */
function normalize(input: ClauseInput) {
  const title = input.title.trim()
  if (!title) throw new Error("Judul clause wajib diisi.")

  // Wording datang dari rich text editor, jadi HTML-nya disanitasi lagi di
  // server. Sanitasi di klien hanya lapis render, bukan pengaman.
  // Wording boleh kosong: banyak klausul marine dan liability di CI LCH hanya
  // dicetak judulnya (analisa contoh slip, 6 November 2026).
  const sanitized = sanitizeHtml(input.wordingHtml).trim()
  const wordingHtml = wordingText(sanitized) ? sanitized : ""

  const packageGroup = input.packageGroup?.trim() ?? ""
  if (packageGroup.length > 200) {
    throw new Error("Kelompok di paket maksimal 200 karakter.")
  }
  const order = Number(input.packageOrder ?? 0)

  return {
    title,
    wordingHtml,
    sourceGroup: input.sourceGroup.trim(),
    cobId: input.cobId || null,
    // Type of cover hanya berarti kalau COB-nya dipilih.
    coverTypeId: (input.cobId && input.coverTypeId) || null,
    // Klausul untuk semua class tidak masuk paket: paketnya per type of cover.
    inPackage: input.inPackage === true && Boolean(input.cobId),
    packageGroup: packageGroup || null,
    packageOrder: Number.isFinite(order)
      ? Math.min(9999, Math.max(0, Math.round(order)))
      : 0,
  }
}

export async function createClause(input: ClauseInput) {
  const data = normalize(input)
  const duplicate = await prisma.clause.findUnique({
    where: {
      title_sourceGroup: { title: data.title, sourceGroup: data.sourceGroup },
    },
  })
  if (duplicate) {
    throw new Error(
      data.sourceGroup
        ? `Clause "${data.title}" sudah ada di kelompok ${data.sourceGroup}.`
        : `Clause "${data.title}" sudah ada.`
    )
  }
  return prisma.clause.create({ data })
}

export async function updateClause(id: string, input: ClauseInput) {
  const data = normalize(input)
  const duplicate = await prisma.clause.findUnique({
    where: {
      title_sourceGroup: { title: data.title, sourceGroup: data.sourceGroup },
    },
  })
  if (duplicate && duplicate.id !== id) {
    throw new Error(
      `Clause "${data.title}" sudah ada di kelompok ${data.sourceGroup || "tanpa kelompok"}.`
    )
  }
  return prisma.clause.update({ where: { id }, data })
}

/**
 * Clause yang sudah dipakai slip tidak dihapus, cukup dinonaktifkan, supaya
 * slip lama tetap bisa ditelusuri ke masternya.
 */
export async function deleteClause(id: string) {
  const used = await prisma.slipClause.count({ where: { clauseId: id } })
  if (used > 0) {
    await prisma.clause.update({ where: { id }, data: { isActive: false } })
    return { deactivated: true, used }
  }
  await prisma.clause.delete({ where: { id } })
  return { deactivated: false, used: 0 }
}
