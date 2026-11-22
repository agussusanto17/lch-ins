/**
 * Tanda data produksi dobel di report (Agus, 22 November 2026): data tetap ditulis apa adanya,
 * tapi polis yang kemungkinan tercatat dua kali diberi tanda supaya user bisa mengecek.
 *
 * Dua aturan:
 * - No. polis sama dipakai lebih dari satu data.
 * - Isi sama dengan nomor polis berbeda: tipe, tertanggung, COB, asuransi, tanggal mulai dan
 *   berakhir, mata uang, dan premi sama, misalnya polis sementara dari CI yang juga diinput manual.
 *   Bagian PAR dan EQVET satu slip, dan perubahan di bawah polis induk berbeda, tidak dianggap
 *   sama. Data berpremi 0 (polis induk MOP tanpa premi deposit) tidak dicek isinya.
 */

export interface DuplicateCandidate {
  policyNo: string
  type: string
  insuredName: string
  cob: string
  inceptionDate: string
  expiryDate: string
  currency: string
  premium: number
  /** Asuransi leader. */
  insurer?: string | null
  /** Bagian slip PAR + EQVET. */
  slipPart?: string | null
  /** Polis induk untuk endorsement, pembatalan, dan deklarasi. */
  parent?: string | null
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toUpperCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim()

function contentKey(p: DuplicateCandidate) {
  if (!p.premium) return ""
  return [
    p.type,
    norm(p.insuredName),
    norm(p.cob),
    norm(p.insurer),
    p.inceptionDate,
    p.expiryDate,
    p.currency,
    p.premium.toFixed(2),
    p.slipPart ?? "",
    norm(p.parent),
  ].join("|")
}

function group(keys: readonly string[]) {
  const map = new Map<string, number[]>()
  keys.forEach((key, i) => {
    if (!key) return
    const list = map.get(key)
    if (list) list.push(i)
    else map.set(key, [i])
  })
  return map
}

/** Tanda per data, urutannya sama dengan `items`; string kosong berarti tidak dobel. */
export function duplicateFlags(items: readonly DuplicateCandidate[]): string[] {
  const numbers = items.map((p) => norm(p.policyNo))
  const contents = items.map(contentKey)
  const byNo = group(numbers)
  const byContent = group(contents)
  return items.map((_, i) => {
    const notes: string[] = []
    const sameNo = byNo.get(numbers[i]) ?? []
    if (sameNo.length > 1) notes.push(`No. polis sama dipakai ${sameNo.length} data`)
    const others = [
      ...new Set(
        (byContent.get(contents[i]) ?? [])
          .filter((j) => numbers[j] !== numbers[i])
          .map((j) => items[j].policyNo)
      ),
    ]
    if (others.length) notes.push(`isi sama dengan ${others.join(", ")}`)
    return notes.length ? `DOBEL? ${notes.join("; ")}` : ""
  })
}
