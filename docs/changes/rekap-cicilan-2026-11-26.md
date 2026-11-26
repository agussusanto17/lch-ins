# Rekap Produksi: satu baris per cicilan premi installment

- **Tanggal:** 2026-11-26
- **Branch:** `feat/rekap-cicilan`
- **PR:** #322
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 26 November 2026, dengan screenshot Rekap Produksi polis DIAMOND CITY BATAM yang kolom Instl-nya 0:

- "ini kan ada installment tapi direport belum muncul ya?"
- "sama premi per installment juga belum ada di report"

Kolom Instl selama ini selalu 0, padahal polis bisa punya premi installment 2–10 cicilan (#296, #305).

Di sistem LCH, cicilan dicatat per nota. SOA LCH Singapura, misalnya, menulis DN2501941DU01/1 dan /2 sebagai baris terpisah, masing-masing dengan nominal cicilannya.

## Yang berubah

- **Polis dengan premi installment** ditulis satu baris per cicilan di sheet Rekap Produksi:
  - **Instl:** cicilan ke- (1, 2, …). Polis yang dibayar sekaligus tetap 0.
  - **Kolom baru "Jatuh Tempo Cicilan"** (MM/DD/YYYY) dari jadwal polis, sebelum kolom Cek Dobel.
  - **Nilai uang dibagi sesuai persen cicilan:** premi gross, diskon, komisi, EF, margin, beban, dan (Income)/Beban. Contoh: premi per cicilan di Premium_Gross_OC/Premium_Gross.
  - **Cicilan terakhir menampung pembulatan,** jadi jumlah semua cicilan sama persis dengan nilai polis.
  - **Urutan baris** per cicilan; tiap cicilan berisi baris COMM, EF, dan seterusnya.
  - **Bulan produksi (thn/mth)** tetap bulan tanggal mulai polis untuk semua cicilan, sama dengan dasar periode report.
- **Sheet Per Polis** tetap satu baris per polis per asuransi.
- **Reserve Basis dan Laporan MOM** tidak berubah, karena memakai nilai per polis.
- **Keterangan** menjelaskan kolom Instl dan Jatuh Tempo Cicilan.

## Asumsi

- **Persen cicilan dikenakan ke semua nilai baris** (premi, komisi, EF, dan lainnya), mengikuti nota per cicilan. Admin cost dan stamp duty yang ikut cicilan pertama tidak ditulis di rekap, karena rekap tidak punya kolom biaya polis.
- **Jatuh tempo cicilan tidak mengubah bulan produksi.** Kalau Finance ingin produksi per bulan jatuh tempo, perlu keputusan terpisah karena mengubah dasar periode report.

## File utama

- `lib/production-recap.ts`: `splitInstallments`, kolom Jatuh Tempo Cicilan, dan keterangan.
- `lib/server/production-recap.ts`: jadwal cicilan polis ikut dimuat.
- `tests/production-recap.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Report:** jumlah baris Rekap Produksi bertambah untuk polis installment (n cicilan × baris per asuransi). Total per kolom tidak berubah.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 453 lolos.
  - Tes baru: premi 1.000.000 dengan cicilan 33,33/33,33/33,34% menghasilkan 333.300 / 333.300 / 333.400 dan komisi −49.995 / −49.995 / −50.010.
  - Polis tanpa installment tetap satu baris dengan Instl 0, dan Per Polis tetap satu baris.
- **Browser lokal:** polis 022 (premi 6.250.000) diberi jadwal 3 cicilan 40/30/30% sementara, lalu dikembalikan.
  - Rekap Produksi November: Instl 1, 2, 3 dengan jatuh tempo 11/17/2026, 03/17/2027, 07/17/2027; premi 2.500.000 / 1.875.000 / 1.875.000; komisi −375.000 / −281.250 / −281.250.
  - Per Polis tetap satu baris 6.250.000.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Catatan terkait:** `installment-additional-discount-2026-11-22.md` (#305) dan catatan jadwal premi installment (#296).
