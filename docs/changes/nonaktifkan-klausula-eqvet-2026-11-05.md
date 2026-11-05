# Klausula EQVET di Master Clauses dinonaktifkan

- **Tanggal:** 2026-11-05
- **Branch:** `fix/nonaktifkan-klausula-eqvet`
- **PR:** [#121](https://github.com/agussusanto17/lch-ins/pull/121)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Master Clauses Property berisi dua kelompok dari pustaka LCH, PAR (134) dan
EQVET (131), yang judulnya sebagian besar kembar. Picker klausula slip
Property menampilkan keduanya (265 klausula). Harry minta klausula EQ dihapus
karena sama dengan klausula PAR, supaya user tidak bingung saat input (Request
& Temuan REQ-035, 5 November 2026).

Hasil pengecekan data sebelum mengubah:
- 121 dari 131 klausula EQVET punya padanan judul di PAR, tapi 53 di antaranya
  wording-nya berbeda. Contohnya, Notice of Cancellation versi EQVET menyebut
  "EQVET 5 days".
- 10 klausula EQVET tidak punya padanan judul di PAR, misalnya Electronic Data
  Recognition Clause (Earthquake).

Agus memilih menonaktifkan semuanya, bukan menghapus, supaya datanya tetap ada.

## Yang berubah

- **Data:** migrasi `20261105200000_nonaktifkan_klausula_eqvet` menonaktifkan
  semua klausula kelompok EQVET. Klausula yang belum dipakai slip juga hanya
  dinonaktifkan, tidak dihapus.
- **Picker klausula slip** dan **Master Clauses** hanya menampilkan klausula
  aktif, jadi EQVET tidak muncul lagi. Picker Property sekarang berisi 134
  klausula PAR.
- **Slip lama yang sudah memilih klausula EQVET** tetap utuh:
  - Dokumen mencetak salinan klausulanya seperti sebelumnya.
  - Di form, klausula itu tetap tampil di "Klausula terpilih" dari salinan
    slip, dengan label "Nonaktif di master", jadi masih bisa dilihat, diedit,
    atau dilepas. Sebelumnya klausula terpilih yang nonaktif di master hilang
    dari daftar terpilih tapi ikut tersimpan.
- **Seed:** klausula EQVET dari pustaka LCH dibuat dalam keadaan nonaktif,
  supaya database baru sama dengan demo.

## File utama

- `prisma/migrations/20261105200000_nonaktifkan_klausula_eqvet/`.
- `prisma/seed.ts`: `seedClauses`.
- `components/underwriting/clause-picker.tsx`: prop `copies` dan label
  "Nonaktif di master".
- `components/underwriting/placing-slip-form.tsx`: salinan klausula diteruskan
  ke ketiga picker.

## Dampak

- **Database:** migrasi data, jalan otomatis saat build di Vercel dan VPS.
  Hanya mengubah `is_active` dan `updated_at` klausula EQVET. Perubahan dari
  migrasi tidak tercatat di Audit Trail.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal**, sebelum dan sesudah migrasi:
  - EQVET aktif 131 menjadi nonaktif 131.
  - PAR tetap 134 aktif.
  - Klausula Property aktif untuk picker turun dari 265 menjadi 134.
  - Salinan klausula EQVET di slip lama (8 baris) tidak berubah.
- **Slip lama 002/LCH-PLCMT/PS-PAREQ/VIII/2026** dengan klausula EQVET Cyber
  Loss Limited Exclusion Clause: klausula itu tidak ada lagi di daftar master
  aktif. Picker yang diberi salinan slip tetap menampilkannya di Klausula
  terpilih (7 menjadi 8) dengan label Nonaktif di master.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah,
  `npx tsx --test tests/access.test.ts tests/documents.test.ts`, dan
  `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Master Clauses belum punya cara menampilkan atau mengaktifkan lagi klausula
  nonaktif. Kalau ada klausula EQVET yang perlu dipakai lagi, aktifkan lewat
  developer (`is_active = true`) atau tambahkan lewat Tambah Clause.
- PR [#119](https://github.com/agussusanto17/lch-ins/pull/119) (Adi)
  memetakan klausula EQVET ke type of cover PSAGBI. Dengan PR ini, pemetaan itu
  tidak diperlukan lagi untuk EQVET.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
