# Nomor klaim per COB dan nilai klaim di Statistik Klaim Per COB

- **Tanggal:** 2026-11-19
- **Branch:** `feat/klaim-per-cob`
- **PR:** #<nomor>
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Masukan Team LCH (lewat Agus, 19 November 2026), dengan screenshot report Statistik Klaim:

- **Nomor registrasi klaim per COB.** Contoh mereka: MV CLM-LCH001/MV/XI/2026, 002/MV, dan seterusnya; PAR CLM-LCH001/PAR/XI/2026, 002/PAR, dan seterusnya.
  - Sebelumnya semua COB berbagi satu counter bulanan, jadi nomor di sheet Daftar Klaim loncat antar COB: 003/MV, 004/MV, 006/PAR, 007/PAR, 008/PL.
- **Nilai klaim di tabel Per COB.** Tabel Per COB di sheet Ringkasan perlu tiga kolom tambahan: estimasi kerugian, nilai diajukan, dan nilai disetujui/dibayarkan.

## Yang berubah

- **Nomor klaim otomatis berurutan per COB**, yaitu per kode cover di nomornya (MV, PAR, PL, MC, dan seterusnya).
  - Counter klaim memakai kunci periode `<periode>/<kode>` di `number_counters`, misalnya `2026-11/MV`.
  - Periode reset tetap bulanan, mengikuti jenis dokumen CLM. Mulai bulan baru, setiap kode mulai lagi dari 001.
  - Klaim dari polis tanpa kode cover tetap memakai counter bulanan bersama, dengan format nomor tanpa kode.
  - Nomor otomatis yang ternyata sudah dipakai, misalnya karena diketik manual, dilewati. Setelah 50 percobaan, sistem meminta Nomor Klaim diisi manual.
  - Placing Slip dan dokumen lain tidak berubah: satu urutan untuk semua COB.
- **Nomor klaim lama tidak diubah.** Migrasi mengisi counter per kode dari nomor klaim yang sudah ada, jadi klaim baru tidak bentrok.
  - Di bulan November 2026, nomor baru melanjutkan nomor terbesar per kode. Dengan data di screenshot, berikutnya MV 005, PAR 008, dan PL 009.
  - Mulai Desember 2026, setiap kode mulai dari 001.
- **Statistik Klaim (menu Report), sheet Ringkasan:**
  - tabel Per COB mendapat kolom Estimasi Kerugian, Nilai Diajukan, dan Nilai Disetujui/Dibayar setelah kolom Total, beserta totalnya;
  - nilainya dalam IDR dengan kurs tetap report, sama dengan tabel Per status;
  - tabel Per asuransi dan Per tahapan dokumen tidak berubah.

## File utama

- `server/services/number-generator.ts`: `counterKey` dan opsi `perCover` di `nextDocumentNumber` dan `previewDocumentNumber`.
- `lib/server/claims.ts`: `nextClaimNo` memakai counter per COB dan melewati nomor yang sudah dipakai.
- Migrasi `20261119170000_nomor_klaim_per_cob`: counter per kode dari nomor klaim yang ada.
- `lib/claim-statistics.ts`: `claimStatusPivot` ikut menjumlah nilai klaim; tabel Per COB menulis kolom nilainya.
- `tests/nomor-klaim-per-cob.test.ts` (baru) dan `tests/claim-statistics.test.ts`.

## Dampak

- **Database:** migrasi `20261119170000_nomor_klaim_per_cob` hanya menambah baris `number_counters` untuk CLM. Tidak ada perubahan skema dan tidak ada nomor klaim yang diubah.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 354 lolos.
  - Test baru: kunci counter per kode dan nomor 001 per COB.
  - Test Statistik Klaim: nilai per COB dan kolom H sampai J di tabel Per COB.
- **Migrasi di DB lokal:** dari klaim CLM-LCH001/PA, 002/MV, dan 003/MV, counter `2026-11/MV` = 3 dan `2026-11/PA` = 1.
  - Query parsing yang sama diuji dengan nomor dari screenshot. Hasilnya MV 4, PAR 7, dan PL 8.
  - Format lama (CLM/2026/08/0031), nomor tanpa kode, dan bulan tidak valid diabaikan.
- **`createClaim` di DB lokal:**
  - Dua klaim MV dapat 004/MV dan 005/MV, dua klaim PAR dapat 001/PAR dan 002/PAR.
  - Setelah 003/PAR diketik manual, klaim PAR berikutnya otomatis dapat 004/PAR.
  - Sesudahnya klaim uji, audit, dan counter dikembalikan.
- **Statistik Klaim dari data lokal:** tabel Per COB menampilkan nilai per COB, dan totalnya cocok dengan jumlah barisnya.

## Catatan untuk yang melanjutkan

- **Klaim November 2026 tidak dinomori ulang.** Nomornya sudah tercatat di produksi dan mungkin sudah dipakai di surat ke asuransi. Kalau LCH ingin klaim lama ikut mulai dari 001 per COB, itu perubahan data sekali jalan yang perlu dikonfirmasi dulu, termasuk menyesuaikan counter per kode.
- **Kunci counter** `<periode>/<kode>` hanya dipakai klaim (`perCover: true`). Kalau dokumen lain nanti perlu berurutan per COB, cukup kirim `perCover: true` dan isi counternya dari nomor yang sudah ada.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
