/** Batas total per berkas; seluruh modul mengirim berkas per potongan. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

/** Di bawah batas Server Action (5 MB) dan request Vercel (4,5 MB), plus overhead multipart. */
export const UPLOAD_PART_BYTES = 3 * 1024 * 1024
export const MAX_PENDING_UPLOAD_PARTS = 51

/** Pemakaian berkas. Menentukan menu yang hak aksesnya dipakai saat dibuka. */
export type FilePurpose =
  | "client_document"
  | "claim_document"
  | "policy_file"
  | "slip_attachment"
  | "signature"

export const FILE_PURPOSES: FilePurpose[] = [
  "client_document",
  "claim_document",
  "policy_file",
  "slip_attachment",
  "signature",
]

/**
 * Gambar tanda tangan dan cap dimuat di setiap halaman cetak dokumen penutupan, jadi dibatasi
 * kecil. Gambar 400 × 130 piksel cukup tajam untuk dicetak setinggi 1,5 cm.
 */
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024

export function maxUploadBytes(purpose: FilePurpose) {
  if (!FILE_PURPOSES.includes(purpose)) {
    throw new Error("Jenis berkas tidak dikenal.")
  }
  return purpose === "signature" ? MAX_SIGNATURE_BYTES : MAX_UPLOAD_BYTES
}

/** Pesan ukuran berkas untuk batas yang diberikan. */
export function sizeLimitMessage(maxBytes: number) {
  return `Ukuran file maksimal ${Math.round(maxBytes / (1024 * 1024))} MB.`
}

/** Jenis berkas yang diterima. SVG sengaja tidak, karena bisa berisi skrip. */
export const UPLOAD_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp"

export const UPLOAD_HINT =
  "PDF, JPG, PNG, atau WebP, maksimal 50 MB. Foto yang lebih besar diperkecil otomatis."

/** Gambar tanda tangan: tanpa PDF, karena dicetak sebagai gambar di blok tanda tangan. */
export const SIGNATURE_ACCEPT = "image/png,image/jpeg,image/webp"

export const SIGNATURE_HINT =
  "PNG berlatar transparan disarankan, sekitar 400 × 130 piksel, maksimal 2 MB."

/** Pemeriksaan gambar tanda tangan di browser; server memeriksa ulang dari isinya. */
export function signatureUploadProblem(file: { size: number; type: string }) {
  if (!SIGNATURE_ACCEPT.split(",").includes(file.type)) {
    return "Hanya gambar PNG, JPG, atau WebP yang bisa diunggah."
  }
  if (file.size > MAX_SIGNATURE_BYTES) return sizeLimitMessage(MAX_SIGNATURE_BYTES)
  return null
}

/** Workbook Excel, hanya untuk lampiran slip. */
export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** Lampiran slip: jenis umum ditambah Excel (.xlsx). */
export const ATTACHMENT_ACCEPT = `${UPLOAD_ACCEPT},${XLSX_MIME},.xlsx`

export const ATTACHMENT_HINT =
  "PDF, JPG, PNG, WebP, atau Excel (.xlsx), maksimal 50 MB. Foto yang lebih besar diperkecil otomatis."

/** Pemeriksaan lampiran slip di browser; server memeriksa ulang dari isinya. */
export function attachmentUploadProblem(file: {
  name: string
  size: number
  type: string
}) {
  const excel = file.type === XLSX_MIME || /\.xlsx$/i.test(file.name)
  if (!excel && !UPLOAD_ACCEPT.split(",").includes(file.type)) {
    return "Hanya PDF, JPG, PNG, WebP, atau Excel (.xlsx) yang bisa diunggah."
  }
  if (file.size > MAX_UPLOAD_BYTES) return sizeLimitMessage(MAX_UPLOAD_BYTES)
  return null
}

/**
 * Pemeriksaan di browser sebelum berkas dikirim, supaya pengguna langsung
 * tahu. Server memeriksa ulang jenisnya dari isi file.
 */
export function uploadProblem(
  file: { size: number; type: string },
  maxBytes = MAX_UPLOAD_BYTES
) {
  if (!UPLOAD_ACCEPT.split(",").includes(file.type)) {
    return "Hanya PDF, JPG, PNG, atau WebP yang bisa diunggah."
  }
  if (file.size > maxBytes) return sizeLimitMessage(maxBytes)
  return null
}

/**
 * Gabungkan potongan unggahan menjadi satu isi berkas. Potongan harus lengkap
 * dan berurutan 0 sampai `expected - 1`, dan totalnya tidak melebihi batas.
 */
export function joinUploadParts(
  parts: { partNo: number; data: Uint8Array }[],
  expected: number,
  maxBytes: number
): Uint8Array<ArrayBuffer> {
  const sorted = [...parts].sort((a, b) => a.partNo - b.partNo)
  if (
    !Number.isInteger(expected) ||
    expected < 1 ||
    sorted.length !== expected ||
    sorted.some((p, i) => p.partNo !== i)
  ) {
    throw new Error("Unggahan tidak lengkap. Pilih ulang filenya lalu simpan lagi.")
  }
  const size = sorted.reduce((sum, p) => sum + p.data.byteLength, 0)
  if (size > maxBytes) throw new Error(sizeLimitMessage(maxBytes))
  const joined = new Uint8Array(size)
  let offset = 0
  for (const p of sorted) {
    joined.set(p.data, offset)
    offset += p.data.byteLength
  }
  return joined
}
