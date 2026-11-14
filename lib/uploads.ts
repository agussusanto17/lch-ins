/**
 * Batas satu berkas unggahan. Vercel menolak body request di atas 4,5 MB,
 * jadi batasnya dibuat di bawah itu supaya pesan errornya tetap dari aplikasi.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/**
 * Berkas polis (Polis, Premium Note, Commission Note) boleh sampai 25 MB (Agus, 9 November 2026),
 * dikirim per potongan UPLOAD_PART_BYTES karena satu request Vercel maksimal 4,5 MB.
 */
export const MAX_POLICY_FILE_BYTES = 25 * 1024 * 1024

/** Di bawah batas Server Action (5 MB) dan request Vercel (4,5 MB), plus overhead multipart. */
export const UPLOAD_PART_BYTES = 3 * 1024 * 1024

/** Pemakaian berkas. Menentukan menu yang hak aksesnya dipakai saat dibuka. */
export type FilePurpose =
  | "client_document"
  | "claim_document"
  | "policy_file"
  | "slip_attachment"

export const FILE_PURPOSES: FilePurpose[] = [
  "client_document",
  "claim_document",
  "policy_file",
  "slip_attachment",
]

export function maxUploadBytes(purpose: FilePurpose) {
  return purpose === "policy_file" ? MAX_POLICY_FILE_BYTES : MAX_UPLOAD_BYTES
}

/** "Ukuran file maksimal 25 MB." untuk batas yang diberikan. */
export function sizeLimitMessage(maxBytes: number) {
  return `Ukuran file maksimal ${Math.round(maxBytes / (1024 * 1024))} MB.`
}

/** Jenis berkas yang diterima. SVG sengaja tidak, karena bisa berisi skrip. */
export const UPLOAD_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp"

export const UPLOAD_HINT =
  "PDF, JPG, PNG, atau WebP, maksimal 4 MB. Foto yang lebih besar diperkecil otomatis."

export const POLICY_FILE_HINT = "PDF, JPG, PNG, atau WebP, maksimal 25 MB."

/** Workbook Excel, hanya untuk lampiran slip. */
export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** Lampiran slip: jenis umum ditambah Excel (.xlsx). */
export const ATTACHMENT_ACCEPT = `${UPLOAD_ACCEPT},${XLSX_MIME},.xlsx`

export const ATTACHMENT_HINT =
  "PDF, JPG, PNG, WebP, atau Excel (.xlsx), maksimal 4 MB. Foto yang lebih besar diperkecil otomatis."

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
