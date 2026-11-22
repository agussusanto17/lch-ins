# Sharing komisi ke LCH Singapore

- **Tanggal:** 2026-11-22
- **Branch:** `feat/sharing-komisi-sg`, ditumpuk di atas `fix/brokerage-incl-vat` (#304)
- **PR:** #306
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 22 November 2026: "Komisi kan kadang kita sharing ke singapore, nah tambahin input komisi jika ada sharing dengan kantor kita di singapore bro di Placing form."

## Yang berubah

- **Placing slip, bagian Brokerage:**
  - isian baru **Sharing Komisi LCH Singapore (%)**, dalam persen dari brokerage;
  - keterangannya menampilkan nominal ke LCH Singapore dan sisa untuk LCH Indonesia;
  - tidak dicetak di dokumen.
- **Ringkasan Penutupan:** baris "Sharing komisi LCH Singapore {persen}%" dan "Pendapatan LCH Indonesia". Net ke asuransi tidak berubah.
- **Policy Database:**
  - persen sharing ikut ke polis saat dicatat dari CI, dan revisi slip ikut mengubahnya;
  - deklarasi MOP mengikuti polis MOP-nya;
  - form polis punya isian yang sama, terkunci untuk polis dari slip;
  - export: kolom "Sharing Komisi LCH SG (%)".
- **Rekap Produksi:**
  - polis bersharing mendapat baris **EXPENSE / COMM EXPENSE** dengan sub akun comm exp "LCH Insurance Brokers Pte Ltd", sesuai catatan Team LCH ("kepada siapa beban komisi dibayar"). (Income)/Beban-nya positif (beban);
  - sheet Per Polis mengisi kolom EXPENSE-COMMISIONS, dan (Income)/Beban ikut menghitungnya;
  - sheet Keterangan menjelaskan baris ini.
- **Migrasi `20261122160000_sharing_komisi_sg`:** kolom `commission_share_sg_pct` di `placing_slips` dan `policies`, default 0.

## Asumsi

- **Sharing dalam persen dari brokerage,** misalnya 50 berarti separuh komisi, bukan persen dari premi.
- **Dasarnya brokerage sebelum PPN** (#304). Untuk brokerage incl. VAT, misalnya 15% incl. VAT, sharing dihitung dari 14,6771%. Rekap Produksi memakai dasar yang sama, jadi beban di rekap = angka di Ringkasan Penutupan.
- **Reserve Basis belum mengambil beban ini.** Kolom bebannya tetap diisi Team LCH, karena "MARKETING EXP-COMM" di template belum tentu sama dengan sharing ke Singapore.

## File utama

- `prisma/schema.prisma` dan migrasi `20261122160000_sharing_komisi_sg`.
- **Hitungan:** `lib/calc.ts` (`sgCommissionShare`) dan `lib/closing-summary.ts`.
- **Placing slip:**
  - `components/underwriting/placing-slip-form.tsx`;
  - `components/underwriting/closing-summary.tsx`;
  - `lib/server/placing-slips.ts`;
  - `app/(app)/placement/actions.ts`;
  - `lib/slip-audit.ts`.
- **Polis:**
  - `lib/policy-from-slip.ts` dan `lib/open-cover.ts`;
  - `lib/server/policies.ts`;
  - `app/(app)/policies/actions.ts`;
  - `components/policies/policy-form.tsx` dan `components/policies/policy-database.tsx`.
- **Rekap:** `lib/production-recap.ts` dan `lib/server/production-recap.ts`.
- **Lainnya:** `components/audit/audit-fields.ts` dan `lib/data/types.ts`.
- **Tes:** `tests/production-recap.test.ts` dan `tests/closing-summary.test.ts`.

## Dampak

- **Database:** satu migrasi yang hanya menambah kolom (default 0). Tidak ada data yang berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Merge setelah #303 dan #304, lalu base PR ini diganti ke `main`.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 412 lolos. Tes baru:
  - baris EXPENSE / COMM EXPENSE dan kolom Per Polis;
  - sharing dari brokerage sebelum PPN untuk incl. VAT;
  - Ringkasan Penutupan: sharing 50% dan net tetap.
- **Browser lokal:** sharing slip 018/LCH-PLCMT/PS-MV/XI/2026 dan polisnya diset 40% di DB lokal, lalu dikembalikan ke 0.
  - Placing slip: "Ke LCH Singapore IDR 384.662,43 · LCH Indonesia IDR 576.993,64".
  - Ringkasan Penutupan: sharing − 384.662,43 dan Pendapatan LCH Indonesia 1.502.337,57.
  - Rekap Produksi Januari 2026 (ditangkap tanpa diunduh): baris COMM EXPENSE Astra Buana 230.797,46 dan Sinar Mas 153.864,97, totalnya 384.662,43. Kolom EXPENSE-COMMISIONS di Per Polis ikut terisi.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
