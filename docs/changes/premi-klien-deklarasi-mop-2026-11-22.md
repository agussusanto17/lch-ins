# Premi tagihan ke klien dan margin di deklarasi MOP

- **Tanggal:** 2026-11-22
- **Branch:** `feat/premi-klien-deklarasi`
- **PR:** #303
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Pertanyaan Harry (20 November 2026): LCH memberi quote ke klien dengan rate 0,1% (polis di Merimen), lalu membayar MAG dengan rate MOP 0,085%. Apakah margin 0,015% bisa muncul di report?

#297 menjawabnya dengan kolom `insurer_premium`:

- premi deklarasi = premi ke klien;
- `insurer_premium` = premi ke asuransi;
- margin = premi deklarasi − `insurer_premium`.

Hasilnya di produksi (22 November 2026): kolom Margin_Rate Rekap Produksi tetap 0, karena premi ke asuransi sama dengan premi upload. Agus lalu meminta susunan form deklarasi yang lain:

- **Premium:** menjadi premi ke asuransi menurut rate MOP;
- **Premi ke Asuransi:** isian terpisah ini dihapus;
- **Premi tagihan ke klien:** isian baru, menurut rate yang diupload (misalnya 0,12%);
- **Margin:** premi tagihan ke klien − premi ke asuransi;
- **Report:** ikut disesuaikan.

## Yang berubah

- **Form deklarasi (Tambah/Edit):**
  - **Premi ke Asuransi \*:** isian premi deklarasi. Terisi otomatis dari Kategori Rate MOP dan tetap bisa diubah.
  - **Premi Tagihan ke Klien:** isian baru. Keterangannya menampilkan rate ke klien, misalnya "Rate ke klien 0,12% dari nilai deklarasi".
  - **Margin:** hanya tampil, tidak bisa diisi; nilainya premi tagihan ke klien − premi ke asuransi.
- **Upload deklarasi:**
  - Gross Premium (atau kolom Premium) di file menjadi premi tagihan ke klien.
  - Premi deklarasi dihitung dari Kategori Rate MOP, dan selisihnya menjadi margin.
  - Tanpa kategori rate, premi file dipakai untuk keduanya, jadi marginnya 0 sampai Kategori Rate dipilih di form.
  - Pratinjau menulis "premi ke asuransi" dan "margin".
  - Petunjuk template ikut diperbarui.
- **Policy Database:**
  - "Margin {nominal}" di bawah premi sekarang dihitung dari premi tagihan ke klien.
  - Export: kolom Premi ke Asuransi dan Margin Rate menjadi **Premi Tagihan ke Klien** dan **Margin**.
- **Rekap Produksi:**
  - Premium_Gross deklarasi = premi ke asuransi.
  - Baris O/I-MARGIN = premi tagihan ke klien − premi ke asuransi. Percentage-nya dihitung dari premi produksi, sama seperti baris lain.
  - Reserve Basis ikut, karena memakai pendapatan Rekap Produksi.
- **Migrasi `20261122120000_premi_klien_deklarasi`:**
  - kolom `policies.insurer_premium` diganti nama menjadi `client_premium`;
  - isi deklarasi lama ditukar: premi lama (premi ke klien) pindah ke `client_premium`, dan premi ke asuransi menjadi `premium`;
  - deklarasi yang `insurer_premium`-nya kosong tetap memakai premi yang sama, jadi marginnya 0.

## Asumsi

- **Brokerage dan additional fee deklarasi dihitung dari premi ke asuransi,** karena premi deklarasi sekarang premi ke asuransi. Ini sesuai komisi yang dibayar asuransi. Sebelumnya (#297) dasarnya premi ke klien.
- **Margin tidak bisa diketik.** Margin selalu selisih kedua premi, jadi yang diubah premi tagihan ke kliennya.
- **Deklarasi produksi yang sudah ada:** di produksi margin semuanya 0, jadi premi tagihan ke klien diisi sama dengan premi deklarasi. Team LCH perlu mengubah premi tagihan ke klien (atau upload ulang dengan premi Merimen) supaya margin muncul.

## File utama

- **Schema dan migrasi:** `prisma/schema.prisma` dan migrasi `20261122120000_premi_klien_deklarasi`.
- **Deklarasi:**
  - `components/policies/policy-form.tsx` (form deklarasi);
  - `lib/declaration-import.ts` dan `components/policies/declaration-upload.tsx`;
  - `lib/open-cover.ts` (`declarationMargin`).
- **Policy Database:**
  - `lib/server/policies.ts` dan `app/(app)/policies/actions.ts`;
  - `lib/data/types.ts`;
  - `components/policies/policy-database.tsx`.
- **Rekap:** `lib/production-recap.ts` dan `lib/server/production-recap.ts`.
- **Lainnya:** `components/audit/audit-fields.ts`.
- **Tes:** `tests/margin-rate-mop.test.ts`, `tests/declaration-import.test.ts`, `tests/production-recap.test.ts`, dan `tests/reserve-basis.test.ts`.

## Dampak

- **Database:** satu migrasi berisi ganti nama kolom dan penukaran isi deklarasi. Migrasi jalan otomatis saat build/deploy. Tidak ada data yang hilang.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Report:** premi produksi deklarasi bermargin turun ke premi ke asuransi, dan selisihnya tercatat sebagai O/I-MARGIN. Di produksi belum ada deklarasi bermargin, jadi angkanya belum berubah.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 409 lolos.
  - Margin = premi klien − premi ke asuransi.
  - Upload dengan dan tanpa kategori rate: premi file menjadi premi klien, premi deklarasi dari rate MOP.
  - Baris O/I-MARGIN di Rekap Produksi.
- **Migrasi di DB lokal:**
  - 3 deklarasi uji tanpa premi ke asuransi: premi tetap, premi klien sama dengan premi.
  - Penukaran diuji di tabel sementara: premi 1.000.000 dengan premi ke asuransi 850.000 menjadi premi 850.000 dan premi klien 1.000.000.
- **Browser lokal** (`lch.localhost:3002`, user SIT Admin), Edit Deklarasi SIT/MOP/DECL/001:
  - form menampilkan Premi ke Asuransi 750.000, Premi Tagihan ke Klien, dan Margin;
  - premi klien diisi 1.200.000 ("Rate ke klien 0,12%"), Margin menjadi 450.000;
  - setelah disimpan, Policy Database menampilkan "Margin IDR 450.000";
  - Rekap Produksi Desember 2026 (ditangkap di halaman tanpa diunduh): baris COMM Premium_Gross 750.000, baris O/I-MARGIN −450.000 dan ikut (Income)/Beban;
  - data uji dikembalikan sesudahnya.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Saat Premium Note ke klien dibuat di Phase 2,** tagihannya memakai premi tagihan ke klien. Premi ke asuransi dipakai untuk nota ke asuransi.
