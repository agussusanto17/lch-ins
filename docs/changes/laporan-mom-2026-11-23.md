# Laporan MOM bulanan (bisnis LCH Indonesia dan LCH Singapore)

- **Tanggal:** 2026-11-23
- **Branch:** `feat/laporan-mom`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry mengirim contoh format Laporan MOM lewat Agus pada 23 November 2026. File-nya `documents/report template/Contoh Format Laporan MOM.xlsx` (sheet "Format Lap MOM"), di luar repo. Laporan ini dipakai di meeting bulanan direksi dengan LCH Singapore dan biasanya disiapkan Finance (Team Bu Tresna).

Isi template:

- **LCH INDONESIA BUSINESS 2026 AS COMPARED TO 2025:** per bulan, untuk tahun laporan dan tahun lalu.
  - Pendapatan: a COMM+EF(MAG) + COMM VIA INTERCO, b O/I MARGIN, c O/I SPONSORSHIP, d TOTAL INCOME.
  - Beban: e COMM EXPENSES, f–i MARKETING EXP (CASHBACK, REFERRAL FEE, DISCOUNT, PREMI BEBAN LCH), j TOTAL EXPENSES.
  - k NET = d − j.
  - Tabel comparative NET per bulan untuk PPT.
- **LCH SINGAPORE BUSINESS 2026 AS COMPARED TO 2025:** hanya brokerage.
  - Kolom: a COMM + COMM VIA INTERCO (MAG), b EF SG(MAG), c OTHERS, d TOTAL.
  - Tabel comparative MAG (a+b), OTHERS (c), dan TOTAL.

## Yang berubah

- **Report baru "Laporan MOM"** di menu Report, grup Finance.
  - Periode awalnya 1 Januari sampai akhir bulan berjalan.
  - Pembandingnya tanggal yang sama tahun sebelumnya.
  - Tanggal mulai dan akhir wajib di tahun yang sama.
- **Pemisahan bisnis per Source polis,** sama dengan kolom source Rekap Produksi:
  - Source LCH-SG (LCH Insurance Brokers Pte Ltd) = LCH Singapore;
  - Source lain (LCH-ID) = LCH Indonesia;
  - slip tanpa Source memakai Source cabang klien, seperti Rekap Produksi.
- **Angka diambil dari Rekap Produksi:** IDR kurs report, brokerage dan EF sebelum PPN.
  - Pendapatan dan beban ditulis positif, karena rumus NET template = pendapatan − beban.
  - Rekap Produksi menulis pendapatan negatif.
- **Isi LCH Indonesia:**
  - a = komisi + EF semua asuransi;
  - b = margin deklarasi MOP;
  - e = sharing komisi ke LCH Singapore (isian #306).
- **Isi LCH Singapore:**
  - MAG = asuransi dengan Sub akun EF "EF (MAG)" di Master Data;
  - a = komisi MAG, b = EF MAG, c = komisi + EF asuransi lain.
- **Kolom kosong untuk diisi Finance:** c (sponsorship) dan f–i (beban marketing) belum dicatat di sistem.
  - TOTAL INCOME, TOTAL EXPENSES, NET, baris TOTAL, dan tabel comparative berupa rumus Excel, jadi ikut terhitung ulang.
- **Sheet Keterangan** menjelaskan sumber setiap kolom.
- **Rumus template yang bergeser diluruskan:**
  - blok 2025 di template berisi rumus yang tergeser (N11 = F11 − L11, dan seterusnya); sekarang rumusnya sama dengan blok 2026;
  - TOTAL Singapore template = B + D; sekarang a + b + c;
  - MAG 2025 di comparative Singapore template hanya kolom komisi; sekarang komisi + EF.
- **Penyesuaian kecil:**
  - judul comparative kedua template tertulis "LCH INDONESIA", padahal catatannya untuk source Singapore; ditulis "LCH SINGAPORE";
  - kata "FORMAT" di judul tabel dihapus;
  - ejaan "PENDATAPAN" dibetulkan;
  - ditambah baris TOTAL di setiap tabel.
- **`recapIncome`** sekarang juga membawa kode Sub akun EF asuransi dan sharing komisi SG. Data polis untuk rekap memuat kode Sub akun EF.

## Asumsi

- **"SOURCE JAKARTA" dan "SOURCE SINGAPORE"** di catatan template dibaca sebagai Source polis LCH-ID dan LCH-SG.
- **COMM VIA INTERCO LCH Indonesia** sudah ikut di kolom a kalau komisinya tercatat sebagai polis Source LCH-ID. Bagian brokerage dari SOA LCH Singapore yang tidak dicatat sebagai polis ditambahkan manual di sel kolom a.
- **Bisnis yang hanya ada di sistem LCH Singapore** tidak ada di sini. Margin deklarasi dan sharing komisi bisnis Singapore tidak ditulis, karena template hanya meminta brokerage.

## File utama

- **Hitungan dan Excel:** `lib/mom-report.ts` (`momReport`, `fillMomReport`, `previousYearDate`).
- **Daftar report:** `lib/report-catalog.ts` (periode `ytd`, validasi satu tahun) dan `components/reports/report-catalog.tsx` (dua pengambilan data: periode laporan dan tahun lalu).
- **Data rekap:** `lib/production-recap.ts` (`RecapIncome`) dan `lib/server/production-recap.ts`.
- **Tes:** `tests/mom-report.test.ts` (baru) dan `tests/report-catalog.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 433 lolos. Tes baru mencakup:
  - pemisahan Source;
  - MAG vs Others, termasuk polis USD dan dua asuransi 50:50;
  - brokerage incl. VAT;
  - sharing komisi SG dan margin;
  - bulan di luar periode;
  - 29 Februari;
  - posisi sel, rumus, dan hasil Excel.
- **Browser lokal** (`lch.localhost:3002/report-excel`):
  - dialog Laporan MOM terisi 1 Jan–30 Nov 2026, dan periode lintas tahun ditolak dengan pesan;
  - file terunduh dengan 18 polis. Kolom a per bulan sama dengan jumlah baris COMM + EF Rekap Produksi periode yang sama, misalnya Juli 2026 97.822.896,28 dan Agustus 2025 41.997.437,50;
  - bagian Singapore dicoba dengan mengubah sementara slip lokal 022 ke Source LCH-SG dengan asuransi MAG dan EF 5%. Hasilnya November 2026: komisi MAG 937.500, EF MAG 312.500, MAG di comparative 1.250.000. Slip lalu dikembalikan.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Reserve Basis (#301) dan Laporan MOM membaca Source LCH-SG berbeda.**
  - Reserve Basis menulis komisi polis Source LCH-SG sebagai COMM VIA INTERCO pendapatan LCH Indonesia.
  - Laporan MOM memasukkan polis LCH-SG ke LCH SINGAPORE BUSINESS.
  - Per 19 November belum ada polis Source LCH-SG di produksi, jadi angkanya belum berbeda. Tanyakan Team LCH mana yang benar sebelum ada data LCH-SG.
- **Tahun pembanding** hanya berisi polis yang sudah dicatat di sistem. Kalau data 2025 belum lengkap, kolom 2025 perlu diisi dari data lama.
