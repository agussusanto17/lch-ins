# Ringkasan penutupan: net premi ke asuransi dan pendapatan LCH

- **Tanggal:** 2026-11-13
- **Branch:** `feat/ringkasan-net-closing`
- **PR:** [#244](https://github.com/agussusanto17/lch-ins/pull/244)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Permintaan Agus, 13 November 2026:** sebelum Closing Instruction diterbitkan, tampilkan hitungan premi − brokerage − additional fee.
- **Isi hitungan itu:** premi − brokerage − additional fee adalah net premi yang disetor ke asuransi. Pendapatan LCH adalah brokerage + additional fee, dan keduanya dikenai PPN 2,2% sebagai jasa broker. Karena itu keduanya ditampilkan, masing-masing dengan labelnya.
- **Yang sudah ada:** `netPremium` (premi − brokerage) di `lib/calc.ts`, tanpa additional fee. Net premium tidak dicetak di dokumen atas permintaan LCH.

## Yang berubah

- **Form Closing, kartu baru Ringkasan Penutupan** sesudah Security (Panel Asuransi). Kartu tampil di form closing dan slip Closed, kecuali endorsement/cancellation slip dan open cover. Isinya:
  - Premi bruto.
  - Brokerage dengan persen dan status VAT-nya.
  - Additional fee, hanya untuk Property dan Motor Vehicle.
  - **Net premi ke asuransi** = premi − brokerage − additional fee.
  - **Pendapatan LCH** = brokerage + additional fee, dengan PPN 2,2% di dalamnya dan nilai sebelum PPN bila ada yang termasuk PPN.
  - Co-insurance mendapat rincian per asuransi sesuai share: premi, brokerage, additional fee, dan net ke asuransi. Asuransi terakhir menampung selisih pembulatan, supaya rinciannya sama dengan total.
  - Bila slip memakai diskon, keterangan di bawahnya menyebut bahwa premi yang dipakai adalah premi sebelum diskon, sama dengan dasar brokerage dan additional fee.
- **Dialog Terbitkan Closing Instruction?** menampilkan ringkasan yang sama tanpa rincian per asuransi.
- Ringkasan hanya tampil di form, tidak dicetak.

## File utama

- `lib/closing-summary.ts`: `closingSummary`.
- `components/underwriting/closing-summary.tsx`: `ClosingSummaryPanel`.
- `components/underwriting/placing-slip-form.tsx`: kartu Ringkasan Penutupan dan dialog Terbitkan Closing Instruction.
- `tests/closing-summary.test.ts`: 3 tes (angka SIT-117, COB tanpa additional fee, pembulatan co-insurance).

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos, kecuali 3 tes margin cetak 18 mm di `tests/documents.test.ts` yang sudah gagal di main sejak #236.
- **Uji browser lokal** (build `next start`, sesi admin sementara, DB lokal):
  - **Slip 021 (MV co-insurance 60/40, fee 12,5% dan 10%):** premi IDR 14.387.500 − brokerage 15% incl. VAT IDR 2.158.125 − additional fee IDR 1.654.562,50 = net IDR 10.574.812,50. Pendapatan LCH IDR 3.812.687,50, termasuk PPN IDR 82.073,50. Rincian Astra Buana net IDR 6.258.562,50 dan Sinar Mas IDR 4.316.250; jumlahnya sama dengan total.
  - **Slip 005 (Marine Cargo USD, Quoted):** kartu tanpa baris additional fee, net USD 5.315,62. Dialog Terbitkan Closing Instruction menampilkan ringkasan yang sama. Batal menutup dialog, dan slip tetap Quoted.
  - **Slip PA 012:** net IDR 510.000 dari premi IDR 600.000 dan brokerage IDR 90.000.
  - Kartu tidak tampil di form quotation dan di endorsement slip 019.
  - Tidak ada error console.

## Catatan untuk yang melanjutkan

- Bagian B (Credit Note per insurer) bisa memakai `closingSummary(slip).insurers` untuk net premi per asuransi.
- Biaya polis dan meterai tidak ikut hitungan ini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
