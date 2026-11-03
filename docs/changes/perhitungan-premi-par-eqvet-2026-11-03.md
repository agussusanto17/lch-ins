# Standarisasi perhitungan premi PAR + EQVET pada dokumen cetak

- **Tanggal:** 2026-11-03
- **Branch:** `feat/premium-calculation-par-eqvet`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

LCH meminta standarisasi tampilan tarif dan perhitungan premi pada slip Property (PAR + EQVET) sesuai contoh dokumen operasional LCH (Image 4 & 5):
1. **Bagian RATE (Image 5):** Menampilkan nama lengkap peril baku dengan akronim dan format tarif persen 5 desimal (contoh: `Fire, Lightning, Explosion, Impact by Falling Aircraft and Smoke Damage (FLEXAS) : 0,03850%`, `Earthquake, Volcanic Eruption and Tsunami (EQVET) : 0,14300%`).
2. **Bagian PREMIUM CALCULATION (Image 4):**
   - Dikelompokkan ke dalam dua grup perhitungan terpisah: **PAR** dan **EQVET**.
   - Formula terbuka per baris: `Cover : SumInsured x Rate% = LinePremium`.
   - Subtotal premi per grup (`Premium PAR` / `Premium EQVET`).
   - Diskon per grup (`Discount (X%)` = Subtotal x diskon %).
   - Premi setelah diskon (`Premium after discount`).
   - Biaya polis + meterai per grup: Rp 50.000 per grup (atau `slip.adminCost`).
   - Total premi per grup (`Total Premium PAR` / `Total Premium EQVET`).
   - Grand total kedua grup: `GRAND TOTAL PREMIUM (PAR+EQVET)`.
   - Baris indikator brokerage: `Brokerage : X% (EXCL. VAT)` atau `(INCL. VAT)` di bawah Grand Total (Placing Slip & Closing Instruction).
   - Tabel rincian nominal brokerage yang sudah ada di Placing Slip & Closing Instruction tetap dipertahankan.
   - Angka nominal menggunakan format Indonesia (`IDR ... ,00`).
   - Slip non-Property (Motor Vehicle, Marine Cargo, dll.) tetap memakai format tabel standar tanpa perubahan.

## Yang berubah

- **`lib/data/reference.ts`**:
  - Menambahkan kamus `PAR_EQVET_FULL_NAMES` untuk nama lengkap peril pada blok RATE sesuai Image 5.
  - Menambahkan kamus `PAR_EQVET_FORMULA_NAMES` untuk akronim formula perhitungan pada blok PREMIUM CALCULATION.
- **`lib/format.ts`**:
  - Menambahkan helper `ratePercent5` untuk memformat nilai tarif dalam persen dengan 5 digit desimal (misalnya `0,03850%`).
- **`lib/calc.ts`**:
  - Menambahkan `isParEqvetSlip(slip)` untuk mendeteksi slip Property dengan baris tarif PAR/EQVET.
  - Menambahkan engine perhitungan `calculateParEqvet(slip)` yang mengelompokkan peril ke grup PAR dan EQVET, menghitung basis (Section 1 vs Section 2 untuk BI), mengonversi tarif ‰ ke % (`rate / 10`), menghitung subtotal, diskon proporsional grup, biaya polis per grup (Rp 50.000), total grup, dan Grand Total.
  - Memperbarui `totalPayable(slip)` agar mengembalikan `calculateParEqvet(slip).grandTotal` saat slip terdeteksi sebagai slip PAR+EQVET.
- **`components/documents/doc-blocks.tsx`**:
  - Mengimplementasikan `ParEqvetRateBlock` untuk merender daftar peril bertarif 5 desimal sesuai Image 5.
  - Mengimplementasikan `ParEqvetCalculationBlock` dan `ParEqvetGroupSection` untuk merender perhitungan berjenjang grup PAR, grup EQVET, Grand Total, dan indikator brokerage sesuai Image 4.
- **`components/documents/slip-documents.tsx`**:
  - Menambahkan helper `SlipRateAndPremium` untuk merender blok PAR+EQVET secara kondisional pada Placing Slip, Quotation Slip, Cover Note, dan Closing Instruction.
  - Menyembunyikan indikator brokerage pada Quotation Slip dan Cover Note (sesuai aturan bisnis LCH bahwa Quotation dan Cover Note tidak menampilkan informasi komisi broker).

## File utama

- `lib/calc.ts`: engine perhitungan berjenjang PAR & EQVET (`calculateParEqvet`, `isParEqvetSlip`).
- `lib/data/reference.ts`: nama peril standar dan akronim formula.
- `lib/format.ts`: formatter tarif 5 desimal `ratePercent5`.
- `components/documents/doc-blocks.tsx`: komponen `ParEqvetRateBlock` dan `ParEqvetCalculationBlock`.
- `components/documents/slip-documents.tsx`: integrasi ke Placing Slip, Quotation Slip, Cover Note, dan Closing Instruction.

## Dampak

- **Database:** tidak ada perubahan skema atau data.
- **Env:** tidak ada.
- **Deploy:** standar.

## Verifikasi

- `npx tsc --noEmit` lolos (0 error).
- `npx eslint` pada file yang diubah lolos (0 error/warning).
- `npm run build` lolos, 33 rute teroptimasi tanpa kendala.
- Verifikasi matematis node script: data sampel Image 4 (`130 Miliar`, rate `0,385‰` dkk, diskon `12,5%`, brokerage `15%`) menghasilkan angka persis `IDR 263.454.000,00` hingga digit sen.
- Verifikasi E2E via `ego-browser` pada server lokal (`http://localhost:3000`):
  - Slip PAR + EQVET `530ec849-a92f-4392-83e8-46a39b888975`:
    - **Placing Slip**: Menampilkan heading `RATE` dengan 7 peril berformat 5 desimal, heading `PREMIUM CALCULATION` dengan formula grup PAR & EQVET, subtotal, diskon, biaya polis, Grand Total `IDR 616.327.075,00`, indikator `Brokerage : 12,50% (INCL. VAT)`, serta tabel rincian nominal brokerage di bawahnya.
    - **Quotation Slip**: Menampilkan blok RATE & PREMIUM CALCULATION tanpa baris indikator brokerage dan tanpa tabel brokerage.
    - **Cover Note**: Menampilkan blok RATE & PREMIUM CALCULATION tanpa indikator brokerage.
    - **Closing Instruction**: Menampilkan blok RATE & PREMIUM CALCULATION lengkap dengan indikator brokerage dan tabel rincian nominal brokerage.
  - Slip Motor Vehicle `94dd26d9-b452-4349-b2be-a39e1ebb91ba`:
    - Tetap menampilkan heading `RATE & PREMIUM` dan tabel premi/payable standar (regresi nol).

## Catatan untuk yang melanjutkan

- Konversi matematika dari database: tarif Property di `rateLines` disimpan dalam per mil (‰). Untuk ditampilkan dalam persen (%) 5 desimal, rumus konversinya adalah `ratePercent = rate / 10`. Dengan konversi ini, `SumInsured x ratePercent%` menghasilkan nominal premi yang persis sama dengan perhitungan per mil.
- Biaya polis bawaan per grup PAR dan EQVET adalah Rp 50.000 jika `slip.adminCost` tidak diisi (sehingga total biaya polis kedua grup adalah Rp 100.000). Jika `slip.adminCost` diisi, nilainya diterapkan per grup.
