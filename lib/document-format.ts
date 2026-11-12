/**
 * Format dan utilitas parsing teks untuk dokumen cetak LCH Insurance Brokers.
 *
 * Mendeteksi bullet marker (- • * – —) dan penomoran (1. 1) a. a) (1) (a) i.)
 * untuk tata letak hanging indent (indentasi gantung), sehingga saat teks membungkus
 * (wrap) ke baris berikutnya, teks sejajar rapi dengan awal kalimat bukan di bawah
 * simbol/nomor butir.
 */

export const BULLET_LINE_REGEX =
  /^(\((?:[a-zA-Z]|[ivxIVX]{1,4}|\d{1,3})\)\.?|(?:[a-zA-Z]|[ivxIVX]{1,4}|\d{1,3})[).]|[-•*–—])\s+(.+)$/

export interface ParsedBulletLine {
  marker: string
  content: string
}

/**
 * Mengurai baris teks tunggal. Jika diawali tanda butir atau nomor urut,
 * mengembalikan marker dan content secara terpisah untuk hanging indent.
 */
export function parseBulletLine(line: string): ParsedBulletLine | null {
  const match = BULLET_LINE_REGEX.exec(line.trim())
  if (!match) return null
  return {
    marker: match[1],
    content: match[2],
  }
}

export interface NumberedItem {
  /** Nomor butir seperti "1)" atau "2."; null untuk baris sebelum nomor pertama. */
  marker: string | null
  lines: string[]
}

/**
 * Mengelompokkan teks per butir bernomor (1) 1. (1)). Baris tanpa nomor
 * sesudah sebuah nomor ikut butir itu, misalnya nama lokasi dan alamat di
 * bawah nama tertanggung pada Risk Location. Baris kosong dibuang.
 */
export function groupNumberedItems(text: string): NumberedItem[] {
  const items: NumberedItem[] = []
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const parsed = parseBulletLine(line)
    if (parsed && /\d/.test(parsed.marker)) {
      items.push({ marker: parsed.marker, lines: [parsed.content] })
    } else if (items.length) {
      items[items.length - 1].lines.push(line)
    } else {
      items.push({ marker: null, lines: [line] })
    }
  }
  return items
}
