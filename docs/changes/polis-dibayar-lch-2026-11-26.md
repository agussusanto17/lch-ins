# Polis dibayar LCH: admin cost dan stamp duty ikut ditanggung

- **Tanggal:** 2026-11-26
- **Branch:** `feat/polis-dibayar-lch`
- **PR:** #321
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry lewat Agus, 26 November 2026, dengan screenshot Additional Discount 100%:

> "jika misalnya polis dibayarin LCH kan discount 100%, admin cost sama stamp duty juga dibayarin bro, bisa dibuatkan jadi premi yang dibayarin klien di internal calculation 0, tapi di laporan masuk ke beban juga"

Sebelumnya additional discount 100% tetap menyisakan admin cost dan stamp duty di Total Payable internal LCH (contoh Harry: IDR 120.000). Di report, beban LCH juga belum memasukkan kedua biaya itu.

## Yang berubah

- **Polis dibayar LCH:** discount + additional discount menutup seluruh gross premium (100%). Admin cost dan stamp duty ikut ditanggung LCH, jadi klien membayar 0.
  - Slip PAR + EQVET dihitung per kelompok.
  - Additional discount di bawah batas itu tidak berubah: klien tetap membayar biaya polis.
- **Form Quotation:**
  - baris "Admin cost & stamp duty ditanggung LCH";
  - Total Payable internal LCH menjadi IDR 0;
  - keterangan isian menjelaskan aturan 100%.
- **Cetakan Quotation Slip Internal LCH:**
  - baris "Admin Cost + Stamp Duty borne by LCH" (negatif) di tabel Total Payable, tabel kelompok PAR + EQVET, ringkasan jadwal lokasi, dan ringkasan jadwal objek;
  - Total Payable menjadi 0.
- **Polis dan report:** beban additional discount polis ditambah admin cost dan stamp duty polis bila polis dibayar penuh LCH. Sub akunnya tetap MARKETING-DISCOUNT BEBAN LCH. Berlaku di:
  - Rekap Produksi (baris EXPENSE, dibagi sesuai share asuransi);
  - Per Polis;
  - Reserve Basis (MARKETING EXP-DISCOUNT);
  - Laporan MOM (h);
  - Report Operational (Additional Discount);
  - keterangan isian dan kolom Additional Discount di export Policy Database.
- **Tidak berubah:** Total Payable resmi, Closing Instruction, premi dan net ke asuransi, serta brokerage.

## Asumsi

- **Polis dibayar LCH dikenali dari** discount + additional discount = 100% dari gross premium. Tidak ada saklar terpisah. Form membatasi gabungan keduanya maksimal 100% (#318).
- **Admin cost dan stamp duty yang ditanggung LCH** dicatat di sub akun yang sama dengan additional discount (MARKETING-DISCOUNT BEBAN LCH), supaya semua beban dari additional discount ada di satu tempat.

## File utama

- **Hitungan:** `lib/calc.ts` (`paidByLch`, `parEqvetGroupPaidByLch`, `slipChargesPaidByLch`, `internalTotalPayable`, `policyAdditionalDiscount`).
- **Slip:** `components/underwriting/placing-slip-form.tsx` dan `components/documents/doc-blocks.tsx`.
- **Polis dan report:**
  - `components/policies/policy-form.tsx` dan `components/policies/policy-database.tsx`;
  - `lib/production-recap.ts` dan `lib/server/production-recap.ts` (admin cost dan stamp duty polis);
  - `lib/data/analytics.ts`;
  - teks keterangan di `lib/reserve-basis.ts` dan `lib/mom-report.ts`.
- **Tes:** `tests/additional-discount.test.ts` dan `tests/additional-discount-polis.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 452 lolos. Tes yang ditambah atau diubah:
  - batas discount 10% + additional 90% sekarang Total Payable internal 0 (sebelumnya 60.000);
  - biaya ditanggung LCH 60.000 untuk slip biasa dan 100.000 (2 polis) untuk PAR + EQVET;
  - contoh Harry, premi 100.000.000 dengan additional 100% dan admin + meterai 60.000: beban 100.060.000;
  - discount 15% + additional 85%: beban 85.060.000;
  - additional 50%: tanpa biaya polis;
  - Rekap: 60.036.000 dan 40.024.000 untuk share 60/40.
- **Browser lokal**, slip 003 diberi additional discount 85% sementara (gross 8.095.000, discount 15%, admin 25.000, meterai 20.000), lalu dikembalikan:
  - **form Quotation:** Additional Discount 85% (IDR 6.880.750), admin cost & stamp duty ditanggung LCH (IDR 45.000), Total Payable internal LCH IDR 0;
  - **cetakan Quotation Internal:** "Admin Cost + Stamp Duty borne by LCH (IDR 45.000,00)", Total Payable IDR 0,00.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Kalau Finance ingin polis yang dibayar penuh LCH masuk "MARKETING-PREMI BEBAN LCH"** (kolom template yang lain), cukup ubah sub akun di `recapRows` dan kolom tujuan di Per Polis, Reserve Basis, dan Laporan MOM.
- **Catatan terkait:** `additional-discount-dari-gross-2026-11-25.md` (#318), `additional-discount-polis-2026-11-25.md` (#319), dan `additional-discount-report-operational-2026-11-25.md` (#320).
