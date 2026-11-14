/**
 * Kelompok klausul berjudul di slip tanpa section, misalnya EXTENSIONS (analisa contoh slip LCH,
 * 6 November 2026). Klausul sekelompok selalu berdampingan, nomornya mulai 1 di tiap kelompok.
 */

/** Judul kelompok yang sering dipakai contoh slip LCH, sebagai saran. */
export const CLAUSE_GROUP_SUGGESTIONS = [
  "Main Conditions",
  "Extensions",
  "General Conditions",
  "Compulsory Clauses",
  "Warranties",
  "Special Conditions",
]

/** Panjang judul kelompok, sama dengan batas di server. */
export const CLAUSE_GROUP_TITLE_MAX = 200

export type ClauseGroups = Record<string, string>

/** Judul kelompok sebuah klausul; kosong berarti tanpa judul. */
export function clauseGroupOf(groups: ClauseGroups | undefined, id: string) {
  return groups?.[id]?.trim() ?? ""
}

export interface ClauseGroupBlock {
  /** Kosong berarti kelompok tanpa judul. */
  title: string
  ids: string[]
}

/** Klausul per kelompok, menurut urutan kemunculan pertama kelompoknya. */
export function clauseGroupBlocks(
  ids: string[],
  groups: ClauseGroups | undefined
): ClauseGroupBlock[] {
  const blocks: ClauseGroupBlock[] = []
  for (const id of ids) {
    const title = clauseGroupOf(groups, id)
    const block = blocks.find((b) => b.title === title)
    if (block) block.ids.push(id)
    else blocks.push({ title, ids: [id] })
  }
  return blocks
}

/** Urutan klausul dengan klausul sekelompok berdampingan. */
export function groupedClauseOrder(
  ids: string[],
  groups: ClauseGroups | undefined
) {
  return clauseGroupBlocks(ids, groups).flatMap((b) => b.ids)
}

/** Slip punya minimal satu kelompok berjudul. */
export function hasClauseGroups(
  ids: string[],
  groups: ClauseGroups | undefined
) {
  return ids.some((id) => clauseGroupOf(groups, id) !== "")
}

/**
 * Peta kelompok yang disimpan: hanya klausul terpilih dengan judul tidak
 * kosong, dirapikan dan dipotong sesuai batas. Undefined bila tidak ada.
 */
export function cleanClauseGroups(
  ids: string[],
  groups: ClauseGroups | undefined
): ClauseGroups | undefined {
  const entries = ids.flatMap((id) => {
    const title = clauseGroupOf(groups, id).slice(0, CLAUSE_GROUP_TITLE_MAX)
    return title ? [[id, title] as const] : []
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}

function withGroup(groups: ClauseGroups | undefined, id: string, title: string) {
  const next = { ...(groups ?? {}) }
  if (title.trim()) next[id] = title
  else delete next[id]
  return next
}

/**
 * Pindahkan klausul ke kelompok lain: klausul ditaruh di akhir kelompok
 * tujuan, atau di akhir daftar bila kelompoknya baru.
 */
export function moveClauseToGroup(
  ids: string[],
  groups: ClauseGroups | undefined,
  id: string,
  title: string
): { ids: string[]; groups: ClauseGroups } {
  const nextGroups = withGroup(groups, id, title)
  const rest = ids.filter((x) => x !== id)
  const target = title.trim()
  const last = rest.map((x) => clauseGroupOf(nextGroups, x)).lastIndexOf(target)
  const nextIds = [...rest]
  nextIds.splice(last < 0 ? rest.length : last + 1, 0, id)
  return { ids: groupedClauseOrder(nextIds, nextGroups), groups: nextGroups }
}

/** Ganti judul satu kelompok untuk semua klausulnya. */
export function renameClauseGroup(
  ids: string[],
  groups: ClauseGroups | undefined,
  from: string,
  to: string
): ClauseGroups {
  let next = { ...(groups ?? {}) }
  for (const id of ids) {
    if (clauseGroupOf(groups, id) === from) next = withGroup(next, id, to)
  }
  return next
}

/** Geser klausul satu langkah di dalam kelompoknya. */
export function moveClause(
  ids: string[],
  groups: ClauseGroups | undefined,
  id: string,
  by: -1 | 1
) {
  const blocks = clauseGroupBlocks(ids, groups)
  for (const block of blocks) {
    const i = block.ids.indexOf(id)
    if (i < 0) continue
    const j = i + by
    if (j < 0 || j >= block.ids.length) return ids
    ;[block.ids[i], block.ids[j]] = [block.ids[j], block.ids[i]]
  }
  return blocks.flatMap((b) => b.ids)
}

/** Geser satu kelompok beserta klausulnya satu langkah. */
export function moveClauseGroup(
  ids: string[],
  groups: ClauseGroups | undefined,
  title: string,
  by: -1 | 1
) {
  const blocks = clauseGroupBlocks(ids, groups)
  const i = blocks.findIndex((b) => b.title === title)
  const j = i + by
  if (i < 0 || j < 0 || j >= blocks.length) return ids
  ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
  return blocks.flatMap((b) => b.ids)
}

/** Klausul master dengan isian paket klausul bawaan. */
export interface PackageClause {
  id: string
  title: string
  inPackage?: boolean
  packageGroup?: string | null
  packageOrder?: number
}

/**
 * Klausul paket yang belum terpasang, urut paket lalu judul. `fitting`: master yang cocok dengan
 * COB dan type of cover slip; `exclude`: klausul yang sudah dipilih di kelompok mana pun.
 */
export function packageToInstall<T extends PackageClause>(
  fitting: T[],
  exclude: Iterable<string>
): T[] {
  const skip = new Set(exclude)
  return fitting
    .filter((c) => c.inPackage && !skip.has(c.id))
    .sort(
      (a, b) =>
        (a.packageOrder ?? 0) - (b.packageOrder ?? 0) ||
        a.title.localeCompare(b.title)
    )
}

/**
 * Pasang klausul paket di akhir daftar. Bila daftar memakai kelompok, tiap
 * klausul masuk kelompok paketnya, dan klausul sekelompok tetap berdampingan.
 */
export function installPackage(
  ids: string[],
  groups: ClauseGroups | undefined,
  items: PackageClause[],
  grouping: boolean
): { ids: string[]; groups: ClauseGroups | undefined } {
  const added = items.map((c) => c.id).filter((id) => !ids.includes(id))
  if (!grouping) return { ids: [...ids, ...added], groups }
  const next = { ...(groups ?? {}) }
  for (const c of items) {
    const title = c.packageGroup?.trim()
    if (title && added.includes(c.id)) next[c.id] = title
  }
  return { ids: groupedClauseOrder([...ids, ...added], next), groups: next }
}
