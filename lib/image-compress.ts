/**
 * Kompres foto di browser sebelum diunggah. Foto dari kamera HP biasanya
 * 4–8 MB, di atas batas 4 MB berkas klien, klaim, dan lampiran slip. Setelah
 * diperkecil sisi terpanjangnya dan disimpan ulang sebagai JPEG, ukurannya
 * biasanya di bawah 1 MB dan teks di foto dokumen tetap terbaca.
 *
 * PDF dan Excel tidak disentuh: PDF umumnya sudah terkompres, dan
 * mengompresnya berarti menurunkan kualitas cap atau tanda tangan.
 */

/** Gambar di bawah ukuran ini dikirim apa adanya. */
export const COMPRESS_MIN_BYTES = 1024 * 1024

/** Sisi terpanjang hasil kompres, cukup untuk dicetak di A4 (~240 dpi). */
export const COMPRESS_MAX_SIDE = 2000

/** Kualitas JPEG hasil kompres. */
export const COMPRESS_QUALITY = 0.8

const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp"]

/** Ukuran gambar setelah diperkecil supaya sisi terpanjang <= maxSide. */
export function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** "foto KTP.png" menjadi "foto KTP.jpg". */
export function jpegFileName(name: string) {
  return /\.[^./\\]+$/.test(name) ? name.replace(/\.[^./\\]+$/, ".jpg") : `${name}.jpg`
}

/** Perlu dicoba kompres: foto JPG, PNG, atau WebP di atas 1 MB. */
export function shouldCompress(file: { size: number; type: string }) {
  return COMPRESSIBLE.includes(file.type) && file.size > COMPRESS_MIN_BYTES
}

/**
 * Foto besar diperkecil dan disimpan ulang sebagai JPEG. Berkas lain, atau
 * kalau hasilnya tidak lebih kecil atau browser gagal membaca gambarnya,
 * dikembalikan apa adanya supaya unggahan tetap jalan.
 */
export async function compressImage(file: File): Promise<File> {
  if (!shouldCompress(file)) return file
  try {
    // Orientasi EXIF ikut diterapkan, jadi foto HP tidak terbalik.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    const { width, height } = fitWithin(bitmap.width, bitmap.height, COMPRESS_MAX_SIDE)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    // JPEG tidak punya transparansi: latar PNG transparan dibuat putih.
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", COMPRESS_QUALITY)
    )
    if (!blob || blob.size >= file.size) return file
    return new File([blob], jpegFileName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}
