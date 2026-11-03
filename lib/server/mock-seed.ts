/**
 * Data contoh dari `lib/data` hanya boleh masuk ke database di luar produksi.
 * Tanpa guard ini, tabel produksi yang dikosongkan akan terisi data contoh lagi
 * saat daftarnya dibuka.
 */
export function shouldSeedMockData() {
  return process.env.NODE_ENV !== "production"
}
