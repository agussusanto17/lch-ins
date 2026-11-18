# Floating sum insured slip Property

- **Tanggal:** 2026-11-18
- **Branch:** `feat/floating-sum-insured`
- **PR:** #272
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (17 November 2026), poin 5: slip property perlu pilihan Floating Sum Insured.
  - Satu sum insured berlaku untuk semua lokasi, misalnya stok yang berpindah antar gudang.
  - Tiap lokasi cukup diisi alamat, okupasi, dan kelas konstruksi.
  - Sum insured, rate, dan deductible diisi sekali untuk semua lokasi.
- Acuan: placing slip 015/LCH-PLCMT/PS-PAR/X/2026, foto ada di `documents/contoh slip`.
  - Dua ruko di Sunter, okupasi 29371 Private Warehouse.
  - Cetakannya: "Total Sum of Insured : On Floating Stock – IDR 12,000,000,000".
  - Premi = 12 M × rate per cover. FLEXAS 0,1127%, FWTWD 0,05%, RSMDCC 0,001%, Others 0,001%. Total premi 19.764.000.
- Sebelumnya slip multi lokasi selalu mengisi sum insured, rate, dan deductible per lokasi. Cetakannya "As Attached" dengan lampiran DAFTAR LOKASI.

## Yang berubah

- **Saklar Floating Sum Insured** di bagian Lokasi & Sum Insured (slip Property).
  - Saat menyala, kartu lokasi hanya berisi alamat, okupasi, nama okupasi di slip, kelas konstruksi, dan Referensi Tarif OJK.
  - Sum insured Section 1 dan 2 serta tabel rate pindah ke blok "Sum insured & rate semua lokasi" di bawah daftar lokasi.
  - Deductible menjadi satu daftar untuk semua lokasi. Saklar "Deductible berbeda per lokasi" tidak muncul.
- **Isian Keterangan Total Sum Insured**, misalnya "On Floating Stock". Dicetak sebelum nilainya. Kosong berarti hanya nilainya.
- **Data:** semua baris sum insured dan rate slip floating menempel di lokasi pertama.
  - `locationOwner` mengarahkan semua baris ke lokasi pertama, jadi premi dihitung sekali dari total sum insured.
  - Perhitungan PAR/EQVET, BI, endorsement, dan rekap tidak perlu diubah.
- **Menyalakan floating** (`floatingSumInsuredPatch`):
  - Sum insured semua lokasi digabung ke satu daftar. Baris kosong lokasi lain dibuang.
  - Rate, loss limit, deductible, dan alasan rate lokasi 1 berlaku untuk semua lokasi.
  - Milik lokasi lain dihapus. Form meminta konfirmasi dulu bila lokasi lain sudah punya rate atau deductible.
- **Mematikan floating:** semua sum insured tetap di lokasi 1. Lokasi lain mendapat baris sum insured kosong serta salinan rate, loss limit, dan deductible lokasi 1.
- **Tambah dan hapus lokasi** slip floating:
  - Lokasi baru tanpa baris sum insured dan rate.
  - Bila lokasi 1 dihapus, sum insured dan rate pindah ke lokasi yang menjadi pertama.
- **Batas OJK** rate floating mengikuti lokasi paling berisiko, yaitu batas bawah tertinggi (`strictestBounds`).
  - Sumber batas menyebut lokasinya, misalnya "FLEXAS okupasi 29378 K2, lokasi 2".
  - Berlaku di form (`rateLinesWithBounds`) dan validasi server (`attachSlipRateBounds`). Validasi server memakai batas per cover: FLEXAS, EQVET, FWTWD.
- **Validasi release:** tiap lokasi wajib alamat dan okupasi, serta kelas konstruksi bila ada rate FLEXAS atau EQVET. Sum insured dicek sekali untuk slip, bukan per lokasi.
- **Cetakan** (placing slip, quotation, CI, CN, ES/CS memakai blok yang sama), seperti slip 015:
  - Slip floating dicetak seperti satu lokasi, tanpa "As Attached" dan tanpa lampiran DAFTAR LOKASI.
  - Risk Location: semua alamat bernomor.
  - Okupasi dan kelas konstruksi yang sama di semua lokasi dicetak sekali. Yang berbeda dicetak bernomor sesuai urutan lokasi.
  - Total Sum Insured: "On Floating Stock – IDR 12.000.000.000".
  - Rate dan premium calculation memakai total sum insured.
- **Audit trail:** isian baru "Floating Sum Insured". Isinya keterangan yang dicetak, "Ya" bila keterangannya kosong, atau kosong bila tidak floating.
- **Ganti COB** mematikan floating.

## File utama

- `lib/slip-locations.ts`: `isFloatingSumInsured`, `strictestBounds`, `locationOwner`, `isMultiLocation`.
- `components/underwriting/slip-model.ts`: `floatingSumInsuredPatch`, `floatingDropsLocationData`, dan cabang floating di `deductibleUnits`, `addLocationPatch`, `removeLocationPatch`, `propertyRateLinesPatch`, `rateLinesWithBounds`, `locationIssues`, `switchCob`.
- `components/underwriting/slip-locations.tsx`: saklar, isian keterangan, dan blok sum insured & rate bersama.
- `components/documents/doc-blocks.tsx`: `floatingLocationRows`, Total Sum Insured dengan keterangan.
- `lib/server/placing-slips.ts`, `lib/server/tariffs.ts`, `app/(app)/placement/actions.ts`, `lib/slip-audit.ts`.
- `prisma/migrations/20261118200000_floating_sum_insured/migration.sql`.
- `tests/floating-sum-insured.test.ts`.

## Dampak

- **Database:** migrasi `20261118200000_floating_sum_insured` menambah dua kolom di `placing_slips`:
  - `floating_sum_insured` boolean, default false;
  - `floating_sum_insured_text` text.
  - Slip lama tetap per lokasi.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 292 lolos, termasuk 9 test baru dengan angka slip 015:
  - premi per cover 13.524.000, 6.000.000, 120.000, 120.000; total 19.764.000, ditambah biaya polis menjadi 19.814.000;
  - nyala dan mati floating;
  - tambah dan hapus lokasi;
  - type of cover baru;
  - batas lokasi terberat;
  - ganti COB.
- **Browser lokal** (SIT Admin, slip draft baru, dihapus lagi setelah uji):
  - Saklar menyala, isian keterangan muncul, ringkasan bagian menjadi "2 lokasi floating · IDR 12.000.000.000".
  - Dua lokasi 29371 Class I, Stock IDR 12.000.000.000, rate 1,127 / 0,5 / 0,01 / 0,01 ‰. Premi per cover sama dengan slip 015.
  - Deductible satu daftar. Audit trail mencatat "Floating Sum Insured: On Floating Stock", dan judul "Location 1" di deductible hilang.
  - Cetakan: Occupation sekali, Risk Location bernomor, Construction Class sekali, "On Floating Stock – IDR 12.000.000.000", premi PAR 19.764.000.
  - Lokasi 2 diganti 29378 Class II:
    - cetakan Occupation dan Construction Class menjadi bernomor;
    - batas FLEXAS form menjadi 3,382–3,780 (lokasi 2), dan rate 1,127 ditandai butuh alasan.
- **Temuan saat uji:** nama COB di master tertulis "PROPERTY". Pengecekan COB di server sekarang memakai `normalizeCob`. Tanpa itu, flag floating tidak tersimpan.

## Catatan untuk yang melanjutkan

- **Batas OJK yang sudah tersimpan** di baris rate (`rate_min`, `rate_max`) didahulukan dan tidak dihitung ulang saat okupasi atau kelas lokasi diganti.
  - Ini perilaku lama untuk semua slip Property.
  - Untuk slip floating, aturan lokasi terberat hanya berlaku bagi baris yang belum punya batas tersimpan.
- **Upload lokasi dari Excel** (MoM poin 6) belum ada. Lokasi floating cukup alamat, okupasi, dan kelas.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
