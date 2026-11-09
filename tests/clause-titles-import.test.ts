import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const ROOT = join(import.meta.dirname, "..")

/** CSV sederhana dengan kolom berkutip dan kutip ganda di dalamnya. */
function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += ch
  }
  if (field || row.length) rows.push([...row, field])
  const [header, ...body] = rows.filter((r) => r.some(Boolean))
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])))
}

const titles = parseCsv(
  readFileSync(join(ROOT, "prisma/seed-data/judul-klausul-contoh-slip.csv"), "utf8")
)
const covers = parseCsv(readFileSync(join(ROOT, "prisma/seed-data/cob-toc.csv"), "utf8"))
const migration = readFileSync(
  join(ROOT, "prisma/migrations/20261109180000_impor_judul_klausul_contoh_slip/migration.sql"),
  "utf8"
)

test("judul klausul contoh slip: seed dan migrasi berisi daftar yang sama", () => {
  assert.ok(titles.length > 300)
  const tuples = migration.split("\n").filter((l) => /^\s+\('/.test(l))
  assert.equal(tuples.length, titles.length)
  for (const t of titles) {
    const sqlTitle = t.judul_klausul.replace(/'/g, "''")
    assert.ok(migration.includes(`('${sqlTitle}', '${t.kelompok}', '${t.kode_cob}',`), t.judul_klausul)
  }
})

test("judul klausul contoh slip: rapi, tidak kembar, COB dan TOC valid", () => {
  const cobOfToc = new Map(covers.map((c) => [c.kode_toc, c.kode_cob]))
  const cobs = new Set(covers.map((c) => c.kode_cob))
  const seen = new Set<string>()
  for (const t of titles) {
    const title = t.judul_klausul
    assert.equal(title, title.trim(), title)
    assert.doesNotMatch(title, /[.:]$/, title)
    assert.equal((title.match(/\(/g) ?? []).length, (title.match(/\)/g) ?? []).length, title)
    assert.ok(cobs.has(t.kode_cob), `${title}: COB ${t.kode_cob}`)
    if (t.kode_toc) assert.equal(cobOfToc.get(t.kode_toc), t.kode_cob, `${title}: TOC ${t.kode_toc}`)
    const key = `${t.kelompok}|${title.toLowerCase()}`
    assert.ok(!seen.has(key), `kembar: ${key}`)
    seen.add(key)
  }
})
