# Rekap produksi format LCH (Excel 49 kolom) dari Report Operational

- **Tanggal:** 2026-11-12
- **Branch:** `feat/rekap-produksi-format-lch`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry mengirim contoh rekap produksi LCH (`documents/Contoh Format Rekap Produksi.xlsx`) pada 19 Oktober 2026. Pada 12 November 2026 ia memintanya lagi: "report produksi operasional contoh kaya gini tolong dibuatkan".

Contoh itu berisi 49 kolom dengan satu baris per polis per asuransi (kolom `asuransi`). Nilai uangnya dua kali, dalam mata uang asli (OC) dan Rupiah, dan pendapatan (komisi, fee) ditulis negatif. Fee per asuransi baru tersedia setelah #230 (additional fee persen per asuransi).

## Yang berubah

- **Tombol Rekap Produksi (Excel)** di Report Operational, di baris Periode dan Bulan acuan. Isinya polis yang mulai berlaku di periode terpilih, sama dengan dasar Report Operational. Hasilnya file `.xlsx` dengan header persis seperti contoh, satu baris per asuransi polis.
- **Isi kolom** (`lib/production-recap.ts`):
  - **Identitas:**
    - `refno`: nomor placing slip, atau nomor polis kalau polisnya tanpa slip;
    - `thn`/`mth` dan `bulan prod LCH`/`year's`: tahun dan bulan mulai record;
    - `insured` dan `Insured Name`: kode klien untuk asuransi baris itu (Marketing → kode per asuransi) + nama klien;
    - `aname`: nama tertanggung di polis;
    - `source` dan `Group New Source Rev`: kode dan nama source slip;
    - `cob`: kode dan nama COB, misalnya `02 - MOTOR VEHICLE`;
    - `toc`: kode dan nama type of cover;
    - `tipe`: NEW, RENEWAL, ENDORSE, atau CANCEL;
    - `INS_TYPE` = DIRECT INSURANCE.
  - **Polis dan periode:**
    - `policyno`: nomor polis, atau nomor polis induk untuk endorsement dan pembatalan. Untuk kedua jenis itu, nomor record-nya sendiri masuk `CERTIFICATENO`;
    - `eseqno`: urutan endorsement;
    - `RENEWAL`: 1 untuk renewal;
    - `pdate`: tanggal record dicatat;
    - `sdate`/`edate`: periode polis (periode polis induk untuk endorsement);
    - `tgl_paid`: tanggal premi dibayar, atau 0.

    Tanggal ditulis MM/DD/YYYY seperti contoh.
  - **Nilai:**
    - `currency` dan `rate` (kurs FX aplikasi);
    - `Premium_Gross`: premi × share asuransi;
    - `Premium_Commission`: −premi bagian × brokerage (%);
    - `RM_Fee`: −premi bagian × additional fee (%) asuransi itu;
    - `(Income)/Beban`: komisi + fee;
    - `Percentage`: −brokerage/100.

    Kolom Rupiah dihitung dari nilai OC yang belum dibulatkan, sehingga baris contoh USD (premi 80.013,96 × 16.782, brokerage 0,15%) keluar sama persis: gross 1.342.794.276,72 dan komisi −2.014.191,42.
  - **Lainnya:** `asuransi`; `Note` (remarks); `Grouping Insured`; `COB OJK`; `Lokasi Penempatan`; `Perusahaan/Perorangan` (dari tipe klien).
- **Server:** `listProductionRecap` (`lib/server/production-recap.ts`) dan aksi `productionRecapAction` (`app/(app)/reports/actions.ts`), dengan akses Report Operational.

## File utama

- `lib/production-recap.ts` (baru): header, `recapRows`, `RECAP_COLUMNS`.
- `lib/server/production-recap.ts` (baru), `app/(app)/reports/actions.ts` (baru).
- `components/reports/report-view.tsx`: tombol export.
- `tests/production-recap.test.ts` (baru, 7 tes).

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint app components lib tests next.config.ts --quiet`, `npx tsx --test tests/*.test.ts` (218 tes, termasuk 7 tes baru), dan `npm run build`: lolos.
- **Tes unit:**
  - 49 header berurutan;
  - format tanggal;
  - baris USD sama dengan contoh LCH;
  - co-insurance 60/40 dengan fee 12,5% dan 10% → dua baris dengan komisi dan fee masing-masing;
  - kode klien per asuransi;
  - baris endorsement (nomor polis induk, urutan, periode induk);
  - pembatalan (komisi dan fee menjadi positif karena membalik pendapatan).
- **Uji browser** (Playwright, worktree port 3001): tombol Rekap Produksi (Excel) di Report Operational (Tahunan 2026) mengunduh `rekap-produksi-2026-01-01-sd-2026-12-31-<tanggal>.xlsx`.
  - Sheet berisi 12 baris data (12 polis × asuransi di DB lokal) dan 49 kolom.
  - Header-nya sama persis dengan baris 4 contoh LCH, dibandingkan dengan openpyxl.
  - Baris endorsement memakai nomor polis induk dan periode induk.
  - Tidak ada error di console.

## Catatan untuk yang melanjutkan

- **Kolom yang masih kosong** karena datanya belum ada di sistem, perlu jawaban Harry (sebagian sudah ditanyakan sejak 19 Oktober):
  - `voucher`: nomor Debit Note, modul DN belum ada;
  - `adate`: tanggal akuntansi;
  - `Object`;
  - `akun pnl`, `sub akun pnl`, dan `sub akun comm exp`: pemetaan akun untuk Bagian C;
  - `spil/non spil`;
  - `source file`.

  `Premium_Discount` dan `Instl` diisi 0, karena diskon dan cicilan belum tersimpan di polis.
- **Bulan produksi memakai tanggal mulai record**, sama dengan Report Operational. Contoh LCH tampaknya memakai tanggal akuntansi (DN). Kalau DN sudah ada, `thn`/`mth` sebaiknya pindah ke tanggal DN.
- **Kurs memakai tabel FX statis aplikasi** (`lib/calc.ts`), bukan kurs saat transaksi.
- **Kode klien per asuransi** diambil dari data Marketing. Klien tanpa kode tetap ditulis namanya saja.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
