# EF MAG mengikuti produksi MAG (27,17%)

- **Tanggal:** 2026-11-23
- **Branch:** `fix/ef-mag-sesuai-produksi`
- **PR:** #315
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 23 November 2026, dengan screenshot Rekap Produksi dan kolom TARIF EF: "MAG presentase masih belum sesuai … mag sesuai ini rate EF seharusnya".

- **Rekap Produksi menulis EF (MAG) −26,90%,** yaitu EF 27,5% incl. VAT × 97,8% (aturan umum #312).
- **Sheet "2 NOV -disc 35,61%"** (`documents/Scenario D'Best 2026-2027 - rev. 3.11.2026.xlsx`, di luar repo) menghitung baris MAG berbeda dari asuransi lain:
  - kolom O–Q "ef (sesuai prod mag)": total outgo 42,5% − komisi 15% − PPN atas komisi (2,2%) 0,33% = **27,17%** (2025: 40% − 15% − 0,33% = 24,67%);
  - catatannya "OUTGO 42.5% - FB 15% EXCL VAT DAN EF 27.5% INCL VAT";
  - asuransi lain tetap EF × 97,8%, termasuk CTII yang catatannya sama-sama "FB 15% EXCL VAT DAN EF 32.5% INCL VAT".
- **Artinya di produksi MAG,** EF tidak kena PPN sendiri. PPN-nya hanya PPN atas komisi, dan PPN itu diambil dari EF di dalam total outgo 42,5%.

## Yang berubah

- **Aturan baru:** asuransi dengan Sub akun EF "EF (MAG)" (kode `ef_mag`) dan additional fee incl. VAT memakai aturan produksi MAG:
  - EF sebelum PPN = fee − PPN komisi (2,2% × brokerage sebelum PPN bagian asuransi itu), misalnya 27,5% − 0,33% = 27,17%;
  - EF MAG tidak kena PPN sendiri, jadi PPN totalnya hanya PPN komisi;
  - net ke asuransi = premi − diskon − brokerage − EF, karena PPN komisi sudah di dalam EF. Outgo 42,5%, net 57,5%; sebelumnya 57,17% karena PPN komisi ditambahkan lagi;
  - brokerage incl. VAT: PPN komisi sudah di dalam brokerage, jadi EF MAG utuh.
- **Tidak berubah:** fee excl. VAT, fee 0%, dan asuransi lain tetap memakai aturan umum.
- **Berlaku sama di semua tempat:**
  - **Placing:** Ringkasan Penutupan (additional fee, PPN, net, pendapatan, rincian co-insurance per asuransi). Hint dan catatan kaki menyebut aturan MAG.
  - **Form polis:** keterangan Additional Fee ("… + PPN komisi … (EF MAG, sesuai produksi MAG)") dan Nett Premium.
  - **Report:** Rekap Produksi (RM_Fee dan Percentage baris EF (MAG), sheet Per Polis), Reserve Basis dan Laporan MOM (dari Rekap), Produksi OJK, Loss Ratio (EF, PPN, total outgo, net premium), dan Report Operational (additional fee).
  - **Teks keterangan** di Rekap, OJK, dan Loss Ratio.
- **Master Data > Asuransi & Adjuster:** keterangan pilihan Sub akun EF sekarang menyebut bahwa EF (MAG) juga mengatur cara hitung EF.
- **Data asuransi untuk form:** pilihan asuransi di form dan data polis membawa kode Sub akun EF, supaya placing, form polis, dan report memakai penanda MAG yang sama.

## Asumsi

- **MAG ditandai lewat Sub akun EF "EF (MAG)",** bukan nama asuransi. Sejak #302, Multi Artha Guna sudah diatur ke EF (MAG), dan screenshot Agus menunjukkan sub akun EF (MAG) di produksi.
- **Kombinasi brokerage incl. VAT dengan EF MAG incl. VAT** tidak ada di sheet. Dibuat konsisten dengan model MAG: PPN hanya atas komisi, dan PPN itu sudah di dalam brokerage.

## File utama

- **Hitungan:** `lib/calc.ts` (`magCommissionVat`, `magFeeRule`, `insurerFeeBeforeVat`, `additionalFeeBeforeVatFor`, `magCommissionVatFor`, `withFeeSubAccounts`, dan `feeBeforeVat` / `feeVatInside` dengan parameter MAG).
- **Placing:** `lib/closing-summary.ts`, `components/underwriting/closing-summary.tsx`, dan `components/underwriting/placing-slip-form.tsx`.
- **Polis:** `components/policies/policy-form.tsx` dan `lib/server/policies.ts`.
- **Report:**
  - `lib/production-recap.ts`, `lib/ojk-production.ts`, `lib/loss-ratio-report.ts` (dan loader server-nya), dan `lib/data/analytics.ts`;
  - `lib/mom-report.ts`: konstanta MAG pindah ke `calc.ts`.
- **Data:** `lib/data/types.ts` (`SecurityPanelRow.feeSubAccountCode`), `lib/form-options.ts`, dan `lib/server/form-options.ts`.
- **Master Data:** `components/master-data/insurers-adjusters-tab.tsx`.
- **Tes:** `tests/ef-mag.test.ts` (baru).

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Angka:** polis dan slip MAG dengan EF incl. VAT dihitung ulang saat ditampilkan, karena nilainya tidak disimpan. Untuk outgo 42,5% (15% + 27,5%):
  - EF sebelum PPN naik dari 26,895% menjadi 27,17%;
  - PPN turun dari 0,935% menjadi 0,33%;
  - net ke MAG naik dari 57,17% menjadi 57,5%.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 439 lolos. Angka tes lama tidak berubah. Tes baru:
  - angka sheet: premi 1.563.343.723,45 → EF MAG 424.760.489,66;
  - Rekap: Percentage EF (MAG) −27,17%, asuransi lain −26,895%;
  - Ringkasan Penutupan: MAG 100% net 57,5%, aturan umum tanpa kode, brokerage incl. VAT, dan co-insurance MAG 60% + Astra 40%;
  - Nett Premium form polis, outgo Loss Ratio 42,5%, dan fee Report Operational.
- **Browser lokal.** Slip/polis 022 diubah sementara ke MAG dengan EF 27,5% incl. VAT dan brokerage 15% excl. VAT, lalu dikembalikan:
  - **Ringkasan Penutupan:** brokerage 937.500, PPN 20.625, additional fee 1.698.125, net 3.593.750, pendapatan LCH 2.656.250;
  - **Rekap Produksi November 2026:** baris EF (MAG) −1.698.125, Percentage −27,17%;
  - **form polis:** "IDR 1.698.125 + PPN komisi IDR 20.625 (EF MAG, sesuai produksi MAG)", Nett Premium 3.593.750.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Kalau asuransi lain juga ingin dihitung seperti MAG,** pilih Sub akun EF-nya "EF (MAG)". Sub akun pnl di Rekap ikut menjadi EF (MAG). Kalau itu tidak diinginkan, perlu saklar terpisah per asuransi.
- **Catatan lama yang terkait:**
  - `ef-incl-vat-97-8-2026-11-23.md` (#312, aturan umum EF × 97,8%);
  - `sub-akun-ef-spil-master-data-2026-11-22.md` (#302, Sub akun EF per asuransi).
