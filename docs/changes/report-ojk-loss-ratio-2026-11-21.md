# Report Produksi OJK (LR 01 & LR 02) dan loss ratio per asuransi

- **Tanggal:** 2026-11-21
- **Branch:** `feat/report-ojk-loss-ratio`
- **PR:** #<nomor>
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Team LCH (Harry) mengirim template report pada 20 November 2026. Agus menyimpannya di `documents/report template`, di luar repo. Agus, 21 November 2026: "tolong kamu analisa semua baik baik, mana yang harus dibuat report baru, mana yang harus update dari exising ... jika harus menambah di menu Report /report-excel silahkan lakukan saja."

Hasil analisa per file:

| File template | Keputusan |
| --- | --- |
| Form LR 01 dan Form LR 02 (laporan produksi OJK triwulanan, "LKTW III") | Report baru **Produksi OJK** (PR ini) |
| `COB.pdf` (laporan MAG "Produksi Lestari Cipta Hokindo all COB") | Report baru **Loss Ratio per Asuransi** (PR ini) |
| `Calculation LOSS RATIO DBEST` (loss ratio per asuransi dalam satu akun) | Report baru **Loss Ratio Akun per Asuransi** (PR ini) |
| `rekap-produksi-…xlsx` dengan kolom kuning dan catatan Harry | Update Rekap Produksi, butuh data pendapatan dan beban lain per polis (PR berikutnya) |
| `Format Laporan Reserve Basis Bulanan` | Report baru setelah data pendapatan dan beban lain ada |
| `format SOA LCH SINGAPURA (KOMISI & PREMIUM)` | Phase 2 Finance, butuh Debit/Credit Note dan pembayaran |

## Yang berubah

- **Menu Report (`/report-excel`)** mendapat tiga kartu baru.
- **Produksi OJK (LR 01 & LR 02)**, grup Produksi:
  - Periode default: triwulan berjalan, berdasarkan tanggal mulai polis.
  - **LR 01** per lini usaha OJK dan lokasi penempatan. Kolomnya Lini Usaha, Jumlah Polis, Lokasi Penempatan, Premi, Pendapatan Jasa Keperantaraan, dan persentase pendapatan terhadap premi.
  - **LR 02** per penanggung, lini usaha, dan lokasi penempatan, dengan kolom yang sama.
  - Judul sheet "LKTW III 2026" bila periodenya tepat satu triwulan.
  - Sheet **Rincian** per polis per asuransi untuk mencocokkan angka LR 01 dan LR 02.
  - Polis tanpa Lini Usaha OJK atau Lokasi Penempatan ditulis "(belum diisi)", lalu nomor polisnya didaftar di catatan bawah tabel.
- **Loss Ratio per Asuransi**, grup Klaim:
  - Pilihan satu asuransi atau semua asuransi (satu sheet per asuransi).
  - Periode default: 1 Januari lima tahun lalu sampai hari ini, berdasarkan tanggal mulai tahun polis.
  - Tiap sheet berisi tabel per COB per tahun lalu tabel ALL BISNIS. Kolomnya Sum of Gross Premium, Sum of Net Premium, Sum of Claim, Ratio Base on Gross Premium, Ratio Base on Net Premium, dan akun dengan klaim terbesar.
  - Tahun yang belum penuh ditulis "2026 s/d 21 Nov 2026".
- **Loss Ratio Akun per Asuransi**, grup Klaim:
  - Pilih satu akun. Tanpa akun muncul pesan "Pilih akun.".
  - Periode default sama dengan Loss Ratio per Asuransi.
  - Sheet **Per Tahun** berisi blok per tahun polis (TOTAL 2025-2026, TOTAL 2024-2025, terbaru dulu).
  - Sheet **Gabungan** berisi semua tahun, lalu satu sheet per asuransi.
  - Kolom: Asuransi, Share, Premi Gross, BF, Diskon, EF, Total Outgo, Net Premium, Klaim, dan Loss Ratio.
- **Rekap Produksi:** kolom COB OJK dan Lokasi Penempatan untuk endorsement, pembatalan, dan deklarasi yang kosong kini memakai isian polis induknya, sampai dua tingkat.
- **Kartu Rekap Produksi:** deskripsinya tidak lagi menyebut "49 kolom". Sejak #297 jumlahnya 51 kolom.

## Asumsi

- **Jumlah polis OJK** = polis Baru dan Renewal. Endorsement, pembatalan, dan deklarasi MOP hanya menambah premi dan pendapatan.
- **LR 02:** polis co-insurance dihitung di setiap penanggungnya, jadi total jumlah polis LR 02 bisa lebih besar dari LR 01. Catatan ini juga tertulis di sheet.
- **Premi OJK** = premi sebelum diskon, bagian asuransi sesuai share.
- **Pendapatan jasa keperantaraan** = brokerage + additional fee (EF). Margin rate MOP tidak termasuk, karena di catatan rekap Harry margin masuk O/I-MARGIN (pendapatan lain).
- **Tahun polis** dimulai dari polis Baru atau Renewal induknya:
  - endorsement, pembatalan, dan deklarasi ikut tahun polis induknya;
  - Renewal membuka tahun baru;
  - klaim ikut tahun polis dari polis yang diklaim.
  - Laporan MAG mengelompokkan per tahun; di sini tahunnya adalah tahun mulai polis.
- **Klaim** = nilai disetujui/dibayar + adjuster fee − salvage, tanpa klaim Rejected, lalu dibagi sesuai share asuransi. Rumus ini sama dengan loss ratio di form klaim (MoM poin 13).
- **Net premium** = premi gross − BF − diskon − EF, sama dengan Total Outgo di workbook DBEST. PPN excl. VAT (#298) tidak ikut dihitung.
- **Share di Loss Ratio Akun** = premi gross asuransi dibagi premi gross akun di tahun itu, seperti kolom share di workbook DBEST.
- **Akun** = Grouping Insured polis induk, atau nama klien/tertanggung bila kosong.
- **Nilai** dalam IDR dengan kurs tetap report, sama dengan Rekap Produksi.

## File utama

- `lib/ojk-production.ts` (baru): pengelompokan LR 01 dan LR 02, label triwulan, dan isi workbook.
- `lib/loss-ratio-report.ts` (baru): hitungan loss ratio per asuransi per COB, loss ratio akun, dan isi workbook.
- `lib/server/loss-ratio-report.ts` (baru): data polis per tahun polis dan klaimnya.
- `lib/server/production-recap.ts`: isian OJK polis induk untuk endorsement, pembatalan, dan deklarasi.
- `lib/report-catalog.ts`: tiga report baru, parameter asuransi/akun, dan periode default triwulan atau lima tahun.
- `components/reports/report-catalog.tsx`: generator dan dialog pilihan asuransi/akun.
- `app/(app)/reports/actions.ts`: `lossRatioReportAction` dan `lossRatioAccountsAction`.
- `app/(app)/report-excel/page.tsx`: `FormOptionsBoundary` untuk daftar asuransi.
- `tests/report-ojk-loss-ratio.test.ts` (baru) dan `tests/report-catalog.test.ts`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Akses:**
  - Produksi OJK mengikuti akses Report, sama seperti Rekap Produksi.
  - Dua report loss ratio juga butuh hak lihat klaim di report, sama seperti Statistik Klaim.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 397 lolos, termasuk 7 test baru:
  - LR 01 dan LR 02;
  - label triwulan dan periode default;
  - sheet workbook OJK;
  - loss ratio per asuransi per COB;
  - tahun polis akun;
  - nama sheet workbook loss ratio.
- **Browser lokal** (`lch.localhost:3002`, user SIT Admin). File Excel ditangkap di halaman tanpa diunduh, lalu isinya dibaca.
  - **Produksi OJK**, 1 Jan 2025 s/d 31 Des 2026:
    - dialog terbuka dengan periode 1 Okt s/d 31 Des 2026;
    - LR 01: 21 polis, premi 3.486.723.311,66, pendapatan 386.568.804,80 (11,09%);
    - LR 02: 9 penanggung, total 24 polis karena co-insurance;
    - total sheet Rincian sama.
  - **Loss Ratio per Asuransi**, semua asuransi:
    - 9 sheet;
    - Tugu Pratama Marine Cargo 2025: gross 91.854.000, net 80.372.250, klaim 586.440.000.
  - **Loss Ratio Akun**:
    - tanpa akun muncul "Pilih akun.";
    - akun PT Mitra Logistik Nusantara menghasilkan sheet Per Tahun, Gabungan, dan satu sheet asuransi.
- **Isian polis induk** diuji di DB lokal:
  - Lini Usaha OJK uji dan lokasi diisi sementara di PAR/2025/JKT/0871;
  - endorsement END01 ikut terisi di Rekap Produksi dan LR 01;
  - data dikembalikan dan master uji dihapus.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Isian OJK masih kosong:**
  - Master Lini Usaha OJK (`cob_ojk_classes`) di DB lokal kosong.
  - Polis yang dicatat otomatis dari CI belum mengisi Lini Usaha OJK dan Lokasi Penempatan (`lib/server/auto-policies.ts`).
  - Sebelum LR 01 dan LR 02 dipakai, LCH perlu mengisi master Lini Usaha OJK, lalu kedua isian di Policy Database.
  - Daftar polis yang masih kosong ada di catatan sheet LR 01 dan LR 02.
- **Usulan lanjutan:** default Lini Usaha OJK per COB di Master Data, dan Lokasi Penempatan "Dalam Negeri" untuk polis dari CI.
- **Kolom kuning Harry** di rekap produksi butuh data pendapatan dan beban lain per polis, misalnya cashback, referral fee, sponsorship, dan komisi ke agen. Kolomnya: akun pnl, sub akun pnl, spil/non spil, source file, sub akun comm exp, dan Object. Laporan Reserve Basis memakai data yang sama, jadi keduanya dikerjakan di PR berikutnya.
