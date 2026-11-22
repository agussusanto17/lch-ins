# Brokerage incl. VAT ditulis sebelum PPN

- **Tanggal:** 2026-11-22
- **Branch:** `fix/brokerage-incl-vat`, ditumpuk di atas `feat/premi-klien-deklarasi` (#303)
- **PR:** #304
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Masukan Agus dan Harry, 22 November 2026:

- Saklar PPN brokerage di placing slip tidak mengubah nilai brokerage.
- Cetakan "Brokerage 15,00% (INCL. VAT) IDR 13.750.200,00" seharusnya bernilai lebih kecil. Kalau include VAT, persennya bukan 15% tapi 14,6771%, yaitu 13.454.207,44. Kalau exclude VAT, baru 15% = 13.750.200.

Sebelumnya, di #298, nilai brokerage selalu premi × persen slip. Untuk incl. VAT, PPN-nya hanya disebut "termasuk" di form, sedangkan cetakan dan Ringkasan Penutupan tetap menulis 15%.

## Yang berubah

- **Nilai brokerage = komisi sebelum PPN** (`brokerageAmount`):
  - incl. VAT: premi × persen ÷ 1,022 (15% menjadi 14,6771%);
  - excl. VAT: premi × persen, dan PPN 2,2% ditambahkan di atasnya.
- **`brokerageGross`** (baru): brokerage menurut persen slip. Ini dasar PPN di dalam brokerage incl. VAT.
- **Cetak PS dan CI:** baris Brokerage menulis nilai sebelum PPN, misalnya "Brokerage 15,00% (INCL. VAT) IDR 13.454.207,44".
- **Placing slip, panel Brokerage:**
  - "Nilai Brokerage (sebelum PPN)";
  - incl. VAT menampilkan PPN yang termasuk dan "Brokerage + PPN (15% incl. VAT)";
  - excl. VAT menampilkan PPN yang ditambahkan.
- **Ringkasan Penutupan:**
  - brokerage dan additional fee ditulis sebelum PPN;
  - PPN di dalam nominal (incl.) maupun yang ditambahkan (excl.) masuk baris PPN dan kolom **PPN 2,2%**. Sebelumnya kolomnya "PPN 2,2% excl.";
  - Nett Premium ke asuransi dan Pendapatan LCH tidak berubah nilainya.
- **Policy Database, form polis:** keterangan brokerage dan fee ditulis "nominal sebelum PPN + PPN 2,2% (incl./excl. VAT)".

## Asumsi

- **Additional fee incl. VAT ikut aturan yang sama** (fee ÷ 1,022 + PPN) di Ringkasan Penutupan dan form polis, supaya kolom PPN berisi semua PPN. Additional fee tidak dicetak di dokumen.
- **Report tidak diubah.** Rekap Produksi, Reserve Basis, OJK, dan loss ratio masih menghitung komisi dari persen slip tanpa memisahkan PPN incl. VAT. Bila report juga harus memakai 14,6771%, perlu PR terpisah.

## File utama

- **Hitungan:** `lib/calc.ts` (`brokerageGross`, `brokerageAmount`, `brokerageVatAmount`, `netPremium`) dan `lib/closing-summary.ts`.
- **Tampilan:**
  - `components/underwriting/closing-summary.tsx`;
  - `components/underwriting/placing-slip-form.tsx`;
  - `components/policies/policy-form.tsx`.
- **Tes:** `tests/closing-summary.test.ts` dan `tests/ppn-excl-vat.test.ts`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Merge setelah #303, lalu base PR ini diganti ke `main`.
- **Dokumen:** nilai brokerage di cetakan PS dan CI untuk slip incl. VAT turun menjadi nilai sebelum PPN.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: semua lolos. Tes yang baru atau diubah:
  - contoh Agus: premi 91.668.000, 15% incl. VAT = 13.454.207,44 + PPN 295.992,56; excl. VAT = 13.750.200 + PPN 302.504,40;
  - SIT-117 dan slip co-insurance: brokerage dan fee sebelum PPN, kolom PPN, sedangkan net dan pendapatan tetap.
- **Browser lokal** (`lch.localhost:3002`), slip 018/LCH-PLCMT/PS-MV/XI/2026 (12,5% incl. VAT):
  - panel Brokerage: efektif 12,2309%, sebelum PPN 961.656,07, PPN 21.156,43, total 982.812,50;
  - Ringkasan Penutupan: kolom PPN 2,2%, net ke asuransi tetap 5.975.500;
  - cetakan Placing Slip: "Brokerage 12,50% (INCL. VAT) IDR 961.656,07".
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
