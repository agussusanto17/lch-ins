# Endorsement dan cancellation slip dicetak dalam bahasa Inggris saja

- **Tanggal:** 2026-11-12
- **Branch:** `fix/endorsement-slip-bahasa-inggris`
- **PR:** [#226](https://github.com/agussusanto17/lch-ins/pull/226)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Cetakan endorsement dari Policy Database (#215, #220) dan dari Placement (#221) memakai label dua bahasa seperti contoh EDM 01 asuransi: Indonesia di atas, Inggris miring di bawahnya. Kalimat pembuka dan isinya berbahasa Indonesia.

Harry, 12 November 2026, sambil melampirkan cetakan endorsement polis 45020125022398: "ga usah pakai 2 bahasa bro, endorsement slipnya pakai bahasa inggris aja."

## Yang berubah

Berlaku untuk kedua cetakan, karena keduanya memakai komponen yang sama:
- cetak endorsement dan cancellation slip dari Placement (`/placement/endorsement/[id]`);
- cetak endorsement dan cancellation dari Policy Database.

- **Data polis**: label hanya bahasa Inggris (`BilingualTable` menjadi `DetailTable`):
  - Endorsement No.
  - Attaching to and forming part of Policy No.
  - Name of Insured
  - Address of Insured
  - Period of Insurance
  - Type of Cover
  - Sum Insured
  - Change of Sum Insured
  - Sum Insured after Endorsement
  - Deductible
- **Kalimat pembuka** (`endorsementOpening`), strukturnya tetap seperti contoh asuransi:
  - endorsement: "It is hereby noted and agreed that with effect from 12 November 2026, the above-mentioned policy is amended as follows:";
  - pembatalan: "It is hereby noted and agreed that with effect from 01 December 2026:".
- **Penutup**: "All other terms and conditions remain unchanged." (`TERMS_UNCHANGED`).
- **Pembatalan tanpa uraian** sekarang tercetak "This policy is CANCELLED."
- **Perhitungan premi**:
  - judul PREMIUM CALCULATION;
  - baris "Period: … · pro rata 354/365 days", atau "from inception, full premium" kalau per awal polis;
  - kolom Cover, Value × Rate, Pro Rata, Premium;
  - kelompok "Previous calculation (refunded)" dan "New calculation (charged)";
  - selisihnya Additional Premium atau Return Premium (`premiumAdjustmentLabel` sekarang mengembalikan satu label);
  - Discount, Administration Cost, Stamp Duty, dan Total.
- **Tanggal** di cetakan memakai format Inggris `dateEn` ("01 December 2026"), termasuk baris "Jakarta, …".
- **Tanda tangan**: "Prepared by,". `SignatureGrid` mendapat prop `preparedBy`; dokumen lain tetap "Disiapkan oleh / Prepared by,".
- **Form**:
  - contoh uraian di bagian Endorsement/Cancellation form slip dan di Remarks form Policy Database sekarang berbahasa Inggris;
  - keterangan field mengingatkan bahwa slip dicetak dalam bahasa Inggris, jadi uraian ditulis dalam bahasa Inggris.

## File utama

- `lib/endorsement-slip.ts`: `endorsementOpening`, `endorsementBody`, `premiumAdjustmentLabel`, `TERMS_UNCHANGED`.
- `components/documents/endorsement-document.tsx`: `DetailTable`, cetak Policy Database.
- `components/documents/endorsement-slip-document.tsx`: cetak Placement.
- `components/documents/doc-blocks.tsx`: prop `preparedBy` di `SignatureGrid`.
- `components/underwriting/endorsement-section.tsx`, `components/policies/policy-form.tsx`: contoh dan keterangan uraian.
- `tests/endorsement-slip.test.ts`: ekspektasi kalimat dan label baru.

## Dampak

- **Database:** tidak ada. Uraian dan remarks yang sudah tersimpan tetap tercetak apa adanya. Kalau isinya berbahasa Indonesia, isi itu tetap berbahasa Indonesia di cetakan.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint app components lib tests next.config.ts --quiet`, `npx tsx --test tests/*.test.ts` (209 tes), dan `npm run build`: lolos.
- **Uji browser ujung ke ujung** (Playwright dan Chrome, sesi sementara, worktree di port 3001), dengan slip MV uji 018/LCH-PLCMT/PS-MV/XI/2026 sampai Closed:
  1. **Form ES** menampilkan petunjuk bahasa Inggris dan contoh "Example: The sum insured is amended from …".
  2. **Cetak ES 019 dari Placement** memuat semua label dan kalimat bahasa Inggris di atas, termasuk Additional Premium IDR 492.205,48 (354/365 hari), Total IDR 512.205,48, "Jakarta, 12 November 2026", dan "Prepared by,". Tidak ada satu pun dari 21 label atau kalimat Indonesia lama di lembar cetaknya.
  3. **Cetak record ES di Policy Database**: sama, tanpa teks Indonesia.
  4. **Cetak CS 020 dari Placement**:
     - "with effect from 01 December 2026:" dan pro rata 335/365 days;
     - Return Premium (IDR 7.682.054,79), Total (IDR 7.662.054,79);
     - tanpa perhitungan sesudah.

     Cetak record-nya di Policy Database juga bahasa Inggris.
  5. **Regresi**: closing instruction tetap "Disiapkan oleh / Prepared by,".
  6. Tidak ada error di console. Data uji (slip, polis, audit) dihapus per id, dan counter PS kembali ke 17.

## Catatan untuk yang melanjutkan

- **Format angka tetap format Indonesia** (IDR 525.000.000,00 dan 1,3%), sama seperti dokumen slip LCH lainnya.
- **Stempel kecil "Dicetak: …"** di footer kop tetap, karena dipakai semua dokumen.
- **Isi data tetap apa adanya**: nama jaminan, deductible, dan type of cover diambil dari slip, sehingga bisa berbahasa Indonesia kalau diisi begitu.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
