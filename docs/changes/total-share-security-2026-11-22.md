# Baris Total Share di bawah SECURITY

- **Tanggal:** 2026-11-22
- **Branch:** `feat/total-share-security`
- **PR:** #310
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 22 November 2026, dengan contoh blok SECURITY berisi tujuh asuransi: "tambahin dibawahnya total share = 100%".

## Yang berubah

- **Blok SECURITY di cetakan:** baris tebal **Total Share** ditambahkan di bawah daftar asuransi, misalnya "Total Share 100,00%".
  - Berlaku di Quotation Slip, Cover Note, Closing Instruction, dan cetak endorsement, yaitu semua dokumen yang memakai `SecurityTable`.
  - Hanya untuk co-insurance (lebih dari satu asuransi). Satu asuransi sudah tertulis 100% di barisnya sendiri.
  - Nilainya dijumlah dari share yang tercatat (`sumPercent`). Kalau share belum genap 100%, angka sebenarnya yang tercetak, jadi terlihat sebelum dokumen dikirim.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npm run build`, dan `node --import tsx --test tests/*.test.ts` (420 lolos): lolos.
- **Browser lokal:** Closing Instruction slip 018/LCH-PLCMT/PS-MV/XI/2026 menampilkan SECURITY Astra Buana 60,00% (As Leader), Sinar Mas 40,00% (As Member), lalu "Total Share 100,00%".
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
