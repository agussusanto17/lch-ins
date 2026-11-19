# Tanggal LOD ke Asuransi di klaim

- **Tanggal:** 2026-11-19
- **Branch:** `feat/tanggal-lod-klaim`
- **PR:** belum ada
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Permintaan Agus (19 November 2026), dengan screenshot bagian Status Klaim dan Tahapan Dokumen di form klaim: tambah tanggal LOD ke asuransi.

- **LOD (Letter of Discharge)** adalah surat persetujuan tertanggung atas nilai pembayaran klaim dari asuransi.
- Di polis, asuransi umumnya membayar klaim paling lambat **30 hari kalender sejak LOD dikirim**.

## Yang berubah

- **Database:** kolom `claims.lod_date` (tanggal, boleh kosong).
- **Form klaim:** isian Tanggal LOD ke Asuransi di samping Tanggal Terbit SPK / SPGR.
  - Sebelum diisi, keterangannya menjelaskan LOD dan aturan 30 hari.
  - Setelah diisi, keterangannya menampilkan batas bayar asuransi, yaitu tanggal LOD + 30 hari kalender.
  - Tanggal LOD tidak boleh mendahului tanggal kejadian.
- **Detail klaim:** timeline mendapat baris "LOD dikirim ke asuransi" beserta batas bayar asuransinya. Klaim yang masih berjalan (Outstanding atau Partial Settle) dan sudah lewat batas mendapat tanda "Lewat N hari".
- **Cetak detail klaim:** baris "LOD Dikirim ke Asuransi" di bagian Status & Kronologi Penanganan, beserta batas bayarnya.
- **Export daftar klaim:** kolom Tgl LOD ke Asuransi dan Batas Bayar Asuransi.
- **Report Statistik Klaim per Status**, sheet Daftar Klaim:
  - kolom "Date LOD to Insurer / Tanggal LOD ke Asuransi" dan "Payment Due / Batas Bayar Asuransi" setelah Date SPK / SPGR;
  - kolom Status Klaim dan sesudahnya bergeser dua kolom.
- **Aturan bersama** di `lib/claim-detail.ts`: `LOD_PAYMENT_DAYS` (30), `lodPaymentDueDate`, dan `lodDaysOverdue`.

## File utama

- `prisma/schema.prisma` dan migrasi `20261119120000_tanggal_lod_klaim`.
- `lib/claim-detail.ts`, `lib/data/types.ts`, `lib/server/claims.ts`, `app/(app)/claims/actions.ts`.
- `components/claims/claim-form.tsx`, `components/claims/claim-detail-sheet.tsx`, `components/claims/claims-view.tsx`, `components/documents/claim-documents.tsx`.
- `lib/claim-statistics.ts`, `lib/server/claim-statistics.ts`.
- `tests/tanggal-lod-klaim.test.ts` (baru) dan `tests/claim-statistics.test.ts`.

## Dampak

- **Database:** migrasi `20261119120000_tanggal_lod_klaim` menambah kolom `claims.lod_date` tanpa default. Tanggal LOD klaim lama kosong.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint: lolos, kecuali 1 warning lama di `components/claims/claims-view.tsx`.
- `npx tsx --test tests/*.test.ts`: 339 lolos.
  - 3 test baru: batas bayar (termasuk lintas tahun dan tahun kabisat), tanda lewat batas per status, dan kolom LOD di report Statistik Klaim.
  - Test workbook Statistik Klaim disesuaikan karena kolom Status bergeser dari R ke T.
- **Browser lokal**, klaim CLM/2026/07/0030 (Outstanding):
  - Form Edit: LOD diisi 01/10/2026, keterangannya "Batas bayar asuransi 31 Okt 2026, 30 hari kalender sejak LOD dikirim."
  - Setelah disimpan, timeline detail menampilkan "LOD dikirim ke asuransi, 01 Okt 2026", "Batas bayar asuransi 31 Okt 2026", dan tanda "Lewat 19 hari".
  - Cetak detail: "1 Oktober 2026, batas bayar asuransi 31 Oktober 2026".
  - Sesudahnya data dikembalikan: tanggal LOD dikosongkan, `updated_at` dipulihkan, dan baris audit uji dihapus. Sesi uji juga dihapus.

## Catatan untuk yang melanjutkan

- **Batas 30 hari** berlaku sama untuk semua klaim. Kalau ada polis dengan klausul waktu pembayaran berbeda, perlu isian per polis.
- **Audit Trail** tidak mencatat tanggal LOD, sama seperti tanggal klaim lain. Audit ubah klaim hanya mencatat nilai, status, tahapan, dan peserta.
- **Belum ada** daftar atau filter klaim yang lewat batas bayar di menu Klaim dan Dashboard.
- **PR #285** (definisi Gross Premium) tidak berbagi file dengan perubahan ini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
