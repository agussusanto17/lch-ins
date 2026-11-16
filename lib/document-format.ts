/**
 * Bullet (- • * – —) dan penomoran (1. 1) a. a) (1) (a) i.) dikenali untuk hanging indent,
 * supaya baris yang membungkus sejajar dengan awal kalimat, bukan di bawah nomornya.
 */

export const BULLET_LINE_REGEX =
  /^(\((?:[a-zA-Z]|[ivxIVX]{1,4}|\d{1,3})\)\.?|(?:[a-zA-Z]|[ivxIVX]{1,4}|\d{1,3})[).]|[-•*–—])\s+(.+)$/

export interface ParsedBulletLine {
  marker: string
  content: string
}

/** Pisahkan marker butir atau nomor dari isinya untuk hanging indent; null bila bukan butir. */
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
 * Kelompokkan teks per butir bernomor; baris tanpa nomor ikut butir sebelumnya, misalnya alamat
 * di bawah nama tertanggung pada Risk Location. Baris kosong dibuang.
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

/** Nomor di awal baris wording: 1. 1) 2.1 2.1.3 (a) a. (iv) iv. Tanggal seperti "29 April" bukan. */
const WORDING_MARKER =
  /^((?:\s|&nbsp;)*)(\d{1,2}(?:\.\d{1,2}){1,3}\.?|\d{1,3}[.)]|\((?:\d{1,3}|[a-zA-Z]|[ivxIVX]{1,4})\)|(?:[a-zA-Z]|[ivxIVX]{1,4})[.)])(?:\s|&nbsp;)+/

/**
 * Wording klausula dari editor: satu paragraf berisi baris-baris `<br>`. Baris bernomor dipecah
 * jadi butir sendiri dengan hanging indent; baris tanpa nomor ikut butir sebelumnya (LCH, LMA 5397).
 * Input harus sudah disanitasi; paragraf tanpa baris bernomor dibiarkan apa adanya.
 */
export function hangNumberedWording(html: string): string {
  return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (whole, attrs = "", inner: string) => {
    const groups: { marker: string | null; lines: string[] }[] = []
    for (const line of inner.split(/<br\s*\/?>/i)) {
      const match = WORDING_MARKER.exec(line)
      if (match) {
        groups.push({ marker: match[2], lines: [line.slice(match[0].length)] })
      } else if (groups.length) {
        groups[groups.length - 1].lines.push(line)
      } else {
        groups.push({ marker: null, lines: [line] })
      }
    }
    if (!groups.some((g) => g.marker)) return whole
    return groups
      .map((g, i) => {
        const hang = i === 0 ? "first" : "cont"
        const body = g.lines.join("<br>")
        return g.marker
          ? `<p data-hang="${hang}"${attrs}><span data-hang-marker>${g.marker}</span>` +
              `<span data-hang-body>${body}</span></p>`
          : `<p${attrs}>${body}</p>`
      })
      .join("")
  })
}
