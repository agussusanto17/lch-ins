# Polis multi tahun Motor Vehicle

- **Tanggal:** 2026-11-20
- **Branch:** `feat/polis-multi-tahun-mv`
- **PR:** #<nomor>
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 20 November 2026: "kalo polis multi years tolong disetting bro, kadang ada kaya gini di MV". Contohnya `documents/contoh slip/Polis 5 Unit Dump Truck - DIRAJA.pdf`, polis Asuransi MAG 45020124010723:

- **Tertanggung:** PT KB Finansia Multi Finance QQ PT Diraja Traillindo QQ PT Delta Rehana Jaya.
- **Objek dan periode:** 5 dump truck Isuzu FVZ-34, 10 Juni 2024 s/d 10 Juni 2028.
- **Hitungan premi** ada di lampiran "Daftar Perincian Polis", per unit dan per tahun polis:
  - Comprehensive 2,39% dari nilai tahun itu: 1.555.000.000, 1.399.500.000, 1.259.550.000, 1.133.595.000. Nilainya turun 10% dari tahun sebelumnya.
  - TPL 50.000.000 × 1,125% setiap tahun.
  - Premi per unit 130.058.715,50; total 5 unit 650.293.577,50.
  - TSI yang dicetak adalah nilai tahun pertama (7.775.000.000).

Sebelumnya periode boleh lebih dari setahun, tetapi premi selalu dihitung sekali (nilai × rate).

## Yang berubah

- **Polis multi tahun otomatis:** slip Motor Vehicle dengan periode lebih dari satu tahun menghitung premi per tahun polis lalu menjumlahkannya.
  - Tahun polis dihitung dari tanggal ulang inception.
  - Tahun terakhir yang tidak penuh dihitung prorata hari / 365.
  - Periode TBA, periode satu tahun atau kurang, dan COB lain tidak berubah.
- **Isian baru:** "Penyusutan nilai kendaraan per tahun polis (%)", di bawah Expiry Date. Hanya muncul untuk slip MV multi tahun.
  - Nilai casco tiap tahun turun sebesar persen ini dari nilai tahun sebelumnya.
  - Kosong berarti nilainya tetap.
- **Cara hitung:**
  - Rate casco dan perluasan sama setiap tahun.
  - TPL dan PA dihitung setiap tahun dengan limit yang sama.
  - Premi dibulatkan ke sen per tahun lalu dijumlah, sama dengan lampiran polis.
- **Form:** setiap kartu kendaraan mendapat tabel "Rincian per tahun polis". Isinya tahun, periode, nilai casco, premi casco dan perluasan, TPL dan PA, premi, dan total semua tahun. Premi per baris rate berisi jumlah semua tahun.
- **Dokumen PS, QS, CN, dan CI:**
  - **Rate & Premium** di badan dokumen tercetak "As Attached", dengan Total Payable.
  - **Lampiran baru PERHITUNGAN PREMI PER TAHUN POLIS:** per kendaraan dan per tahun polis tercetak periode, coverage, nilai atau limit × rate, dan premi, lalu total per kendaraan dan Total Premium.
  - **DAFTAR UNIT KENDARAAN** mendapat catatan bahwa premi per kendaraan adalah jumlah semua tahun.
- **Audit:** perubahan penyusutan tercatat di Audit Trail.

## File utama

- `lib/multi-year.ts` (baru): tahun polis, nilai per tahun, dan premi multi tahun.
- `lib/multi-year-schedule.ts` (baru): rincian per kendaraan per tahun untuk form dan dokumen.
- `lib/calc.ts`: `recalcSlip` menjumlah premi per tahun polis untuk MV multi tahun.
- `prisma/schema.prisma` dan migrasi `20261120110000_polis_multi_tahun_mv`: kolom `placing_slips.multi_year_depreciation_pct`.
- `lib/data/types.ts`, `lib/server/placing-slips.ts`, `app/(app)/placement/actions.ts`, `lib/slip-audit.ts`, `components/audit/audit-fields.ts`, `components/underwriting/slip-model.ts`: field baru.
- `components/underwriting/placing-slip-form.tsx` dan `components/underwriting/slip-vehicles.tsx`: isian dan rincian per tahun.
- `components/documents/doc-blocks.tsx` dan `components/documents/slip-documents.tsx`: lampiran dan badan dokumen.
- `tests/polis-multi-tahun.test.ts` (baru).

## Dampak

- **Database:** migrasi `20261120110000_polis_multi_tahun_mv` menambah kolom `multi_year_depreciation_pct` (desimal, default 0).
  - Slip MV lama yang periodenya sudah lebih dari setahun akan dihitung per tahun polis saat dibuka dan disimpan ulang.
  - Premi slip yang sudah tersimpan tidak berubah sampai slipnya disimpan lagi.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 360 lolos, 6 test baru dengan angka polis DIRAJA:
  - tahun polis, nilai per tahun, premi per unit 130.058.715,50, dan 5 unit 650.293.577,50;
  - rincian per tahun sama dengan lampiran polis;
  - periode satu tahun, periode TBA, dan COB lain tidak berubah;
  - tahun terakhir prorata.
- **Browser lokal**, draft MV uji 5 dump truck dengan penyusutan 10%:
  - form menampilkan isian penyusutan, rincian per tahun tiap kendaraan, dan Total Premium IDR 650.293.577,50;
  - cetak Placing Slip: Rate & Premium As Attached, Total Payable 650.293.577,50, dan lampiran per tahun polis yang sama dengan lampiran polis MAG;
  - PDF dicek dengan headless Chrome.
- Draft uji, audit-nya, dan sesi uji dihapus sesudahnya.

## Catatan untuk yang melanjutkan

- **Batas tarif OJK** masih dicek terhadap nilai tahun pertama. Untuk kendaraan yang kategori nilainya berubah karena penyusutan, rate tahun berikutnya tidak dicek ulang.
- **Rate per tahun berbeda** belum didukung. Contoh LCH memakai rate yang sama setiap tahun.
- **Endorsement dan cancellation slip** polis multi tahun masih memakai nilai tahun pertama untuk prorata (`rateLineBasis`).
- **Penyusutan** dihitung bertingkat dari tahun sebelumnya, sesuai contoh MAG. Kalau ada asuransi yang memakai persen dari nilai tahun pertama, perlu pilihan cara hitung.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
