/**
 * Sanitizer allowlist untuk wording klausula yang diketik lewat rich text editor.
 *
 * Cakupannya sengaja sempit: hanya tag yang bisa dihasilkan TipTap StarterKit,
 * seluruh atribut dibuang kecuali `href` pada `<a>` (http/https/mailto saja) dan
 * `style` berisi `text-align` saja pada paragraf dan sub-judul.
 *
 * CATATAN untuk fase backend: sanitasi tetap harus dilakukan di server dengan
 * pustaka matang (DOMPurify / sanitize-html) sebelum wording disimpan. Fungsi
 * ini adalah pertahanan lapis render, bukan pengganti validasi di server.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "code",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
])

/** Blok yang bisa diratakan lewat tombol perataan di editor klausula. */
const ALIGNABLE_TAGS = new Set(["p", "h2", "h3"])

/** Style hanya diterima bila isinya satu deklarasi text-align yang dikenal. */
const TEXT_ALIGN_STYLE =
  /^\s*text-align\s*:\s*(left|center|right|justify)\s*;?\s*$/i

/** http/https/mailto, anchor, atau path internal. `//domain` (protocol-relative) ditolak. */
const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/(?!\/))/i

export function sanitizeHtml(html: string) {
  return (
    html
      // Buang blok yang tidak boleh dieksekusi beserta isinya.
      .replace(
        /<(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1>/gi,
        ""
      )
      // Buang komentar (bisa menyembunyikan conditional comment).
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(
        /<\/?([a-zA-Z0-9-]+)([^>]*)>/g,
        (match, rawTag: string, attrs: string) => {
          const tag = rawTag.toLowerCase()
          if (!ALLOWED_TAGS.has(tag)) return ""
          if (match.startsWith("</")) return `</${tag}>`

          if (tag === "a") {
            const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(
              attrs
            )
            const value = href?.[2] ?? href?.[3] ?? href?.[4] ?? ""
            if (value && SAFE_HREF.test(value.trim())) {
              const safe = value.trim().replace(/"/g, "&quot;")
              return `<a href="${safe}" rel="noopener noreferrer">`
            }
            return "<a>"
          }

          if (ALIGNABLE_TAGS.has(tag)) {
            const style = /\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs)
            const align = TEXT_ALIGN_STYLE.exec(style?.[2] ?? style?.[3] ?? "")
            if (align) {
              return `<${tag} style="text-align: ${align[1].toLowerCase()}">`
            }
          }

          // Semua tag lain dirender tanpa atribut sama sekali.
          return `<${tag}>`
        }
      )
  )
}
