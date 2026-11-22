# Report: brokerage dan EF sebelum PPN, sama dengan placing

- **Tanggal:** 2026-11-22
- **Branch:** `fix/report-brokerage-ef-sebelum-ppn`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Masukan Harry (22 November 2026, lewat Agus): "kalkulasi brokerage dan EF aja dulu bro rapihin biar bener hitungannya", dan "placing dan report sama bro masih salah".

#304 (live 19.10 WIB) membuat placing menulis brokerage dan fee sebelum PPN: incl. VAT = persen ÷ 1,022, misalnya 15% incl. VAT = 14,6771%. Report sengaja belum diubah waktu itu, jadi report masih memakai persen slip kotor. Akibatnya angka report dan placing berbeda untuk polis incl. VAT. Untuk polis excl. VAT, Loss Ratio juga belum memotong PPN yang ditambahkan.

## Yang berubah

Semua report memakai aturan yang sama dengan Ringkasan Penutupan placing:

- **Brokerage dan EF** ditulis sebelum PPN. Incl. VAT: nominal ÷ 1,022. Excl. VAT: persen slip.
- **PPN** = 2,2% × nominal sebelum PPN.

Per report:

- **Rekap Produksi:**
  - Premium_Commission dan RM_Fee ditulis sebelum PPN;
  - Percentage memakai persen efektif, misalnya −14,6771%;
  - sheet Per Polis dan pendapatan Reserve Basis ikut.
- **Produksi OJK (LR 01 dan LR 02):** pendapatan jasa keperantaraan = brokerage + EF sebelum PPN, termasuk sheet Rincian.
- **Loss Ratio per Asuransi dan Loss Ratio Akun:**
  - BF dan EF ditulis sebelum PPN;
  - kolom baru **PPN**;
  - Total Outgo = BF + diskon + EF + PPN;
  - jadi Net Premium sama dengan "Net ke asuransi" di placing.
- **Report Operational:** Brokerage income dan Additional Fee (tabel dan export tab Polis) ditulis sebelum PPN.
- `lib/calc.ts`: helper `beforeVat`.

## Asumsi

- **PPN tidak ditulis sebagai pendapatan** di Rekap Produksi, OJK, dan Report Operational, karena PPN bukan pendapatan LCH.
- **Di Loss Ratio, PPN ikut dipotong dari net premium,** karena dibayar asuransi bersama brokerage dan EF.
- **Polis excl. VAT di Loss Ratio:** net premium turun sebesar PPN yang ditambahkan. Contoh tes: 42.900.000 menjadi 42.391.800. Ini sama dengan net ke asuransi sejak #298.

## File utama

- **Hitungan:** `lib/calc.ts` (`beforeVat`).
- **Rekap Produksi:** `lib/production-recap.ts` dan `lib/server/production-recap.ts`.
- **OJK:** `lib/ojk-production.ts`.
- **Loss Ratio:** `lib/loss-ratio-report.ts` dan `lib/server/loss-ratio-report.ts`.
- **Report Operational:** `lib/data/analytics.ts` (`brokerageIdr`, `feeIdr`).
- **Tes:** `tests/production-recap.test.ts` dan `tests/report-ojk-loss-ratio.test.ts`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Report:**
  - polis incl. VAT: angka brokerage dan EF turun ke nilai sebelum PPN;
  - Loss Ratio: kolom PPN baru, dan net premium polis excl. VAT turun sebesar PPN.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 420 lolos. Tes yang baru atau diubah:
  - Rekap 15% incl. VAT = −146.771,04 (14,6771%) dan EF 10% incl. VAT = −97.847,36;
  - Report Operational 1.467.710,37 dan 978.473,58;
  - Loss Ratio incl. VAT: net tetap 75.000.000; excl. VAT: net dipotong PPN.
- **Browser lokal:** Rekap Produksi Januari 2026 (ditangkap tanpa diunduh), polis 018/LCH-PLCMT/CI-MV/XI/2026 (12,5% incl. VAT, co-insurance):
  - total brokerage −961.656,07 dan EF −884.723,58;
  - nilainya sama dengan Ringkasan Penutupan slip-nya;
  - Percentage −12,2309%.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
