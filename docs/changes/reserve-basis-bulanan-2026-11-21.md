# Report Reserve Basis bulanan

- **Tanggal:** 2026-11-21
- **Branch:** `feat/reserve-basis`, ditumpuk di atas `feat/rekap-produksi-akun-pnl` (#300)
- **PR:** #<nomor>
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Template "Format Laporan Reserve Basis Bulanan" dari Team LCH (20 November 2026) berisi sheet "08", "LAP. RESERVE BASIS AGUSTUS 2026". Isinya per insured:

- **Revenue:** COMM, COMM VIA INTERCO, EF, O/I-MARGIN, O/I-SPONSORSHIP, dan TOTAL.
- **Expenses (beban marketing):** COMM, CASHBACK, DISCOUNT, REFERRAL FEE, PREMI BEBAN LCH, TOTAL, dan %.
- **Kolom kuning:** RESERVE, ROUNDING, TOTAL BEBAN + RESERVE, dan % dengan batas "MAX 40 %".

Catatan template:

- Sel cokelat ditambah cashback supaya angkanya gross, sebelum dikurangi cashback yang dibayar ke tertanggung.
- Data diambil dari source yang dihandle LCH Indonesia.

Analisa semua template ada di `report-ojk-loss-ratio-2026-11-21.md`.

## Yang berubah

- **Kartu baru "Reserve Basis Bulanan"** di menu Report, grup baru Finance, periode default bulan berjalan.
- **Satu sheet per bulan**, dinamai nomor bulan seperti template ("08"), atau "2026-08" bila periodenya lintas tahun. Tata letak dan judul kolom mengikuti template (kolom B sampai S).
- **Pendapatan** diambil dari Rekap Produksi dengan aturan yang sama, dikelompokkan per Grouping Insured:
  - COMM = komisi polis Source LCH-ID dan Direct;
  - COMM VIA INTERCO = komisi polis Source LCH-SG;
  - EF = additional fee;
  - O/I-MARGIN = margin rate deklarasi MOP.
- **O/I-SPONSORSHIP dan semua kolom beban kosong**, untuk diisi Team LCH di Excel.
- **Rumus Excel yang ikut terhitung ulang:**
  - TOTAL revenue;
  - TOTAL beban dan %;
  - RESERVE = 40% revenue − beban;
  - ROUNDING ke juta ke arah nol;
  - TOTAL BEBAN + RESERVE dan %;
  - baris TOTAL.
- **Catatan di bawah tabel** menjelaskan sumber angka dan rumus.
- `lib/production-recap.ts`: `recapIncome`, pendapatan per polis per asuransi dengan aturan dan pembulatan Rekap Produksi.

## Asumsi

- **Rumus RESERVE memakai total beban (kolom N).**
  - Sel P di template berisi `=(H*40%)+M`, padahal M hanya premi beban LCH.
  - Angka ROUNDING di contohnya cocok dengan total beban. Misalnya RUKMA PADAYA TRANS: revenue −401.461.139 × 40% + cashback 120.231.866 = −40.352.590, dibulatkan −40.000.000 seperti di template. Kalau memakai M, hasilnya −160.000.000.
- **ROUNDING** = `ROUNDDOWN(reserve, -6)`, sesuai semua contoh: −2.725.420 → −2.000.000, −50.998.643 → −50.000.000, −8.551.672 → −8.000.000.
- **COMM VIA INTERCO** = komisi polis dengan Source LCH-SG. Catatan "source yang dihandle LCH Indonesia" dibaca sebagai akun LCH Indonesia, bukan filter, karena kalau filter kolom interco selalu kosong.
- **Bulan** = bulan tanggal mulai polis (bulan produksi), sama dengan kolom thn/mth di Rekap Produksi.
- **Insured** = kolom Grouping Insured Rekap Produksi: grouping insured, atau nama klien/tertanggung bila kosong.
- **Tanda** sama dengan rekap LCH: pendapatan negatif, beban positif.
- **O/I-MARGIN** dari sistem sudah gross (premi rate klien − premi ke asuransi). Cashback dicatat sebagai beban.

## File utama

- `lib/reserve-basis.ts` (baru): `reserveBasis`, `reserveRounding`, dan `fillReserveBasis`.
- `lib/production-recap.ts`: `recapIncome`.
- `lib/report-catalog.ts` dan `components/reports/report-catalog.tsx`: kartu dan generator.
- `tests/reserve-basis.test.ts` (baru) dan `tests/report-catalog.test.ts`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Akses:** mengikuti akses Report, sama seperti Rekap Produksi.
- **Deploy:** tidak ada langkah tambahan. Merge setelah #299 dan #300, lalu base PR ini diganti ke `main`.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: semua lolos. Tes barunya:
  - pembulatan contoh template;
  - pendapatan per akun per bulan (COMM, interco, EF, margin, endorsement digabung);
  - sheet per bulan, rumus, dan nama sheet lintas tahun.
- **Browser lokal** (`lch.localhost:3002`, user SIT Admin):
  - kartu tampil di grup Finance, dialog terbuka dengan periode 1 s/d 30 Nov 2026;
  - periode 1 Nov s/d 31 Des 2026 menghasilkan sheet "11" dan "12";
  - Desember, PT SIT Korporasi Uji: revenue −2.843.250, RESERVE −1.137.300, ROUNDING −1.000.000, dan % 35,17%. Rumus dan nilai tersimpannya cocok.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- Begitu beban marketing dan sponsorship dicatat di modul Finance, kolom I sampai M dan G tinggal diisi dari data itu. Rumusnya tidak perlu diubah.
- Kalau Team LCH memang ingin RESERVE hanya dikurangi premi beban LCH (kolom M), ganti `N` di rumus kolom P.
