# PPN 2,2% excl. VAT ditambahkan di atas brokerage dan additional fee

- **Tanggal:** 2026-11-20
- **Branch:** `fix/ppn-brokerage-fee-excl`
- **PR:** #298
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 20 November 2026, dengan screenshot panel fee per asuransi dan Ringkasan Penutupan slip co-insurance 9 asuransi: "settingan include exclude belum sesuai bro masih salah hitungannya".

Sebelumnya saklar Incl. VAT (brokerage per slip, fee per asuransi) hanya memecah PPN yang sudah ada di dalam nominal. Excl. VAT diperlakukan seperti tanpa PPN sama sekali. Akibatnya nominal brokerage dan fee, Net ke asuransi, dan pendapatan LCH sama saja untuk incl. maupun excl.

Contoh slip LCH menulis "Brokerage 15% excl. VAT" dan "20.00% EXCL. VAT" (CI CV Unggul Utama Jaya, PT Salam Pacific Indonesia Lines, Rukma Padaya Trans): komisi belum termasuk PPN, dan PPN 2,2% (11% × DPP 20%, PMK 67/PMK.03/2022) ditambahkan di atasnya. Skema Credit Note Phase 2 juga sudah memotong PPN dari premi yang disetor ke asuransi.

## Yang berubah

- **Aturan PPN 2,2%:**
  - **Incl. VAT:** nominal brokerage atau fee sudah termasuk PPN. Tidak ada tambahan; PPN di dalamnya tetap ditampilkan sebagai info.
  - **Excl. VAT:** PPN 2,2% ditambahkan di atas nominal, lalu ikut dipotong dari premi yang disetor ke asuransi.
- **Ringkasan Penutupan (form slip):**
  - Baris baru "PPN 2,2% atas brokerage" dan "PPN 2,2% atas additional fee", hanya bila ada bagian yang excl. VAT.
  - **Nett Premium ke asuransi** = Gross Premium − diskon − brokerage − additional fee − PPN excl. VAT.
  - **Pendapatan LCH** = brokerage + fee + PPN yang ditambahkan. Keterangannya menulis PPN total (di dalam maupun ditambahkan) dan pendapatan sebelum PPN.
  - **Rincian per asuransi:** kolom baru "PPN 2,2% excl." berisi PPN brokerage bagian asuransi itu ditambah PPN fee-nya bila fee asuransi itu excl. VAT. Net per asuransi ikut dikurangi. Asuransi terakhir menampung selisih pembulatan, jadi jumlahnya sama dengan total.
- **Bagian Brokerage:** untuk excl. VAT tampil "PPN 2,2% (ditambahkan)" dan "Brokerage + PPN".
- **Panel Security:**
  - Nominal fee asuransi yang excl. VAT tampil "IDR x + PPN IDR y".
  - Ringkasan fee menambah "PPN 2,2% (ditambahkan)".
- **Form polis:** keterangan brokerage dan additional fee menulis "+ PPN 2,2% … (excl. VAT)", dan Nett Premium di keterangan Diskon ikut dikurangi PPN excl. VAT.

## Tidak berubah

- Nominal brokerage dan additional fee yang tersimpan di polis dan report (premi × persen).
- Rekap Produksi: `Premium_Commission`, `RM_Fee`, dan `(Income)/Beban` tetap komisi dan fee tanpa PPN, karena PPN adalah pajak, bukan pendapatan.
- Dokumen tidak mencetak net premium (instruksi LCH).
- Loss ratio tetap mengikuti sheet Perhitungan LOSS RATIO dari Team LCH.

## File utama

- `lib/calc.ts`: `vatAdded`, `brokerageVatAdded`, `additionalFeeVatAddedFor`, `additionalFeeVatAddedAmount`, dan `nettPremium` dengan `vatAdded`.
- `lib/closing-summary.ts` dan `components/underwriting/closing-summary.tsx`: PPN excl. VAT di ringkasan dan rincian per asuransi.
- `components/underwriting/placing-slip-form.tsx`: bagian Brokerage dan panel Security.
- `components/policies/policy-form.tsx`: keterangan brokerage, fee, dan Nett Premium.
- `tests/ppn-excl-vat.test.ts` (baru), `tests/closing-summary.test.ts`, dan `tests/gross-premium-loss-ratio.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** biasa.
- **SIT-117:** angka Net ke asuransi di test case ini berubah karena fee Sinar Mas 10% excl. VAT sekarang ditambah PPN 6.919. Net total 5.778.937,50 menjadi 5.772.018,50, dan Net Sinar Mas 2.358.750 menjadi 2.351.831. Kalau sheet SIT mencatat angka net lama, perlu diperbarui.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 390 lolos.
  - 4 test baru: tarif PPN, ringkasan co-insurance campuran incl. dan excl. (brokerage 15% excl., fee A 10% incl., fee B 12,5% excl.), semua incl. tanpa tambahan, dan Nett Premium polis.
  - Test lama SIT-117, COB tanpa fee, dan diskon slip diperbarui ke aturan baru.
- **Browser lokal**, slip 021/LCH-PLCMT/PS-MV/XI/2026 (premi 14.387.500, Astra Buana 60% fee 12,5% incl. VAT, Sinar Mas 40% fee 10%), saklar diubah tanpa disimpan:
  - **Fee Sinar Mas excl. VAT:**
    - panel menulis "IDR 575.500 + PPN IDR 12.661";
    - ringkasan menambah "PPN 2,2% atas additional fee 12.661";
    - Net ke asuransi turun dari 10.574.812,50 ke 10.562.151,50.
  - **Brokerage 15% excl. VAT:**
    - "PPN 2,2% (ditambahkan) 47.478,75" dan "Brokerage + PPN 2.205.603,75";
    - Net 10.514.672,75;
    - PPN per asuransi 28.487,25 (Astra Buana) dan 31.652,50 (Sinar Mas = 18.991,50 + 12.661).
  - Halaman ditinggalkan tanpa simpan. Slip tidak berubah dan audit tetap 527.

## Catatan untuk yang melanjutkan

- **Pemungut PPN:** Credit Note Phase 2 (`credit_notes.ppn_amount`) sebaiknya memakai aturan yang sama: PPN brokerage excl. VAT dipotong dari net ke asuransi. Kalau ternyata asuransi yang memungut PPN dan LCH tidak memotongnya, cukup ubah `vatAdded`.
- **PPh 23** atas komisi belum dihitung di ringkasan.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
