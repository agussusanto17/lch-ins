# Premi BI slip Property tanpa Section 2

- **Tanggal:** 2026-11-05
- **Branch:** `fix/premi-bi-tanpa-section-2`
- **PR:** [#127](https://github.com/agussusanto17/lch-ins/pull/127)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Sejak rate BI dihitung otomatis dari FLEXAS, FWTWD, RSMDCC, dan Other Losses
([#115](https://github.com/agussusanto17/lch-ins/pull/115)), setiap slip
Property yang punya rate PAR juga punya rate BI PAR. Ini juga berlaku untuk
slip yang tidak punya sum insured Section 2.

Ketemu saat menyiapkan Tahap 1 multi lokasi (REQ-036). Form menghitung premi BI
slip seperti itu 0, karena Section 2 kosong. Tapi dokumen slip dan Total Payable
menghitung ulang baris BI dengan sum insured Section 1 kalau Section 2 kosong.
Akibatnya premi PAR tercetak dua kali lipat. Contoh: Section 1 IDR 1 miliar
dengan FLEXAS 0,5‰ seharusnya premi 500.000, tapi PREMIUM CALCULATION dan
Total Payable menulis 1.000.000.

## Yang berubah

- **Perhitungan PAR + EQVET:** baris Section 1 hanya memakai sum insured Section
  1, dan baris BI hanya Section 2. Sebelumnya section yang kosong memakai nilai
  section lain. Hasilnya sekarang sama dengan premi di form.
- **Rate BI kosong tanpa Section 2:** rate BI PAR dan BI EQVET hanya dihitung
  kalau sum insured Section 2 lebih dari 0. Tanpa Section 2 tidak ada jaminan
  BI, jadi rate BI tidak tercetak di bagian RATE.
- **Slip yang sudah tersimpan:** rate BI otomatis yang tersimpan di slip tanpa
  Section 2 tidak dicetak, tanpa perlu migrasi data.
- **Form:** keterangan baris BI berbunyi "Otomatis setelah sum insured Section
  2 diisi" selama Section 2 masih kosong.

## File utama

- `lib/calc.ts`: `calculateParEqvet` dan `withBiRates`.
- `components/underwriting/placing-slip-form.tsx`: keterangan baris BI.
- `tests/calc.test.ts`: tes baru untuk slip dengan dan tanpa Section 2.

## Dampak

- **Database:** tidak ada.
- **Dokumen:** Placing Slip, Quotation Slip, Cover Note, dan Closing
  Instruction slip Property tanpa Section 2 sekarang mencetak premi yang benar,
  termasuk yang sudah di-release. Total Payable di daftar slip dan premi polis
  dari slip ikut benar.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- `npx tsx --test tests/calc.test.ts`: tiga tes lulus. Tes pertama gagal di
  `main`, dengan premi PAR 1.000.000 dan seharusnya 500.000.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (24 tes lulus), dan `npm run build`: lolos.
- Database lokal tidak punya slip yang terdampak. Demo mungkin punya, karena
  slip Property tanpa Section 2 yang disimpan sejak #115 membawa rate BI.

## Catatan untuk yang melanjutkan

- Slip yang tersimpan masih menyimpan rate BI lamanya sampai disimpan ulang.
  Pengaman di `calculateParEqvet` yang membuat rate itu tidak tercetak.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
