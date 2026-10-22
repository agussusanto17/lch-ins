# Format nomor klaim mengikuti pola LCH

- **Tanggal:** 2026-10-22
- **Branch:** `fix/format-nomor-klaim`
- **PR:** #34
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Klaim baru yang nomornya dibuat sistem mendapat format sementara
`0004/CLM/10/2026` (lihat [sambung-ui-klaim-postgres-2026-10-22.md](sambung-ui-klaim-postgres-2026-10-22.md)).
ERD v1.5 di Notion menetapkan format LCH `CLM-LCH{seq}/{COVER}/{MMROMAN}/{YYYY}`,
contoh `CLM-LCH075/MC/III/2026`, dengan `{COVER}` diambil dari
`cover_types.abbreviation`. Kolom itu belum ada di schema, jadi klaim tidak
punya sumber singkatan cover.

## Yang berubah

- Nomor klaim otomatis sekarang berformat `CLM-LCH005/MC/X/2026`: nomor urut 3
  digit, singkatan cover, bulan romawi (WIB), tahun.
- Singkatan cover diambil dari cover type polis (`cover_types.abbreviation`).
  Polis yang belum punya cover type memakai label type of cover di form polis,
  dicocokkan ke kode di `TYPE_OF_COVER`.
- Kalau singkatan tidak ditemukan, segmen cover dilewati beserta pemisahnya:
  `CLM-LCH005/X/2026`, bukan `CLM-LCH005//X/2026`. Aturan ini mengikuti catatan
  ERD untuk slip. Pola slip `PS-{COVER}` tetap menjadi `PS` seperti sebelumnya.
- Kolom baru `cover_types.abbreviation` (boleh kosong). 16 cover type yang
  sudah punya kode di `TYPE_OF_COVER` diisi lewat migrasi dan seed, misalnya
  0109 PAR, 0110 IAR, 0311/0312/0323 MC, 0801 CAR. Seed tidak menimpa singkatan
  yang sudah diisi bila seed sendiri tidak punya nilainya.
- Nomor klaim yang sudah ada tidak diubah.

## File utama

- `prisma/migrations/20261022170000_claim_number_format/migration.sql`: kolom
  `abbreviation`, isi singkatan awal, dan pola nomor CLM baru di
  `document_types`.
- `prisma/schema.prisma`: field `CoverType.abbreviation`.
- `prisma/seed.ts`: peta `COVER_ABBREVIATIONS` dan pola CLM baru.
- `server/services/number-generator.ts`: `{COVER}` kosong ikut menghapus
  pemisah `/` di depannya, bukan hanya `-`.
- `lib/server/claims.ts`: `policyCoverCode()` mencari singkatan cover dari
  polis sebelum mengambil nomor.
- `scripts/verify-claims.ts`: asersi format nomor, jalur tanpa cover, dan
  jalur dengan cover.

## Dampak

- **Database:** migrasi baru `20261022170000_claim_number_format`. Migrasi ini
  juga mengubah `document_types.number_pattern` untuk CLM, jadi DB yang sudah
  berjalan ikut berubah tanpa seed ulang.
- **Env:** tidak ada.
- **Deploy:** jalankan `npm run db:deploy` ke database produksi setelah merge.

## Verifikasi

1. `npx prisma migrate deploy` di DB lokal berhasil, lalu
   `prisma migrate diff` terhadap schema kosong (tidak ada drift).
2. `npx tsx --env-file=.env --conditions=react-server scripts/verify-claims.ts`:
   - `formatDocumentNumber` menghasilkan `CLM-LCH075/MC/III/2026`,
     `CLM-LCH075/III/2026` tanpa cover, dan `001/LCH-PLCMT/PS/VIII/2026` untuk
     slip tanpa cover.
   - Polis tanpa cover type: `CLM-LCH005/X/2026`.
   - Polis dengan cover type 0323 Marine Cargo: `CLM-LCH006/MC/X/2026`. Cover
     type polis dikembalikan setelah uji.
   - Hasil akhir `ALL CLAIMS TESTS PASSED`.
3. `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`
   bersih.

## Catatan untuk yang melanjutkan

- **Perlu konfirmasi LCH:** periode reset nomor klaim. Sementara bulanan,
  sama seperti dokumen lain, dan nomor urut berjalan lintas cover. Contoh
  `075` di bulan III terasa besar untuk reset bulanan, mungkin sebenarnya
  tahunan.
- **Perlu konfirmasi LCH:** daftar singkatan resmi untuk 31 cover type yang
  masih kosong (misalnya PSAGBI, Heavy Equipment, Cash In Transit).
- `cover_types.priority` dari ERD belum ditambahkan. Kolom `prioritas` di
  `cob-toc.csv` berisi campuran angka dan huruf, dan baru dipakai untuk
  menggabungkan singkatan slip, bukan klaim.
- Slip masih mengambil singkatan dari `TYPE_OF_COVER` lewat `coverCodeFor`,
  belum dari `cover_types.abbreviation`. Menyatukannya bisa jadi perubahan
  berikutnya.
- Field singkatan belum bisa diedit dari halaman master data COB & cover type.
