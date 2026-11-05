# Rate Property di dokumen dicetak per mil

- **Tanggal:** 2026-11-05
- **Branch:** `fix/rate-dokumen-per-mil`
- **PR:** #126
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Rate Property diinput per mil (‰) di placing slip (REQ-025), tapi bagian RATE
dan PREMIUM CALCULATION di dokumen mencetaknya dalam persen tujuh desimal,
misalnya FLEXAS `0,0803700%`. User meminta tampilan dokumen disamakan dengan
inputan, jadi rate juga per mil (5 November 2026).

## Yang berubah

- **RATE** mencetak rate per mil enam desimal sesuai inputan:
  - FLEXAS `0,803700‰`, sebelumnya `0,0803700%`;
  - loss limit `0,405000‰ × 85% = 0,344250‰`, sebelumnya
    `0,0405000% × 85% = 0,0344250%`;
  - BI dengan indemnity period selain 12 bulan: `dasar‰ × 90% = rate‰`.
- **PREMIUM CALCULATION** mencetak `IDR … x 0,803700‰ =`.
- Persentase loss limit, skala BI, diskon, dan brokerage tetap persen.
- Nilai premi tidak berubah. Perhitungan tetap memakai rate per mil ÷ 10.
- Berlaku di semua dokumen yang memakai blok rate PAR/EQVET (Placing Slip dan
  Closing Instruction Property).

## File utama

- `lib/calc.ts`: `ratePermilText` menggantikan `ratePercentText`, dan
  `ParEqvetLine` membawa `ratePermil`.
- `components/documents/doc-blocks.tsx`: `rateFormula` dan
  `ParEqvetGroupSection` memakai teks per mil.
- `tests/rate-permil.test.ts`: format per mil enam desimal.

## Dampak

- Database: tidak ada migrasi.
- Env dan deploy: tidak ada perubahan.

## Cara verifikasi

1. `npx tsx --test tests/*.test.ts`.
2. Buka dokumen slip Property, misalnya `/underwriting/slip/<id>`. Bagian RATE
   dan PREMIUM CALCULATION menampilkan `‰`, dan premi sama dengan sebelumnya
   (contoh: IDR 365.500.000.000,00 x 0,893000‰ = IDR 326.391.500,00).

## Catatan untuk yang melanjutkan

- Ini menggantikan keputusan "dokumen tetap persen" di
  [rate-bi-otomatis-loss-limit-per-rate-2026-11-05.md](rate-bi-otomatis-loss-limit-per-rate-2026-11-05.md).
- Baris dengan loss limit belum dicoba di browser karena database lokal tidak
  punya slip ber-loss limit. Rumusnya sama dengan baris tanpa loss limit.
