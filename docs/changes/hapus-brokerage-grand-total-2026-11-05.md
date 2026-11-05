# Baris Brokerage di bawah GRAND TOTAL PREMIUM dihapus

- **Tanggal:** 2026-11-05
- **Branch:** `fix/hapus-brokerage-grand-total`
- **PR:** [#116](https://github.com/agussusanto17/lch-ins/pull/116)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dokumen slip Property PAR + EQVET mencetak "Brokerage : 15,00% (EXCL. VAT)"
tepat di bawah GRAND TOTAL PREMIUM (PAR+EQVET). Harry minta baris itu dihapus
(Request & Temuan REQ-031, 5 November 2026). Placing Slip dan Closing
Instruction sudah mencetak brokerage di bagian BROKERAGE sendiri, jadi baris
itu dobel.

## Yang berubah

- **PREMIUM CALCULATION** slip PAR + EQVET berhenti di GRAND TOTAL PREMIUM,
  tanpa baris Brokerage. Berlaku di Placing Slip dan Closing Instruction;
  Quotation Slip dan Cover Note memang tidak pernah mencetaknya.
- **Bagian BROKERAGE** di Placing Slip dan Closing Instruction tidak berubah.
- **Kode:** prop `showBrokerage` di `ParEqvetCalculationBlock` dan
  `showBrokerageIndicator` di `SlipRateAndPremium` dihapus, begitu juga field
  `brokeragePct` dan `includeVat` di hasil `calculateParEqvet` yang hanya
  dipakai baris itu.

## File utama

- `components/documents/doc-blocks.tsx`: `ParEqvetCalculationBlock`.
- `components/documents/slip-documents.tsx`: `SlipRateAndPremium`.
- `lib/calc.ts`: `ParEqvetCalculation`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- `ParEqvetCalculationBlock` dirender untuk slip PAR + EQVET dengan brokerage
  15%: GRAND TOTAL PREMIUM tercetak tanpa kata Brokerage. `BrokerageBlock`
  tetap mencetak "Brokerage 15,00% (EXCL. VAT)", dan masih dipakai di Placing
  Slip dan Closing Instruction.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah,
  `npx tsx --test tests/access.test.ts tests/documents.test.ts`, dan
  `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- PR ini dan [#115](https://github.com/agussusanto17/lch-ins/pull/115)
  sama-sama mengubah `doc-blocks.tsx` dan `lib/calc.ts`, tapi di bagian yang
  berbeda.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
