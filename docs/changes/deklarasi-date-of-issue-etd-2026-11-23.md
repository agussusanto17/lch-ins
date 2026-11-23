# Deklarasi MOP: tanggal dari Date of Issue, Tanggal ETD, tanpa Tanggal Berakhir

- **Tanggal:** 2026-11-23
- **Branch:** `feat/deklarasi-date-of-issue-etd`
- **PR:** #316
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 23 November 2026, dengan screenshot form Edit Deklarasi: "tanggal deklarasi diambil dari Date of Issue aja, terus tambahin tanggal ETD sesuai kolom upload ETD tanggalnya. tanggal berakhirnya ga usah ada aja".

Kondisi sebelumnya (#258, #260):

- **Tanggal Deklarasi:** upload memakai kolom Date of Issue, tetapi baris tanpa Date of Issue memakai ETD.
- **ETD:** hanya ditulis di keterangan ("ETD dd/mm/yyyy").
- **Form deklarasi:** menampilkan Tanggal Berakhir, yang isinya akhir periode polis MOP.

## Yang berubah

- **Upload deklarasi:**
  - Tanggal Deklarasi hanya dari Date of Issue. Baris tanpa Date of Issue gagal dengan pesan "Date of Issue kosong.". Pesan tanggal lain juga menyebut Date of Issue.
  - Kolom ETD disimpan di Tanggal ETD (kolom baru). Tanggal yang dibalik Excel dibaca ulang seperti Date of Issue, dan ikut dihitung di pesan "tanggal dibaca ulang".
  - ETD yang bukan tanggal, misalnya "TBA", tetap dicatat di keterangan.
  - Keterangan deklarasi tidak lagi memuat ETD yang berupa tanggal.
  - Pratinjau upload menampilkan kolom Date of Issue dan ETD.
  - Petunjuk di template diperbarui.
- **Form deklarasi (Policy Database):**
  - Labelnya menjadi "Tanggal Deklarasi (Date of Issue)", dengan keterangan bahwa tanggal ini menentukan bulan produksi.
  - Isian Tanggal ETD (boleh kosong) menggantikan Tanggal Berakhir.
  - Tanggal Berakhir tidak tampil. Nilainya tetap akhir periode polis MOP, seperti sebelumnya.
  - Date of Issue yang melewati akhir periode polis MOP sekarang ditandai di isian Date of Issue, karena Tanggal Berakhir tersembunyi.
- **Audit Trail:** perubahan tercatat sebagai "Tanggal ETD".
- **Migrasi `20261123120000_tanggal_etd_deklarasi`:**
  - menambah kolom `policies.etd_date` (DATE, boleh kosong);
  - deklarasi lama yang keterangannya memuat "ETD dd/mm/yyyy" diisi dari teks itu, tanpa mengubah keterangannya.

## Asumsi

- **Tanggal Berakhir deklarasi** tetap disimpan sama dengan akhir polis MOP, karena status polis di Policy Database memakainya. Hanya tampilannya yang dihapus dari form.
- **Deklarasi lama** yang dulu memakai ETD karena Date of Issue kosong tidak bisa dikenali otomatis. Tanggal deklarasinya tidak diubah.

## File utama

- **Upload:** `lib/declaration-import.ts` dan `components/policies/declaration-upload.tsx`.
- **Form:** `components/policies/policy-form.tsx`.
- **Data:**
  - `prisma/schema.prisma` dan migrasinya;
  - `lib/data/types.ts` (`Policy.etdDate`);
  - `lib/server/policies.ts`;
  - `app/(app)/policies/actions.ts`;
  - `components/audit/audit-fields.ts`.
- **Tes:** `tests/declaration-import.test.ts`.

## Dampak

- **Database:** satu migrasi, yaitu kolom baru yang boleh kosong plus backfill ETD dari keterangan deklarasi. Data lain tidak berubah.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan otomatis saat build.
- **Report:** tidak berubah. Bulan produksi deklarasi tetap tanggal deklarasi (Date of Issue).

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 440 lolos.
  - Tes General Marine Report menyimpan ETD ke Tanggal ETD, termasuk ETD yang dibalik Excel (2026-10-06).
  - Tes baru: baris tanpa Date of Issue ditolak, ETD "TBA" tetap di keterangan, dan baris tanpa ETD tidak punya keterangan ETD.
- **Migrasi lokal:** jalan. Rumus backfill dicoba: "… · ETD 06/10/2026 · …" menjadi 2026-10-06, sedangkan "ETD TBA" tidak diubah.
- **Browser lokal**, deklarasi SIT/MOP/DECL/001:
  - form menampilkan "Tanggal Deklarasi (Date of Issue)" dan "Tanggal ETD", tanpa Tanggal Berakhir;
  - ETD 07/12/2026 tersimpan, Tanggal Berakhir tetap 20/12/2026, dan Audit Trail mencatat etdDate;
  - datanya lalu dikembalikan.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Tanggal ETD belum tampil** di export Policy Database maupun Rekap Produksi. Tambahkan kalau Team LCH membutuhkannya.
- **Catatan terkait:** `upload-deklarasi-excel-2026-11-17.md` (#258) dan `template-deklarasi-gmr-2026-11-17.md` (#260).
