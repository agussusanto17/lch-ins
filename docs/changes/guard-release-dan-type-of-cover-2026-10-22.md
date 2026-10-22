# Guard Release Placing Slip di Server dan Penyimpanan Type of Cover

- **Tanggal:** 2026-10-22
- **Branch:** `fix/release-guard-type-of-cover`
- **Dikerjakan oleh:** ZoD3V dengan Claude Code
- **Lanjutan dari:** [rate-engine-ojk-2026-10-22.md](rate-engine-ojk-2026-10-22.md),
  [implementasi-placing-slip-postgres-2026-10-21.md](implementasi-placing-slip-postgres-2026-10-21.md)

## Latar belakang

Kelengkapan release placing slip, termasuk alasan untuk rate di luar batas
OJK, hanya dicek di form. `releasePlacingSlipAction` langsung merilis slip
apa pun yang dikirim, sehingga request yang dibuat manual bisa melewati cek.

Saat guard di server diuji terhadap data di database, setiap slip gagal
dengan "Pilih type of cover." Penyebabnya: form menyimpan type of cover
sebagai label bebas (misal "PAR + EQVET"), sedangkan database hanya
menyimpan `cover_type_id` ke master `cover_types`. Label form tidak ada yang
cocok dengan nama di master, jadi FK selalu kosong dan label hilang setiap
kali slip disimpan. Kode cover pada nomor slip (`PS-PAREQ`) juga hilang untuk
slip yang dirilis lewat database.

## Yang berubah

- `releasePlacingSlipAction` memanggil `releaseIssues()` dari
  `components/underwriting/slip-model.ts`, fungsi yang sama dengan yang
  dipakai form. Aturan release tetap di satu tempat.
- Kolom baru `placing_slips.type_of_cover` menyimpan label dari form.
  `cover_type_id` tetap diisi bila label cocok dengan master.
- `coverCode` dan kode pada nomor slip resmi diturunkan dari label lewat
  `coverCodeFor()`, sama seperti di form.
- Migrasi `20261022140000_slip_type_of_cover` menambah kolom dan mengisi
  ulang label untuk lima slip seed yang sudah bernomor.
- `scripts/check-release-guard.ts`: uji round-trip ke database lokal.

## Keputusan

- Batas brokerage dan BI rate tidak ikut memblokir release. Di form keduanya
  hanya peringatan. Selain itu, `validateBiRateScaling` di
  `lib/server/tariffs.ts` membandingkan BI EQVET dengan FLEXAS, padahal BI
  EQVET dihitung dari rate EQVET, sehingga memblokir dengan aturan itu akan
  menolak slip yang valid.

## Dampak

- **Database:** migrasi baru, jalankan `npm run db:deploy`.
- **Env:** tidak ada.
- **Deploy:** jalankan migrasi produksi sebelum atau bersamaan dengan
  deploy. Tanpa kolom `type_of_cover`, query placing slip akan gagal.
- Draft yang disimpan sebelum perubahan ini sudah kehilangan label type of
  cover. Pengguna perlu memilih ulang sebelum release.

## Verifikasi

- `node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/check-release-guard.ts`:
  semua PASS. Slip Released lolos guard, label dan `coverCode` bertahan
  setelah simpan, slip tanpa cover ditolak, dan nomor rilis memuat
  `PS-PAREQ`. Script ini memakai satu nomor urut dokumen di database lokal.
- `npx tsc --noEmit` dan `npm run build` lolos.

## Catatan untuk yang melanjutkan

- `validateBiRateScaling` perlu diperiksa ulang terhadap aturan BI OJK
  sebelum dipakai untuk memblokir release.
