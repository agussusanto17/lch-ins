# Klausula EQVET dipetakan ke type of cover Earthquake (PSAGBI)

- **Tanggal:** 2026-11-05
- **Branch:** `fix/clause-eqvet-type-of-cover-earthquake`
- **PR:** #119
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

SIT-035 (clause disaring menurut type of cover) gagal pada uji ulang
5 November 2026. Klausula EQVET hanya dipetakan ke COB Property, tanpa type of
cover, jadi pemilih klausula selalu menampilkan 265 klausula untuk semua type
of cover Property. Klausula gempa ikut muncul di slip Property All Risk yang
tidak menjamin gempa. PR #117 menambah isian Type of Cover Earthquake, jadi
klausula EQVET sekarang bisa diikat ke type of cover gempa.

## Yang berubah

- **Data klausula:** 131 klausula EQVET dipetakan ke type of cover PSAGBI
  (0105), yaitu polis standar gempa di master Property. Klausula PAR tetap
  berlaku untuk semua type of cover Property.
- **Pemilih klausula:** klausula EQVET tampil kalau salah satu type of cover
  slip adalah cover gempa:
  - PSAGBI dipilih di Type of Cover atau Type of Cover Earthquake;
  - type of cover gabungan "PROPERTY ALL RISKS … + EARTHQUAKE, VOLCANIC
    ERUPTION AND TSUNAMI INSURANCE." (0112);
  - slip lama dengan teks "PAR + EQVET".
- Slip Property All Risk atau Industrial All Risk tanpa cover gempa sekarang
  hanya menampilkan 134 klausula PAR.
- Klausula yang sudah dipilih di slip tidak berubah. Filter hanya mengatur
  daftar pilihan.

## File utama

- `lib/clause-filter.ts`: aturan COB dan type of cover untuk pemilih
  klausula, termasuk pengenalan cover gempa (`isEarthquakeCover`).
- `components/underwriting/clause-picker.tsx`: memakai `clauseFitsSlip`.
- `prisma/migrations/20261105180000_clause_eqvet_psagbi/migration.sql`:
  pemetaan data.
- `prisma/seed.ts`: `CLAUSE_GROUP_COB` disamakan dengan migrasi.
- `tests/clause-filter.test.ts`: test aturan filter.

## Dampak

- **Database:** migrasi `20261105180000_clause_eqvet_psagbi` mengisi
  `clauses.cover_type_id` untuk klausula `source_group = 'EQVET'` yang
  type of cover-nya masih kosong. Klausula yang sudah diatur lewat master tidak
  diubah. Tidak ada perubahan schema.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan otomatis saat build. Setelah merge, sinkronkan
  fork (`gh repo sync vourdev/lch-ins -b main`).

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 12 test lolos (5 test baru gagal sebelum
  `lib/clause-filter.ts` dibuat).
- DB lokal setelah `prisma migrate deploy`: EQVET 131 klausula ber-type of
  cover PSAGBI, PAR 134 tanpa type of cover.
- Uji di browser (ego-browser, server lokal, tanpa menyimpan):
  - draft Property tanpa type of cover: 265 klausula;
  - Property All Risk: 134;
  - Property All Risk + Earthquake PSAGBI: 265, lalu kembali 134 setelah
    "Tanpa Earthquake";
  - slip lama "PAR + EQVET": 265;
  - slip Industrial All Risks (IAR): 134.
- `npx tsc --noEmit` dan `npm run build` lolos.

## Catatan untuk yang melanjutkan

- Master LCH tidak punya type of cover bernama "Earthquake". PSAGBI dipilih
  karena itu polis standar gempa Indonesia, dan PR #117 memakainya sebagai
  isian Earthquake saat uji. Kalau LCH menambah type of cover Earthquake
  sendiri, pindahkan `cover_type_id` klausula EQVET ke sana. Nama yang memuat
  "Earthquake" sudah dikenali sebagai cover gempa.
- SIT-035 masih punya dua temuan di luar perubahan ini:
  - Cash In Transit ikut menampilkan klausula Cargo, karena klausula Cargo
    berlaku untuk semua type of cover Marine Cargo.
  - Engineering CAR tidak punya klausula, karena master Engineering hanya
    berisi klausula MB.
