# Additional fee di polis dan report produksi

- **Tanggal:** 2026-11-04
- **Branch:** `feat/additional-fee-polis`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Report produksi menghitung premium dan brokerage dari semua polis di Policy
Database, termasuk polis yang tidak lewat placement. Diminta additional fee
(jika ada) ikut masuk report (Request & Temuan REQ-020, 4 November 2026).
Polis belum punya field untuk fee.

## Yang berubah

- **Form polis:** field opsional "Additional Fee" di bawah Brokerage (%),
  berupa nominal dalam mata uang polis, default 0. Polis Baru dan Renewal tidak
  boleh negatif. Endorsement dan Cancellation boleh negatif untuk pengembalian
  fee, sama seperti premi. Renewal dan endorsement yang dibuat dari polis induk
  tidak menyalin fee.
- **Report:**
  - kolom Additional Fee (IDR) di tabel Produksi per Class of Business, per
    Insurer, dan tab Polis, beserta export-nya;
  - Ringkasan Periode menambah Total Additional Fee dan Pendapatan
    (Brokerage + Fee);
  - kartu Brokerage Income menampilkan fee di bawah nilainya kalau ada.
- **Export Policy Database:** kolom Additional Fee dalam mata uang polis.
- **Audit trail** mencatat perubahan additional fee.
- **Database:** kolom `additional_fee` di tabel `policies`, default 0.

## Asumsi

- Fee berupa nominal per polis, bukan persen. Fee dikonversi ke IDR dengan kurs
  yang sama dengan premium. Kemungkinan fee ini sama dengan kolom `RM_Fee` di
  format rekap produksi dari Harry.
- Grafik Trend Produksi tetap premium dan brokerage.

## File utama

- `prisma/schema.prisma` dan
  `prisma/migrations/20261104090000_additional_fee_polis/migration.sql`.
- `lib/data/types.ts`, `lib/server/policies.ts`,
  `app/(app)/policies/actions.ts`: field `additionalFee`.
- `components/policies/policy-form.tsx`: isian dan validasi.
- `lib/data/analytics.ts`: `feeIdr` dan fee per kelompok.
- `components/reports/report-view.tsx`: kolom, ringkasan, dan kartu.
- `components/policies/policy-database.tsx`: kolom export.
- `components/audit/audit-fields.ts`: label audit.

## Dampak

- **Database:** migrasi baru, jalan otomatis saat build di Vercel dan VPS.
  Polis yang sudah ada mendapat fee 0.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Skrip simpan dan muat ke database lokal (`lch_dev`), polis uji dihapus
  sesudahnya:
  - polis USD dengan fee 750 tersimpan dan terbaca 750, lalu 1.250,50 setelah
    diubah;
  - audit trail mencatat perubahan `additionalFee`;
  - simpan tanpa field fee menghasilkan 0;
  - fee USD 1.000 terhitung Rp 16.200.000 per COB dan per insurer; 14 polis
    lain fee 0.
- Report dirender dengan komponen asli dan CSS hasil build, memakai dua contoh
  fee di memori (IDR 25 juta dan USD 1.500). Total Additional Fee Rp 49.300.000,
  Pendapatan sama dengan brokerage + fee. Kolom muncul di tabel per COB, per
  Insurer, dan tab Polis.
- Form polis berupa drawer, jadi tidak dirender statis; diperiksa lewat diff dan
  `tsc`.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Debit Note belum memuat additional fee. Kalau fee ditagihkan ke klien lewat
  Debit Note, perlu ditambahkan terpisah.
- Kartu brokerage di Dashboard belum menambahkan fee.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
