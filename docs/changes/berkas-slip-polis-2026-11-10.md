# Berkas polis: dokumen Slip untuk slip dari luar sistem

- **Tanggal:** 2026-11-10
- **Branch:** `feat/lampiran-slip-polis`
- **PR:** [#208](https://github.com/agussusanto17/lch-ins/pull/208)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Catatan meeting LCH, 10 November 2026: form Policy Database perlu lampiran dokumen slip, untuk polis yang slipnya dibuat di luar sistem LCH. Contohnya polis lama atau penempatan yang tidak lewat menu Placement.

Berkas polis (#195) sejauh ini hanya punya tiga jenis: Polis, Premium Note, dan Commission Note.

## Yang berubah

- **Jenis berkas keempat "Slip"** (enum `PolicyFileKind`, migrasi `20261110190000_berkas_slip_polis`). Cara unggahnya sama dengan berkas polis lain:
  - unggah per potongan sampai 25 MB;
  - riwayat versi per jenis;
  - tercatat di audit trail.
- **Hanya untuk polis tanpa placing slip di sistem.**
  - Isian Slip muncul di form polis dan di menu Berkas polis untuk polis seperti itu. Form menulis petunjuk "Slip diisi dokumen slip kalau slipnya dibuat di luar sistem."
  - Polis dari slip di sistem tidak menampilkannya, karena slipnya sudah bisa dicetak. File Slip yang sudah ada tetap tampil.
- **Kolom Berkas di daftar polis** tetap menghitung tiga jenis utama (x/3). File Slip disebut di keterangan saat di-hover, misalnya "… · Slip v1".

## File utama

- `prisma/schema.prisma` dan `prisma/migrations/20261110190000_berkas_slip_polis`.
- `lib/policy-files.ts`: jenis Slip, `MAIN_POLICY_FILE_KINDS`, dan `policyFileKindsFor`.
- `components/policies/policy-form.tsx`, `policy-files-sheet.tsx`, `policy-database.tsx`.
- `app/(app)/policies/actions.ts`, `lib/data/types.ts`.
- `tests/policy-files-upload.test.ts`.

## Dampak

- **Database:** migrasi `ALTER TYPE "PolicyFileKind" ADD VALUE 'Slip'`, tanpa perubahan data.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build seperti biasa.

## Verifikasi

- `npx prisma generate`, `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (162 tes), dan `npm run build`: lolos. Migrasi diterapkan di database lokal.
- **Uji browser lokal** (Playwright dan Chrome, sesi admin sementara; berkas uji dihapus setelahnya):

  | Uji | Hasil |
  |---|---|
  | Form Tambah Polis (tanpa slip) | Ada pemilih file Slip dan petunjuknya |
  | Form polis CAR/2026/JTG/0019 (dari slip sistem) | Tidak ada pemilih Slip |
  | Menu Berkas polis SIT/RNW/2026/001, unggah Slip | Tersimpan sebagai Slip v1. Kolom Berkas tetap 3/3, keterangan "Polis v2 · Premium Note v1 · Commission Note v1 · Slip v1" |

- Tidak ada error di console browser.

## Catatan untuk yang melanjutkan

- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
