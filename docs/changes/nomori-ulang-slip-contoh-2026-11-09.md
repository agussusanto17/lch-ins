# Nomori ulang slip data contoh

- **Tanggal:** 2026-11-09
- **Branch:** `fix/nomori-ulang-slip-contoh`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Aturan nomor dokumen dari Agus (9 November 2026):
  - running nomor dipakai bersama semua COB dalam satu bulan;
  - hanya bagian belakangnya yang beda per COB, misalnya `PS-MV` atau
    `PS-PAREQ`;
  - tiap tanggal 1 (WIB) mulai dari 001 lagi.
- Penomoran slip sudah begitu sejak awal: counter `number_counters` dikunci
  per jenis dokumen per bulan, misalnya `PS` + `2026-11`. Di demo, November
  sudah urut lintas COB: 002 MV, 003 PAREQ, 004 MB, 005 PSAKI.
- Yang membuat daftar terlihat dipisah per COB adalah slip data contoh.
  - Nomornya ditulis tangan di `lib/data/slips.ts` dengan bulan VII dan VIII,
    tidak lewat counter.
  - Contohnya `002/LCH-PLCMT/PS-PAREQ/VIII/2026` di demo, yang tampil di
    samping `002/LCH-PLCMT/PS-MV/XI/2026`.
- Agus meminta slip contoh itu dinomori ulang.

## Yang berubah

- **Migrasi `20261109190000_nomori_ulang_slip_contoh`** menomori ulang kelima
  nomor data contoh:
  - `001/LCH-PLCMT/PS/VIII/2026`
  - `002/LCH-PLCMT/PS-PAREQ/VIII/2026`
  - `003/LCH-PLCMT/PS-MC/VIII/2026`
  - `004/LCH-PLCMT/PS-CAR/VII/2026`
  - `005/LCH-PLCMT/PS-IAR/VIII/2026`
- **Aturannya:**
  - Nomor baru adalah nomor berikutnya dari counter bulan saat slip itu
    di-release, atau saat dibuat bila belum pernah di-release.
  - Nomornya menyambung setelah nomor yang sudah terpakai di bulan itu, dan
    counter ikut naik.
  - Kode cover tetap.
  - Hanya nomor yang bulannya tidak cocok dengan bulan rilisnya yang diubah.
    Nomor slip lain tidak disentuh.
  - Nomor yang sudah dipakai slip lain dilewati.
  - Pola nomor dan periode reset dibaca dari master `document_types`.
- **Nomor QS, CI, dan Cover Note** diturunkan dari nomor PS saat dokumen
  dibuka, jadi ikut berubah.
- **Seed slip contoh** (`seedInitialSlipsIfEmpty`, hanya di luar produksi)
  sekarang mengambil nomor dari counter bulan berjalan. Database baru tidak
  lagi membuat nomor VII/VIII.

## File utama

- `prisma/migrations/20261109190000_nomori_ulang_slip_contoh/migration.sql`.
- `lib/server/placing-slips.ts`: `seedInitialSlipsIfEmpty` dan
  `coverCodeOfSlipNo`.

## Dampak

- **Database:** hanya `placing_slips.slip_no` slip data contoh dan
  `number_counters` bulan rilisnya. Tidak ada perubahan skema.
  - Di demo, slip `002/LCH-PLCMT/PS-PAREQ/VIII/2026` mendapat nomor
    berikutnya di bulan rilisnya.
  - Hasilnya tercatat sebagai NOTICE di log build.
- **Riwayat:** perubahan lewat migrasi tidak tercatat di Audit Trail. Nomor
  lama tetap ada di catatan audit slip sebelumnya.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan otomatis saat build, di Vercel dan VPS.

## Verifikasi

- `npx tsc --noEmit`, eslint `lib/server/placing-slips.ts`, dan
  `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 122 lolos.
- **Dry-run di transaksi yang di-rollback, lalu migrasi sungguhan di database
  lokal:**
  - kelima slip contoh (dibuat 29 Oktober) menjadi `003/…/PS/X/2026` sampai
    `007/…/PS-IAR/X/2026`, menyambung setelah `001/…/PS-PL/X/2026` dan
    `002/…/PS-SIT/X/2026`;
  - counter Oktober naik dari 2 ke 7;
  - nomor November tidak berubah.
- **Database sementara dari nol** (dibuat lalu dihapus): seed slip contoh
  menghasilkan `001/…/PS/XI/2026` sampai `005/…/PS-IAR/XI/2026`, dengan
  counter November 5.
- **Uji browser lokal:**
  - daftar Placement menampilkan kelima nomor baru, tanpa nomor VII/VIII;
  - Quotation Slip slip MC bernomor `005/LCH-PLCMT/QS-MC/X/2026`.

## Catatan untuk yang melanjutkan

- Slip PSAKI di demo bernomor `005/LCH-PLCMT/PS/XI/2026` tanpa kode cover,
  karena type of cover PSAKI belum punya singkatan di Master Data. LCH bisa
  mengisinya di Master Data > COB & Cover Type.
- Nomor `001/…/XI/2026` di demo tidak ada di daftar. Kemungkinan slip uji yang
  sudah dihapus. Counter tidak memakai ulang nomor yang sudah terpakai.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
