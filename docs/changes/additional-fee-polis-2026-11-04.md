# Additional fee di placing slip, polis, dan report produksi

- **Tanggal:** 2026-11-04
- **Branch:** `feat/additional-fee-polis`
- **PR:** [#102](https://github.com/agussusanto17/lch-ins/pull/102)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Report produksi menghitung premium dan brokerage dari semua polis di Policy
Database, termasuk polis yang tidak lewat placement. Diminta additional fee
(jika ada) ikut masuk report (Request & Temuan REQ-020, 4 November 2026).
Polis belum punya field untuk fee.

Permintaan lanjutan di hari yang sama (REQ-021): placing slip Property dan
Motor Vehicle juga punya isian additional fee. Isian ini hanya untuk produksi,
tidak dicetak di slip, dan dibiarkan kosong kalau tidak ada fee.

## Yang berubah

- **Form placing slip dan Draft Quotation, kartu Brokerage:** isian opsional
  "Additional Fee" dalam mata uang slip, hanya untuk COB Property dan Motor
  Vehicle. Tidak boleh negatif. Tidak dicetak di Placing Slip, Quotation Slip,
  Cover Note, maupun Closing Instruction. Server tidak menyimpan fee untuk COB
  lain, termasuk slip yang COB-nya diganti. Duplikat slip ikut menyalin fee.
- **Form polis:** field opsional "Additional Fee" di bawah Brokerage (%),
  berupa nominal dalam mata uang polis, default 0.
  - Polis yang dibuat dari placing slip mengambil fee dari slip.
  - Polis Baru dan Renewal tidak boleh negatif. Endorsement dan Cancellation
    boleh negatif untuk pengembalian fee, sama seperti premi.
  - Renewal dan endorsement yang dibuat dari polis induk tidak menyalin fee.
- **Report:**
  - kolom Additional Fee (IDR) di tabel Produksi per Class of Business, per
    Insurer, dan tab Polis, beserta export-nya;
  - Ringkasan Periode menambah Total Additional Fee dan Pendapatan
    (Brokerage + Fee);
  - kartu Brokerage Income menampilkan fee di bawah nilainya kalau ada.
- **Export Policy Database:** kolom Additional Fee dalam mata uang polis.
- **Audit trail** mencatat perubahan additional fee polis.
- **Database:** kolom `additional_fee` di tabel `policies` dan
  `placing_slips`, default 0.

## Asumsi

- Fee berupa nominal, bukan persen. Di report, fee dikonversi ke IDR dengan
  kurs yang sama dengan premium. Kemungkinan fee ini sama dengan kolom
  `RM_Fee` di format rekap produksi dari Harry.
- Produksi tetap dihitung dari polis. Fee di slip baru masuk report setelah
  polisnya dibuat dari slip itu di Policy Database.
- Grafik Trend Produksi tetap premium dan brokerage.

## File utama

- `prisma/schema.prisma`,
  `prisma/migrations/20261104090000_additional_fee_polis/migration.sql`, dan
  `prisma/migrations/20261104100000_additional_fee_placing_slip/migration.sql`.
- `lib/data/types.ts`: `additionalFee` di `Policy` dan `PlacingSlip`.
- `lib/server/policies.ts`, `app/(app)/policies/actions.ts`: fee polis.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: fee slip
  dan `slipAdditionalFee`.
- `components/underwriting/slip-model.ts`: `usesAdditionalFee`.
- `components/underwriting/placing-slip-form.tsx`: isian di kartu Brokerage.
- `components/policies/policy-form.tsx`: isian, validasi, dan salinan dari slip.
- `lib/data/analytics.ts`: `feeIdr` dan fee per kelompok.
- `components/reports/report-view.tsx`: kolom, ringkasan, dan kartu.
- `components/policies/policy-database.tsx`: kolom export.
- `components/audit/audit-fields.ts`: label audit.

## Dampak

- **Database:** dua migrasi baru, jalan otomatis saat build di Vercel dan VPS.
  Polis dan slip yang sudah ada mendapat fee 0.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Skrip simpan dan muat ke database lokal (`lch_dev`), data uji dihapus
  sesudahnya:
  - polis USD dengan fee 750 tersimpan dan terbaca 750, lalu 1.250,50 setelah
    diubah; audit trail mencatat perubahannya; simpan tanpa field fee
    menghasilkan 0;
  - fee polis USD 1.000 terhitung Rp 16.200.000 per COB dan per insurer;
  - slip Property menyimpan fee 5.000.000, Motor Vehicle 2.500, dan Marine
    Cargo 0 walaupun fee dikirim.
- Render dengan komponen asli dan CSS hasil build:
  - report dengan dua contoh fee di memori (IDR 25 juta dan USD 1.500): Total
    Additional Fee Rp 49.300.000, Pendapatan sama dengan brokerage + fee, kolom
    muncul di tabel per COB, per Insurer, dan tab Polis;
  - form slip: isian tampil untuk Property dan Motor Vehicle, tidak tampil
    untuk Marine Cargo;
  - dokumen Placing Slip tidak memuat nilai fee. Tidak ada kode dokumen cetak
    yang membaca `additionalFee`.
- Form polis berupa drawer, jadi tidak dirender statis; salinan fee dari slip
  diperiksa lewat diff dan `tsc`.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Debit Note belum memuat additional fee. Kalau fee ditagihkan ke klien lewat
  Debit Note, perlu ditambahkan terpisah.
- Kartu brokerage di Dashboard belum menambahkan fee.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
