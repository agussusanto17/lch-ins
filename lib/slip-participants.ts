/**
 * Daftar peserta PA grup per orang (jawaban Harry, 6 November 2026): dicetak
 * sebagai lampiran seperti tabel Excel, dan disimpan satu per satu supaya
 * klaim dan endorsement bisa menunjuk, menambah, atau mengurangi peserta.
 * Contoh LCH: Placing Slip PA Salam Pacific (1.627 peserta) dan CI PA
 * ekspatriat (satu peserta dengan nomor paspor).
 */
import type { ClassOfBusiness, LineItem, SlipParticipant } from "./data/types"

/** Batas daftar peserta dan panjang isian teks, sama dengan server. */
export const PARTICIPANT_LIMITS = { rows: 5000, text: 200 }

/** Id baris Interest Insured yang diisi dari daftar peserta. */
export const PARTICIPANTS_ITEM_ID = "peserta"

/** COB yang memakai daftar peserta: General Accident (Personal Accident). */
export function usesParticipants(cob: ClassOfBusiness) {
  return cob === "General Accident"
}

type TextKey = "name" | "idNumber" | "gender" | "position" | "level" | "workLocation" | "beneficiary"

/** Kolom template Excel dan lampiran, urut seperti lampiran contoh LCH. */
export const PARTICIPANT_COLUMNS: {
  key: TextKey | "birthDate" | "sumInsured"
  header: string
  /** Judul kolom lain yang juga dikenali saat impor. */
  aliases: string[]
  required?: boolean
}[] = [
  { key: "name", header: "Nama", aliases: ["nama peserta", "name", "insured name"], required: true },
  { key: "idNumber", header: "No. Identitas", aliases: ["nik", "no identitas", "no. ktp", "passport", "passport no", "no. paspor", "paspor"] },
  { key: "birthDate", header: "Tanggal Lahir", aliases: ["tgl lahir", "tgl. lahir", "dob", "date of birth"] },
  { key: "gender", header: "Jenis Kelamin", aliases: ["kelamin", "gender", "sex"] },
  { key: "position", header: "Jabatan", aliases: ["occupation", "position"] },
  { key: "level", header: "Level Jabatan", aliases: ["level", "plan", "grade"] },
  { key: "workLocation", header: "Lokasi Kerja", aliases: ["lokasi", "cabang", "location"] },
  { key: "sumInsured", header: "Sum Insured", aliases: ["uang pertanggungan", "up", "sum insured (idr)", "sum insured (per participant)", "tsi"], required: true },
  { key: "beneficiary", header: "Ahli Waris", aliases: ["beneficiary"] },
]

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[*:]/g, "").trim()

/** Total sum insured semua peserta. */
export function participantsTotal(list: readonly Pick<SlipParticipant, "sumInsured">[]) {
  return list.reduce((sum, p) => sum + (p.sumInsured || 0), 0)
}

/** Usia penuh pada tanggal tertentu, misalnya tanggal mulai polis. */
export function participantAge(birthDate: string | null | undefined, at: string | null | undefined) {
  if (!birthDate || !at) return null
  const [by, bm, bd] = birthDate.split("-").map(Number)
  const [ay, am, ad] = at.split("-").map(Number)
  if (!by || !ay) return null
  let age = ay - by
  if (am < bm || (am === bm && ad < bd)) age -= 1
  return age >= 0 ? age : null
}

const pad = (n: number) => String(n).padStart(2, "0")
const iso = (y: number, m: number, d: number) => {
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? `${y}-${pad(m)}-${pad(d)}`
    : null
}

/**
 * Tanggal dari sel Excel: objek Date, angka seri Excel, "DD/MM/YYYY", atau
 * "YYYY-MM-DD". Tanggal dengan dua bagian ambigu dibaca DD/MM; bila bagian
 * pertama tidak mungkin hari, dibaca MM/DD (contoh LCH mencampur keduanya).
 */
export function parseParticipantDate(value: unknown): string | null {
  if (value == null || value === "") return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : iso(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())
  }
  if (typeof value === "number") {
    // Angka seri Excel: hari sejak 30 Desember 1899.
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000)
    return iso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  }
  const text = String(value).trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]))
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(text)
  if (!m) return null
  let [a, b] = [Number(m[1]), Number(m[2])]
  let year = Number(m[3])
  if (year < 100) year += year > 30 ? 1900 : 2000
  if (b > 12 && a <= 12) [a, b] = [b, a]
  return iso(year, b, a)
}

/** Angka dari sel Excel, termasuk teks "75,000,000.00" atau "75.000.000". */
export function parseParticipantAmount(value: unknown): number | null {
  if (value == null || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  let text = String(value).replace(/[^\d.,-]/g, "")
  if (!/\d/.test(text)) return null
  const commas = text.split(",").length - 1
  const dots = text.split(".").length - 1
  if (commas && dots) {
    // Pemisah terakhir adalah desimal, yang lain pemisah ribuan.
    const decimal = text.lastIndexOf(",") > text.lastIndexOf(".") ? "," : "."
    text = text.replaceAll(decimal === "," ? "." : ",", "").replace(decimal, ".")
  } else if (commas || dots) {
    const sep = commas ? "," : "."
    const count = commas || dots
    const after = text.length - text.lastIndexOf(sep) - 1
    // Lebih dari satu, atau satu dengan tiga digit di belakangnya: ribuan.
    text = count > 1 || after === 3 ? text.replaceAll(sep, "") : text.replace(sep, ".")
  }
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/** Jenis kelamin dirapikan ke "Pria" atau "Wanita"; isian lain apa adanya. */
export function normalizeGender(value: unknown) {
  const text = String(value ?? "").trim()
  const key = text.toLowerCase()
  if (["l", "lk", "laki-laki", "laki laki", "pria", "m", "male"].includes(key)) return "Pria"
  if (["p", "pr", "perempuan", "wanita", "f", "female"].includes(key)) return "Wanita"
  return text
}

/** Teks sel Excel: teks biasa, rich text, hyperlink, atau hasil rumus. */
const cellText = (value: unknown): string => {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "object") {
    const v = value as { richText?: { text: string }[]; text?: unknown; result?: unknown }
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("").trim()
    if ("text" in v) return String(v.text ?? "").trim()
    if ("result" in v) return cellText(v.result)
  }
  return String(value).trim()
}

const cellValue = (value: unknown) =>
  value && typeof value === "object" && !(value instanceof Date) && "result" in (value as object)
    ? (value as { result: unknown }).result
    : value

/**
 * Peserta dari baris sheet Excel. Baris pertama yang memuat kolom Nama dan Sum
 * Insured dipakai sebagai judul; baris kosong dilewati. Kesalahan per baris
 * dikumpulkan dengan nomor baris Excel-nya, supaya daftar diperbaiki dulu.
 */
export function participantsFromRows(rows: unknown[][], newId: (index: number) => string) {
  const errors: string[] = []
  const headerIndex = rows.findIndex((row) => {
    const names = row.map((c) => norm(cellText(c)))
    return names.some((n) => matches(n, "name")) && names.some((n) => matches(n, "sumInsured"))
  })
  if (headerIndex < 0) {
    return { participants: [] as SlipParticipant[], errors: ["Kolom Nama dan Sum Insured tidak ditemukan. Pakai template peserta."] }
  }
  const header = rows[headerIndex].map((c) => norm(cellText(c)))
  const columnOf = new Map(
    PARTICIPANT_COLUMNS.map((col) => [col.key, header.findIndex((h) => matches(h, col.key))])
  )
  const participants: SlipParticipant[] = []
  rows.slice(headerIndex + 1).forEach((row, i) => {
    const excelRow = headerIndex + i + 2
    const get = (key: (typeof PARTICIPANT_COLUMNS)[number]["key"]) => {
      const index = columnOf.get(key) ?? -1
      return index < 0 ? undefined : row[index]
    }
    const texts = PARTICIPANT_COLUMNS.map((c) => cellText(get(c.key)))
    if (texts.every((t) => !t)) return
    const name = cellText(get("name"))
    const amount = parseParticipantAmount(cellValue(get("sumInsured")))
    const rawDate = cellValue(get("birthDate"))
    const birthDate = parseParticipantDate(rawDate)
    if (!name) errors.push(`Baris ${excelRow}: Nama kosong.`)
    if (amount == null || amount <= 0) errors.push(`Baris ${excelRow}: Sum Insured harus angka lebih dari 0.`)
    if (rawDate != null && rawDate !== "" && !birthDate)
      errors.push(`Baris ${excelRow}: Tanggal lahir "${cellText(rawDate)}" tidak dikenali.`)
    const text = (key: TextKey) => cellText(get(key)).slice(0, PARTICIPANT_LIMITS.text) || undefined
    participants.push({
      id: newId(participants.length),
      name: name.slice(0, PARTICIPANT_LIMITS.text),
      idNumber: text("idNumber"),
      birthDate,
      gender: normalizeGender(get("gender")) || undefined,
      position: text("position"),
      level: text("level"),
      workLocation: text("workLocation"),
      sumInsured: amount ?? 0,
      beneficiary: text("beneficiary"),
    })
  })
  if (participants.length > PARTICIPANT_LIMITS.rows) {
    errors.push(`Peserta maksimal ${PARTICIPANT_LIMITS.rows.toLocaleString("id-ID")} orang.`)
  }
  if (!participants.length && !errors.length) errors.push("Tidak ada peserta di file.")
  return { participants, errors }
}

function matches(header: string, key: (typeof PARTICIPANT_COLUMNS)[number]["key"]) {
  const col = PARTICIPANT_COLUMNS.find((c) => c.key === key)!
  return [col.header, ...col.aliases].some((name) => {
    const n = norm(name)
    return header === n || header.startsWith(`${n} (`)
  })
}

/**
 * Baris Interest Insured dari daftar peserta: satu baris, nilai total UP.
 * Peserta tunggal tidak punya lampiran, jadi barisnya "Sum Insured (per
 * PID)" seperti CI PA ekspatriat LCH (Harry, 7 November 2026).
 */
export function participantsInterestItem(
  list: readonly Pick<SlipParticipant, "sumInsured">[]
): LineItem {
  const n = list.length
  return {
    id: PARTICIPANTS_ITEM_ID,
    description:
      n === 1 ? "Sum Insured (per PID)" : `${n.toLocaleString("id-ID")} participants as attached`,
    amount: participantsTotal(list),
  }
}

/** Tanggal ISO menjadi DD/MM/YYYY, sama dengan lampiran peserta. */
export const participantDateText = (iso: string | null | undefined) =>
  iso ? iso.split("-").reverse().join("/") : ""

/**
 * Isi baris "PID / Insured Name" untuk slip dengan satu peserta, mengikuti CI
 * PA ekspatriat LCH: nama, nomor identitas atau paspor, tanggal lahir, dan
 * jabatan. Isian kosong tidak dicetak; beneficiary tetap di Detail tambahan.
 */
export function participantPidText(p: SlipParticipant) {
  return [
    ["Name", p.name.trim()],
    ["ID / Passport No.", p.idNumber?.trim()],
    ["Date of Birth", participantDateText(p.birthDate)],
    ["Occupation", p.position?.trim()],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label} : ${value}`)
    .join("\n")
}

/**
 * Isian peserta yang wajib sebelum release: nama dan sum insured setiap
 * peserta. Hanya untuk COB yang memakai daftar peserta.
 */
export function participantIssues(slip: {
  cob: ClassOfBusiness
  participants?: readonly Pick<SlipParticipant, "name" | "sumInsured">[]
}): string[] {
  if (!usesParticipants(slip.cob) || !slip.participants?.length) return []
  const missing = slip.participants
    .map((p, i) => (!p.name.trim() || !(p.sumInsured > 0) ? i + 1 : 0))
    .filter(Boolean)
  if (!missing.length) return []
  const shown = missing.slice(0, 5).join(", ")
  return [
    `Isi nama dan sum insured peserta nomor ${shown}${missing.length > 5 ? ` dan ${missing.length - 5} lainnya` : ""}.`,
  ]
}
