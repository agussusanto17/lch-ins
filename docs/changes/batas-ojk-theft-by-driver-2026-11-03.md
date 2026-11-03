# Batas OJK Theft by Driver dan pengecekan release per COB

- **Tanggal:** 2026-11-03
- **Branch:** `fix/batas-ojk-theft-by-driver`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry menanyakan batas 0,5% pada baris **Theft by Driver** di slip Motor
Vehicle: rate 0,1% ditandai di bawah batas OJK dan wajib diberi alasan
(Request & Temuan REQ-010).

Tarif perluasan kendaraan di SE OJK 6/SEOJK.05/2017 Lampiran IV.B tidak
mengatur Theft by Driver. Isinya hanya banjir, gempa, SRCC, terorisme, TJH, dan
kecelakaan diri pengemudi serta penumpang. Pencocokan label ke tarif OJK
membaca kata "driver" sebagai kecelakaan diri pengemudi (PA Pengemudi, 0,5%).
Rate 0,1% justru sesuai klausula library LCH "Klausula Penggelapan (Theft by
Driver), add rate 0.1% of Sum Insured".

Saat ditelusuri, ada masalah kedua di pengecekan release form slip. Baris yang
belum punya batas dicocokkan lagi dengan tarif perluasan kendaraan, apa pun
COB-nya. Di slip Property, FWTWD, BI PAR, EQVET, dan BI EQVET dibandingkan
dengan tarif banjir dan gempa kendaraan (persen, bukan permil). Akibatnya
release tertahan dengan pesan "di luar batas OJK", termasuk untuk baris BI yang
tidak dibatasi server.

## Yang berubah

- Batas kecelakaan diri hanya dicocokkan kalau label baris rate menyebut PA,
  personal accident, atau kecelakaan diri. Theft by Driver tidak punya batas
  OJK lagi, jadi tidak ada peringatan dan alasan tidak wajib.
- Baris di bagian PA slip, yang berlabel "Driver" dan "Passenger", tetap memakai
  batas PA Pengemudi 0,5% dan PA Penumpang 0,1% lewat `findMotorPaBounds`, di
  form maupun di validasi release server.
- Pengecekan release di form membaca batas per bagian: baris rate utama memakai
  batas sesuai COB dari `rateLinesWithBounds`, baris TPL memakai TJH, dan baris
  PA memakai batas PA. Tarif kendaraan tidak lagi dipakai untuk COB lain.
- Migrasi `20261103210000_batas_ojk_theft_by_driver` mengosongkan batas
  0,5/0,5 dan 0,1/0,1 yang sudah tersimpan di baris rate utama berlabel driver,
  pengemudi, passenger, atau penumpang yang tidak menyebut PA. Batas ikut
  tersimpan setiap slip disimpan, jadi tanpa migrasi ini slip lama tetap
  ditandai.

## File utama

- `lib/data/ojk-motor.ts`: pencocokan PA di `findMotorExtensionBounds` dan
  fungsi baru `findMotorPaBounds`.
- `components/underwriting/slip-model.ts`: `releaseIssues` dan
  `withSectionBounds`.
- `lib/server/tariffs.ts`: batas baris PA di validasi release server.
- `prisma/migrations/20261103210000_batas_ojk_theft_by_driver/migration.sql`.

## Dampak

- **Database:** migrasi data, tanpa perubahan skema. Yang diubah hanya
  `rate_min` dan `rate_max` baris yang memenuhi syarat. Alasan exception yang
  sudah diisi tidak dihapus; form membuangnya saat slip disimpan lagi, karena
  barisnya tidak lagi di luar batas.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan otomatis saat build setelah fork disinkronkan.

## Verifikasi

- Skrip lokal yang memanggil `releaseIssues` (form) dan
  `validatePlacingSlipForRelease` (server):
  - slip MV 001/LCH-PLCMT/PS/VIII/2026: sebelumnya Theft by Driver 0,1 ditandai
    di luar batas 0,5 sampai 0,5 di form dan server. Sesudahnya tanpa batas, dan
    yang tersisa hanya Comprehensive Casco (1,2 di atas 1,14);
  - baris PA Driver diisi 0,3: tetap ditandai di luar batas 0,5 di form dan
    server;
  - slip Property 002/LCH-PLCMT/PS-PAREQ/VIII/2026: sebelumnya form menandai
    FWTWD, BI PAR, EQVET, dan BI EQVET. Sesudahnya form tidak menandai baris itu,
    dan server tetap menandai FWTWD (minimal 0,5‰) dan EQVET (1,43 sampai
    2,46‰) seperti sebelumnya.
- Migrasi dicoba di database lokal dalam transaksi yang di-rollback. Setelah
  batas 0,5 dan 0,1 dipasang ke baris Theft by Driver, Driver, dan Passenger,
  hanya dua baris Theft by Driver (jenis rate) yang dikosongkan.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Form belum bisa menampung alasan untuk semua batas yang dicek server:
  - batas FWTWD dan EQVET Property hanya dihitung di server (PR #69), dan form
    belum menampilkannya. Rate di luar batas itu yang diketik manual ditolak
    saat release, sementara baris itu tidak punya tombol Isi alasan;
  - tabel TPL dan PA (`LimitRateTable`) juga tidak punya tanda batas dan tombol
    Isi alasan.

  Perlu dikerjakan terpisah.
- Label yang memuat "TJH" terbaca sebagai TJH pihak ketiga (0,25 sampai 1%),
  termasuk TJH terhadap penumpang yang tarif OJK-nya 0,125 sampai 0,5%.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
