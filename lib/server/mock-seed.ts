/** Data contoh `lib/data` hanya di-seed di luar produksi, supaya tabel produksi yang kosong tetap kosong. */
export function shouldSeedMockData() {
  return process.env.NODE_ENV !== "production"
}
