# Rekap Produksi: akun pnl, sub akun pnl, dan kolom catatan Team LCH

- **Tanggal:** 2026-11-21
- **Branch:** `feat/rekap-produksi-akun-pnl`, ditumpuk di atas `feat/report-ojk-loss-ratio` (#299)
- **PR:** #300
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Team LCH mengembalikan rekap produksi hasil export 19 November dengan enam kolom kuning yang masih kosong: Object, akun pnl, sub akun pnl, spil/non spil, source file, dan sub akun comm exp. Mereka menambahkan catatan arti tiap kolom dan satu format alternatif ("modifikasi output produksi"). File itu ada di `documents/report template`, di luar repo. Analisa semua template ada di catatan `report-ojk-loss-ratio-2026-11-21.md`.

Catatan Team LCH:

- **akun pnl:** INCOME untuk pendapatan (komisi, margin, sponsorship); EXPENSE untuk beban (biaya marketing, diskon beban LCH, referral fee, beban komisi).
- **sub akun pnl:**
  - INCOME: COMM, EF (MAG), O/I-MARGIN, O/I-SPONSORSHIP, DLL.
  - EXPENSE: COMM EXPENSE, MARKETING-CASHBACK, MARKETING-REFERRAL FEE, MARKETING-PREMI BEBAN LCH, MARKETING-DISCOUNT BEBAN LCH, DLL.
- **spil/non spil:** SPIL Program atau Non SPIL.
- **source file:** sumber rekapan, misalnya Produksi MAG, Placement, Subledger, atau SOA.
- **sub akun comm exp:** kepada siapa beban komisi dibayar.
- **Object:** detail objek yang dipertanggungkan.
- **Format alternatif:** kolom nilai per sub akun, yaitu Premium_Gross, Premium_Discount, Commission, EF, O/I-MARGIN, O/I-SPONSORSHIP, MARKETING-CASHBACK, dan EXPENSE-COMMISIONS. Masing-masing dalam OC dan IDR.

## Yang berubah

- **Sheet Rekap Produksi** tetap 51 kolom dengan urutan yang sama, tapi satu polis per asuransi kini dipecah per unsur pendapatan:
  - baris **COMM** membawa premi, diskon, dan komisi;
  - baris **EF** hanya berisi fee (`RM_Fee`), sub akun "EF (MAG)" untuk Multi Artha Guna dan "EF" untuk asuransi lain;
  - baris **O/I-MARGIN** hanya berisi margin rate deklarasi MOP (`Margin_Rate`).
  - Premi hanya di baris COMM, jadi jumlah premi tidak dobel. `(Income)/Beban` tiap baris = nilai unsurnya.
- **akun pnl** = INCOME untuk semua baris dari sistem.
- **spil/non spil** = SPIL bila Grouping Insured, nama klien, atau tertanggung memuat "SPIL" atau "Salam Pacific"; selain itu Non SPIL.
- **source file** = Placement (polis dari placing slip), Policy Database (polis input langsung), atau Deklarasi MOP.
- **Object** = baris Interest slip (kendaraan, barang, alat), atau lokasi risiko polis bila slip tidak punya baris Interest. Maksimal 250 karakter.
- **Percentage** berformat persen (`0.00%`) seperti contoh LCH. Sebelumnya berformat `#,##0`, jadi -0,15 tampil "-0".
- **Grouping Insured:**
  - polis dari CI menyimpan grouping kosong (`""`), dan kolom ini dulu ikut kosong; sekarang memakai nama klien atau tertanggung;
  - endorsement, pembatalan, dan deklarasi tanpa grouping memakai grouping polis induknya.
- **Sheet baru Per Polis:** format alternatif Team LCH, satu baris per polis per asuransi dengan kolom nilai per sub akun, ditutup `(Income)/Beban`.
- **Sheet baru Keterangan:** aturan semua kolom di atas.
- `lib/export.ts`: helper `addExportSheet` untuk workbook berisi beberapa sheet, dan `numFmt` per kolom.

## Asumsi

- **Baris dipecah per unsur**, seperti nota terpisah di rekap LCH (komentar Team LCH: EF punya nota manual sendiri), supaya satu baris punya satu sub akun.
- **Margin ikut `(Income)/Beban`** di barisnya sendiri. Di #297 margin sengaja dikeluarkan dari kolom itu; sekarang Team LCH sudah menggolongkannya sebagai INCOME (O/I-MARGIN).
- **"EF (MAG)"** hanya untuk Multi Artha Guna, karena nama sub akunnya menyebut MAG. EF dari asuransi lain ditulis "EF".
- **Beban dan sponsorship belum dicatat di sistem.** Kolom EXPENSE-COMMISIONS, MARKETING-CASHBACK, REFERRAL FEE, PREMI BEBAN LCH, DISCOUNT BEBAN LCH, dan O/I-SPONSORSHIP di sheet Per Polis berisi 0. sub akun comm exp kosong. Pencatatan beban termasuk modul Finance/Akuntansi (Phase 2), jadi untuk sekarang kolomnya diisi langsung di file Excel.
- Nama kolom sheet Per Polis persis catatan Team LCH, termasuk ejaan "EXPENSE-COMMISIONS". Tiga pasang kolom ".." diisi sisa sub akun beban: REFERRAL FEE, PREMI BEBAN LCH, dan DISCOUNT BEBAN LCH.

## File utama

- `lib/production-recap.ts`:
  - baris per unsur pendapatan;
  - `spilClass`, `recapSourceFile`, `recapObject`, `feeSubAccount`;
  - sheet Per Polis (`recapPolicyRows`), Keterangan, dan `fillProductionRecap`.
- `lib/server/production-recap.ts`: baris Interest slip untuk kolom Object.
- `lib/export.ts`: `addExportSheet` dan `numFmt`.
- `components/reports/report-catalog.tsx`: Rekap Produksi diunduh sebagai workbook tiga sheet.
- `lib/report-catalog.ts`: deskripsi kartu.
- `tests/production-recap.test.ts` dan `tests/margin-rate-mop.test.ts`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Report:**
  - jumlah baris Rekap Produksi bertambah untuk polis yang punya fee atau margin;
  - total premi dan total `(Income)/Beban` (tanpa margin) sama dengan sebelumnya;
  - pivot yang dulu memakai `RM_Fee` di baris yang sama dengan premi perlu memakai baris sub akun EF.
- **Deploy:** tidak ada langkah tambahan. Merge setelah #299, lalu base PR ini diganti ke `main`.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: semua lolos. Tes yang baru atau diubah:
  - baris COMM/EF co-insurance, totalnya sama dengan sebelum dipecah;
  - EF (MAG);
  - polis tanpa fee tetap satu baris;
  - SPIL;
  - source file;
  - Object;
  - format Percentage;
  - sheet Per Polis;
  - workbook tiga sheet;
  - Grouping Insured kosong;
  - baris O/I-MARGIN.
- **Data lokal** 1 Jan 2025 s/d 31 Des 2026:
  - 27 polis menjadi 40 baris (30 COMM, 10 EF);
  - total premi 3.486.723.311,66 dan `(Income)/Beban` −386.568.804,79, sama dengan komisi + fee;
  - Object terisi kendaraan (Model, Plat, Rangka), lokasi Property, atau barang cargo.
- **Browser lokal** (`lch.localhost:3002`, user SIT Admin):
  - file Rekap Produksi ditangkap di halaman tanpa diunduh;
  - isinya sheet Rekap Produksi (40 baris), Per Polis (30 baris), dan Keterangan;
  - kolom kuning di posisi yang sama dengan file Team LCH (U, AK, AL, AM, AN, AP).
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Laporan Reserve Basis** memakai pendapatan yang sama per insured per bulan. Dikerjakan di PR berikutnya.
- **Pencatatan beban marketing per polis** (cashback, referral fee, beban komisi beserta penerimanya, premi dan diskon beban LCH) belum ada. Begitu ada di modul Finance, baris EXPENSE dan kolom Per Polis tinggal diisi dari data itu.
- **SPIL Program** masih ditebak dari nama. Kalau LCH punya daftar resmi, aturannya cukup diganti di `spilClass`.
