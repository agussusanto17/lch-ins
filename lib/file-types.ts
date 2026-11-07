/**
 * Jenis berkas unggahan dibaca dari byte awalnya, bukan dari keterangan
 * browser yang bisa dipalsukan. Dipakai server saat menyimpan berkas.
 */

export const PDF_TYPE = "application/pdf"
export const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** Jenis yang aman dibuka langsung di browser; jenis lain selalu diunduh. */
export const INLINE_TYPES = [PDF_TYPE, "image/png", "image/jpeg", "image/webp"]

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b)

/** Teks ASCII muncul di isi berkas, misalnya nama entri di dalam ZIP. */
function containsAscii(bytes: Uint8Array, text: string) {
  const needle = Array.from(text, (c) => c.charCodeAt(0))
  const first = needle[0]
  for (let i = bytes.indexOf(first); i >= 0 && i <= bytes.length - needle.length; i = bytes.indexOf(first, i + 1)) {
    if (needle.every((b, j) => bytes[i + j] === b)) return true
  }
  return false
}

/**
 * PDF, PNG, JPEG, WebP, atau workbook Excel (.xlsx). Workbook dikenali dari
 * tanda ZIP dan entri xl/workbook.xml, jadi dokumen Word atau ZIP biasa tidak
 * lolos. Null untuk jenis lain.
 */
export function detectContentType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return PDF_TYPE
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png"
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp"
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && containsAscii(bytes, "xl/workbook.xml")) {
    return XLSX_TYPE
  }
  return null
}
