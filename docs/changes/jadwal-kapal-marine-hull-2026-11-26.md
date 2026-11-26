# Marine Hull: jadwal kapal per kapal per section (format Patria dan MHL)

- **Tanggal:** 2026-11-26
- **Branch:** `feat/marine-hull-jadwal-kapal`
- **PR:** #323
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry, lewat Agus, 26 November 2026: "marine hull bikin template seperti ini bro, template inputan placement dan tampilannya". Contohnya ada di `documents/contoh slip/`:

- CI H&M PT Patria Maritime Lines 2025 dengan jadwal Bulk Carrier (4 kapal).
- Signed slip MHL PT Salam Pacific Indonesia Lines 2022 dengan lampiran 107 kapal.

Jawaban Harry atas konfirmasi:

1. Satu polis untuk semua kapal dan semua section, tetapi bisa juga untuk satu kapal saja.
2. Nilai dan rate diisi per kapal, manual atau upload Excel. Sistem menghitung premi per kapal per section dan totalnya.
3. Ada dua jenis jadwal dari LCH Singapore, Patria dan MHL, jadi sheet dan templatenya dua. Template slipnya juga dua, sesuai PDF.
4. Premi perlu rincian installment.

PR ini mengerjakan poin 1–3 untuk input placement: jadwal kapal, hitungan premi, upload, dan template Excel. Cetak dua template slip dan rincian installment per section menyusul di PR berikutnya.

## Yang berubah

- **Jadwal kapal di slip Marine Hull.** Saklar "Pakai jadwal kapal" muncul di Interest Insured dan langsung menyala untuk slip Marine Hull baru.
  - Slip Marine Hull lama tetap memakai isian per objek sampai saklarnya dinyalakan.
  - Saat dinyalakan, tiap objek lama menjadi satu kapal: nilai dan rate pertamanya masuk ke H&M.
- **Dua format jadwal:**
  - **Patria (ringkas):** vessel, type, built, GRT, class, flag, lalu nilai, rate, dan premi H&M, IV, dan War. Section (A) H&M, (B) IV, (C) War.
  - **MHL (lengkap):** ditambah IMO, NRT, DWT, BHP, dimensions, cover, deductible Clause 12, AMD, General Average, nilai AOI, serta owner, managers, dan mortgagees. Nilai tahun lalu boleh diisi untuk perbandingan renewal. Section 1 H&M, 2 War, 3 IV/AOI.
- **Tabel kapal di Rate & Premium.** Tiap section menampilkan nilai × rate = premi, ada premi per kapal, dan total per section.
  - Klik nama kapal untuk mengubah isiannya di drawer. Hapus kapal juga dari drawer.
  - Format MHL menampilkan premi tahun lalu, premi tahun ini, dan persen perubahannya.
- **Upload Excel.** Ada template Patria dan template MHL. Kolom premi di template berisi rumus nilai × rate / 100.
  - Jadwal dari LCH Singapore bisa diupload langsung. Judul kolom dikenali dari namanya, termasuk judul dua baris bertahun ala MHL, angka bertanda mata uang ("IDR 158,339,797,559.20"), dan rate bertanda persen.
  - Format jadwal mengikuti file.
  - Kapal bisa ditambahkan di akhir jadwal atau mengganti semua kapal. Kapal yang IMO atau namanya sudah ada dilewati.
- **Hitungan premi.** Premi per section = nilai × rate (%). IV memakai IV + AOI. Jadwal diturunkan menjadi isian slip biasa:
  - **Satu objek Interest.** Teksnya seperti di CI, misalnya `BULK CARRIER “PATRIA NAWASENA 1” & 3 OTHERS (AS PER SCHEDULE ATTACHED)`; satu kapal ditulis tanpa "& N OTHERS".
  - **Nilai objek = TSI = H&M + IV + AOI.** War tidak ditambahkan karena menjamin kapal yang sama.
  - **Tiga baris premi flat** (Hull & Machinery, Increased Value, War Risks), urut sesuai format.

  Karena itu diskon, brokerage, installment, ringkasan penutupan, polis dari CI, report, dan cetak dokumen yang sekarang langsung memakai premi jadwal tanpa perubahan lain. Deductible diisi per cover seperti biasa.
- **Release** mengecek tiap kapal:
  - nama terisi;
  - tiap section yang punya nilai juga punya rate, dan sebaliknya;
  - minimal satu section berpremi.
- **Server.** Saat slip disimpan, interest dan rate disusun ulang dari jadwal yang sudah dibersihkan, supaya premi tersimpan selalu sama dengan jadwal.
- **Audit.** Perubahan jadwal tercatat per kapal: format, lalu nilai × rate per section.

## Asumsi

- **TSI = H&M + IV + AOI.** War tidak ditambahkan karena menjamin kapal yang sama: di contoh Patria, nilai War = H&M + IV.
- **Rate jadwal dalam persen**, sama dengan rate Marine Hull yang sudah ada.

## File utama

- `lib/marine-hull.ts`:
  - tipe jadwal, hitungan premi dan total;
  - teks VESSEL;
  - kolom per format;
  - `hullSlipRows` (interest dan rate dari jadwal);
  - `hullScheduleIssues`;
  - `cleanHullSchedule`.
- `lib/marine-hull-import.ts`: baca upload dan template Excel.
- `components/underwriting/slip-hull-schedule.tsx`: tabel kapal dan drawer kapal.
- `components/underwriting/hull-upload.tsx`: drawer upload.
- `components/underwriting/placing-slip-form.tsx`: saklar, ringkasan interest, dan tabel di Rate & Premium.
- `components/underwriting/slip-model.ts`: slip Marine Hull baru memakai jadwal, konversi objek lama, dan cek release.
- `lib/calc.ts`: `recalcSlip` memakai jadwal.
- `lib/server/placing-slips.ts`, `app/(app)/placement/actions.ts`: simpan dan baca jadwal.
- `lib/server/tariffs.ts`: cek release di server.
- `lib/slip-audit.ts`.
- Migrasi `20261126120000_jadwal_kapal_marine_hull`.
- `tests/marine-hull.test.ts`.

## Dampak

- **Database:** kolom baru `placing_slips.hull_schedule` (JSONB, boleh NULL). Slip lama NULL dan tidak berubah.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build (`prisma migrate deploy`).

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 463 lolos. Tes baru memakai angka jadwal Patria:
  - Premi PATRIA NAWASENA 1: H&M 926.287.815,72, IV 39.584.949,39, War 19.792.474,69.
  - Total: H&M 4.789.715.880,53, IV 204.688.712,85, War 102.344.356,42, jumlah 5.096.748.949,80. Sama dengan sheet Patria.
  - Contoh MHL PRATIWI SATU: premi H&M 10.816, IV 336, War 100, tahun lalu 10.720.
  - Upload Patria dan upload MHL dengan judul dua baris.
  - Slip jadwal kapal: satu objek dengan TSI 1.023.443.564.216, tiga baris flat, urutan cover MHL, dan deductible baris tetap saat format diganti.
  - Cek release.
- **Browser lokal:** slip Marine Hull baru, upload 4 kapal Patria dari template.
  - Tabel dan total per section sama dengan sheet Patria. Simpan Draft berhasil.
  - Di database: `hull_schedule` berisi 4 kapal, satu baris Interest senilai 1.023.443.564.216, dan tiga baris rate flat.
  - Setelah reload, Total Premium dan Total Payable 5.096.748.949,80.
  - Cetak Placing Slip: interest berisi teks kapal, Rate & Premium berisi H&M, IV, dan War flat.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **PR berikutnya:**
  - Cetak dua template slip (gaya CI Patria dan signed slip MHL) dengan lampiran jadwal kapal.
  - Rincian installment per section: H&M per kuartal, IV dan War di cicilan pertama.
- **Lampiran jadwal kapal lebar** (16 kolom Patria, 40 kolom MHL). `@page` landscape bernama pernah gagal di Chrome (`docs/changes/lampiran-unit-as-attached-2026-11-09.md`), jadi jadwal kapal sebaiknya dicetak sebagai dokumen terpisah berukuran landscape. Contoh dari LCH Singapore juga memisahkannya.
