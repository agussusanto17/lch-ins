# Picker klausula Cash In Transit dan Engineering (SIT-035)

- **Tanggal:** 2026-11-05
- **Branch:** `fix/filter-klausula-cit-engineering`
- **PR:** belum dibuat
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Temuan SIT-035 poin 2 dan 3 pada picker klausula placing slip:

- **Cash In Transit** menampilkan 89 klausula: 40 klausula CIT ditambah 49
  klausula Cargo umum. Klausula Cargo tidak punya type of cover, jadi filter
  menganggapnya berlaku untuk semua TOC Marine Cargo, termasuk CIT.
- **Engineering**: 62 klausula Engineering (kelompok `MB` di pustaka LCH)
  terikat ke TOC 0803 Machinery Breakdown Insurance. Slip CAR, EAR, EEI, CPM,
  dan CECR tidak menemukan klausula Engineering sama sekali.

User memilih opsi A (5 November 2026): klausula Engineering dijadikan klausula
umum Engineering, dan klausula Cargo umum disembunyikan dari slip CIT.

## Yang berubah

- **Filter picker** (`clauseFitsSlip`): klausula kelompok `Cargo` disembunyikan
  kalau semua type of cover slip adalah Cash In Transit. Slip Marine Cargo lain
  (Open Cover, Stock Throughput, Marine Cargo) tetap menampilkan 49 klausula
  Cargo. Slip yang belum memilih TOC tetap menampilkan semua klausula COB-nya.
- **Data:** migrasi `20261105233000_klausula_engineering_semua_toc` mengosongkan
  `cover_type_id` 62 klausula kelompok `MB`, jadi berlaku untuk semua TOC
  Engineering.
- **Seed:** kelompok `MB` dipetakan ke COB Engineering tanpa TOC, sama dengan
  migrasi.

Jumlah klausula di picker setelah perubahan:

| COB / Type of Cover | Sebelum | Sesudah |
|---|---|---|
| Marine Cargo / Cash In Transit | 89 | 40 |
| Marine Cargo / Open Cover, Stock Throughput, Marine Cargo | 49 | 49 |
| Engineering / Machinery Breakdown Insurance | 62 | 62 |
| Engineering / CAR, EAR, EEI, CPM, CECR | 0 | 62 |
| Property (semua TOC) | 134 | 134 |

## File utama

- `lib/clause-filter.ts`: `ClauseScope.sourceGroup` dan aturan Cash In Transit.
- `prisma/migrations/20261105233000_klausula_engineering_semua_toc/`.
- `prisma/seed.ts`: `CLAUSE_GROUP_COB`.
- `tests/clause-filter.test.ts`: kasus CIT, Marine Cargo lain, dan Engineering.

## Dampak

- **Database:** migrasi data, jalan otomatis lewat `prisma migrate deploy` di
  skrip `npm run build`.
  Hanya mengubah `cover_type_id` dan `updated_at` klausula kelompok `MB`.
  Perubahan dari migrasi tidak tercatat di Audit Trail.
- **Slip lama:** klausula yang sudah dipilih tidak berubah, karena dokumen
  mencetak salinan klausula slip.
- **Env dan deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan
  fork.

## Verifikasi

1. `npx tsx --test tests/*.test.ts`.
2. Database lokal setelah migrasi: kelompok `MB` 62 klausula, semuanya tanpa
   `cover_type_id`. `CIT` tetap 40 dengan TOC 0308, `Cargo` tetap 49 tanpa TOC.
3. `clauseFitsSlip` dijalankan terhadap seluruh klausula aktif database lokal
   untuk setiap TOC Property, Marine Cargo, dan Engineering. Hasilnya sesuai
   tabel di atas.
4. Browser, form Buat Placing Slip (`/underwriting/new`): pilih COB dan Type
   of Cover, lalu lihat angka "klausula relevan" di bagian klausula. Hasil:
   Property tanpa TOC 134, Cash In Transit 40, Marine Cargo Open Cover 49, CAR
   62, EEI 62, Machinery Breakdown Insurance 62.
5. `npx tsc --noEmit` dan `npm run build` lolos.

## Catatan untuk yang melanjutkan

- Aturan Cash In Transit memakai nama TOC ("cash in transit") dan
  `source_group = 'Cargo'`. Kalau klausula Cargo baru ditambah lewat Master
  Clauses dengan kelompok lain, aturan ini tidak berlaku untuknya.
- Slip dengan dua TOC, salah satunya bukan CIT, tetap menampilkan klausula
  Cargo.
- Kelompok `MB` tetap bernama `MB` walau sekarang berlaku untuk semua TOC
  Engineering. Nama kelompok berasal dari pustaka LCH dan menjadi bagian kunci
  unik `(title, source_group)`, jadi tidak diganti.
