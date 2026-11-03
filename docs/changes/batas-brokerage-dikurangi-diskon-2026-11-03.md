# Batas brokerage OJK dikurangi diskon, ditolak saat disimpan

- **Tanggal:** 2026-11-03
- **Branch:** `fix/batas-brokerage-dikurangi-diskon`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Setelah PR #91 ([brokerage-cetak-sesuai-input-2026-11-03.md](brokerage-cetak-sesuai-input-2026-11-03.md)),
arahan 2 November "Motor Vehicle 25% dikurangi diskon" ditanyakan ke Harry
(Request & Temuan REQ-012). Jawabannya, 3 November 2026:

- batas OJK berlaku untuk brokerage ditambah diskon: Motor Vehicle 25%,
  Property 15%. COB lain tidak diatur OJK;
- brokerage yang diisi di slip adalah komisi broker, sudah termasuk PPN kalau
  Include VAT aktif. Contohnya: diskon 5% dan brokerage 10% incl. VAT diisi apa
  adanya;
- MV dengan diskon 15% berarti brokerage maksimal 10%. Property dengan diskon
  7,5% berarti maksimal 7,5%;
- slip yang brokeragenya melebihi batas tidak boleh bisa disimpan sampai
  brokeragenya diperbaiki.

Sebelumnya tiga pengecekan batas (peringatan di form, pengecekan release di
form, dan validasi release di server) hanya membandingkan brokerage dengan 25%
atau 15% tanpa diskon, jadi MV diskon 15% dengan brokerage 25% lolos. Peringatan
di form juga memakai brokerage sebelum PPN, sedangkan pengecekan release
memakai angka yang diisi. Batas juga baru diperiksa saat release, bukan saat
slip disimpan.

## Yang berubah

- Brokerage maksimal adalah batas OJK (MV 25%, Property 15%) dikurangi diskon
  slip, minimal 0. COB lain tidak dibatasi.
- Yang dibandingkan adalah brokerage yang diisi di slip, di semua tempat.
- Ketiga pengecekan memakai rumus dan pesan yang sama, misalnya "Brokerage 15%
  melebihi batas OJK untuk Property: maksimal 10% (15% dikurangi diskon 5%)."
- Simpan slip ditolak dengan pesan itu, termasuk Simpan Draft, simpan sebelum
  dokumen atau Quotation dibuka, dan simpan di halaman Quotation.
- Di bagian Brokerage form slip MV dan Property selalu tampil keterangan batas,
  misalnya "Batas OJK untuk Motor Vehicle: maksimal 10% (25% dikurangi diskon
  15%)". Kalau dilampaui, keterangan itu menjadi peringatan merah bahwa slip
  belum bisa disimpan.
- `getMaxBrokeragePct` dan `brokerageExceedsCap` di `lib/server/tariffs.ts`
  dihapus. Penggantinya `maxBrokeragePct`, `brokerageLimitText`, dan
  `brokerageLimitIssue` di `lib/calc.ts`, yang dipakai form dan server.

## File utama

- `lib/calc.ts`: rumus batas dan teks pesannya.
- `app/(app)/underwriting/actions.ts`: penolakan di `savePlacingSlipAction`
  dan pesan saat release.
- `lib/server/tariffs.ts`: validasi release di server.
- `components/underwriting/slip-model.ts`: pengecekan release di form.
- `components/underwriting/placing-slip-form.tsx`: keterangan dan peringatan
  batas di bagian Brokerage.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.
- Slip yang sudah ada dengan brokerage melebihi batas baru, misalnya MV
  brokerage 25% dengan diskon 15%, tidak bisa disimpan lagi, termasuk dari
  halaman Quotation, sampai brokeragenya diperbaiki di form slip.

## Verifikasi

- Skrip lokal memanggil pengecekan release form (`releaseIssues`) dan server
  (`validatePlacingSlipForRelease`) untuk slip MV, Property, dan Marine Cargo.
  Hasil keduanya selalu sama:

  | Kasus | Hasil |
  |---|---|
  | MV diskon 15%, brokerage 10% | lolos |
  | MV diskon 15%, brokerage 12% atau 25% | ditolak, maksimal 10% |
  | MV diskon 5%, brokerage 20% | lolos |
  | MV diskon 5%, brokerage 10% incl. VAT | lolos |
  | MV tanpa diskon, brokerage 26% | ditolak, maksimal 25% |
  | MV diskon 12,3%, brokerage 12,7% | lolos, tanpa salah pembulatan |
  | Property diskon 7,5%, brokerage 7,5% | lolos |
  | Property diskon 7,5%, brokerage 8% | ditolak, maksimal 7,5% |
  | Property diskon 5%, brokerage 15% incl. VAT | ditolak, maksimal 10% |
  | Marine Cargo brokerage 30% | lolos, tanpa batas |

- Penolakan di `savePlacingSlipAction` memanggil fungsi yang sama
  (`brokerageLimitIssue`). Tidak diuji lewat browser karena butuh login.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Form polis tidak punya isian diskon, jadi batas brokerage polis tetap 25% atau
  15% tanpa pengurangan.
- Duplikat slip tetap membuat draft walaupun brokerage sumbernya melebihi batas;
  draft itu baru bisa disimpan setelah brokeragenya diperbaiki.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
