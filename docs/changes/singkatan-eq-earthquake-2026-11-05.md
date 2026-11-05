# Singkatan EQ untuk type of cover Earthquake (PSAGBI)

- **Tanggal:** 2026-11-05
- **Branch:** `fix/singkatan-eq-earthquake`
- **PR:** [#122](https://github.com/agussusanto17/lch-ins/pull/122)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Sejak [#117](https://github.com/agussusanto17/lch-ins/pull/117), nomor slip
Property dengan dua type of cover menggabungkan singkatan keduanya. Supaya slip
PAR + Earthquake bernomor PS-PAREQ seperti CI LCH
`011/LCH-PLCMT/CI-PAREQ/VIII/2026`, type of cover Earthquake perlu bersingkatan
EQ. Agus minta singkatan itu diisi di master (5 November 2026).

Master LCH tidak punya type of cover bernama "Earthquake". Yang dipakai sebagai
Earthquake adalah PSAGBI (0105), polis standar gempa. Ini sama dengan
[#119](https://github.com/agussusanto17/lch-ins/pull/119), yang memetakan
klausula EQVET ke PSAGBI.

## Yang berubah

- **Migrasi `20261105220000_singkatan_eq_psagbi`:** singkatan PSAGBI (0105)
  menjadi EQ. Daftar COB dan TOC LCH menulis EQVET, tapi itu akan menghasilkan
  PS-PAREQVET.
- **Seed:** `COVER_ABBREVIATIONS` mendapat `"0105": "EQ"`.
- Lewat migrasi, bukan lewat Master Data, supaya database Vercel dan VPS
  sama-sama berubah. Edit lewat UI demo hanya mengubah database Vercel.

## File utama

- `prisma/migrations/20261105220000_singkatan_eq_psagbi/migration.sql`.
- `prisma/seed.ts`: `COVER_ABBREVIATIONS`.

## Dampak

- **Database:** migrasi data, jalan otomatis saat build di Vercel dan VPS.
  Hanya mengubah `abbreviation` dan `updated_at` PSAGBI. Perubahan dari migrasi
  tidak tercatat di Audit Trail.
- **Nomor slip:** hanya slip yang di-release setelah ini. Nomor slip yang sudah
  terbit tidak berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal:**
  - PSAGBI bersingkatan EQ, Property All Risk tetap PAR.
  - Slip Property All Risk + PSAGBI ber-coverCode PAREQ, dengan perkiraan
    nomor `005/LCH-PLCMT/PS-PAREQ/XI/2026` (counter lokal).
  - Slip Property All Risk saja tetap PAR.
  - Slip uji dihapus.
- `npx tsc --noEmit`,
  `npx tsx --test tests/access.test.ts tests/clause-filter.test.ts tests/documents.test.ts`,
  dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Type of cover gabungan 0112 (PAR + Earthquake) di master demo punya
  singkatannya sendiri. Migrasi ini tidak menyentuhnya.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
