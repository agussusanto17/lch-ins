# Polis MOP dari Closing Instruction, deklarasi di bawahnya

- **Tanggal:** 2026-11-16
- **Branch:** `feat/mop-polis-induk-deklarasi`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Di apps.lch.co.id, Closing Instruction slip open cover 007/LCH-PLCMT/PS-MOP/XI/2026 tidak mencatat polis. Tombol "Catat polis dari CI ini" menampilkan "Slip open cover: polis dicatat per deklarasi di Policy Database."
- Desain sebelumnya (Harry, 6 November 2026; PR #168) mencatat setiap deklarasi sebagai polis baru dari slip, tanpa polis MOP-nya.
- Agus, 16 November 2026: MOP harus tercatat di Policy Database dari slip, lalu deklarasinya dicatat di polis itu. Pilihannya: tiap deklarasi dicatat sebagai data (nomor sertifikat, tanggal, nilai, premi dari rate slip) beserta file-nya, dan premi per deklarasi masuk Report dan Rekap Produksi dengan nomor polis MOP.

## Yang berubah

- **Tipe polis Deklarasi** (lookup `policy_type`, kode `declaration`): satu pengiriman di bawah polis MOP, dengan nomor sertifikat dan premi sendiri.
- **CI slip open cover mencatat polis induk MOP**, sama seperti slip lain: nomor sementara dari CI, nilai dan premi 0, periode slip. CI yang terbit sebelum perubahan ini memakai tombol "Catat polis MOP dari CI ini" di dokumen CI. Keterangan di dokumen CI menyebut deklarasi dicatat dari polis itu.
- **Tambah deklarasi** di menu baris polis MOP di Policy Database. Form deklarasi berisi:
  - No. Sertifikat / Deklarasi;
  - Tanggal Deklarasi, yang menentukan bulan produksi;
  - Tanggal Berakhir, default akhir polis MOP;
  - Nilai Deklarasi;
  - Kategori Rate dari slip: premi = nilai × rate, atau jumlah unit × tarif per unit untuk rate per container;
  - Premium, yang tetap bisa diubah;
  - berkas.

  Tertanggung, asuransi, brokerage, dan additional fee ikut polis MOP.
- **Validasi:**
  - deklarasi wajib menunjuk polis MOP, dicek di form dan server;
  - nilai dan premi deklarasi harus lebih dari 0;
  - satu slip open cover hanya satu polis MOP;
  - polis MOP boleh tanpa premi (premi deposit tetap bisa diisi).
- **Ambil dari placing slip** tidak lagi menawarkan slip open cover. Polis MOP dari CI, deklarasi dari polis MOP.
- **Report Operational:** baris "Deklarasi MOP" di Ringkasan Periode. Premi deklarasi masuk produksi menurut tanggal deklarasi.
- **Rekap Produksi:** deklarasi ditulis tipe NEW dengan policyno = nomor polis MOP dan CERTIFICATENO = nomor deklarasi, periode polis MOP. Polis MOP tanpa premi tidak ditulis.
- **Lainnya:**
  - renewal notice tidak memuat deklarasi;
  - revisi slip setelah CI tidak menimpa deklarasi;
  - deklarasi tidak bisa menjadi induk polis lain;
  - di form klaim, deklarasi bisa dipilih sebagai polis klaim (satu pengiriman).

## File utama

- `prisma/migrations/20261116110000_deklarasi_mop/migration.sql`: tipe Deklarasi dan konversi data lama.
- `lib/server/auto-policies.ts`: polis MOP dari CI; deklarasi tidak dihitung sebagai polis CI dan tidak disinkron dari revisi slip.
- `lib/server/policies.ts`: satu polis MOP per slip, deklarasi wajib di bawah polis MOP.
- `lib/open-cover.ts`: `isOpenCoverMaster`.
- `components/policies/policy-database.tsx`: menu Tambah deklarasi.
- `components/policies/policy-form.tsx`: mode deklarasi, Kategori Rate, validasi.
- `components/documents/slip-documents.tsx`: keterangan polis MOP di dokumen CI.
- `lib/production-recap.ts`, `lib/server/production-recap.ts`: baris deklarasi di Rekap Produksi.
- `components/reports/report-view.tsx`, `lib/renewal.ts`, `lib/policy-parent.ts`, `lib/data/*`, `lib/form-options.ts`, `prisma/seed.ts`: tipe Deklarasi.

## Dampak

- **Database:** migrasi `20261116110000_deklarasi_mop` menambah tipe polis Deklarasi. Data lama juga diubah: polis dari slip open cover tanpa induk menjadi deklarasi di bawah polis MOP baru dengan nomor sementara CI. Di apps.lch.co.id per 16 November tidak ada data lama, karena slip 007 belum punya polis. Di DB lokal, 2 polis uji SIT/MOP/DECL/001 dan 002 terkonversi ke polis MOP 011/LCH-PLCMT/CI-MOP/XI/2026.
- **Env:** tidak ada.
- **Deploy:** setelah live, buka CI 007/LCH-PLCMT/CI-MOP/XI/2026 di apps.lch.co.id dan klik "Catat polis MOP dari CI ini".

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 263 tes, 263 lolos. Tes baru meliputi baris deklarasi di Rekap Produksi, polis MOP tanpa premi tidak ditulis, label dan validasi polis MOP, `isOpenCoverMaster`, dan renewal notice tanpa deklarasi.

## Catatan untuk yang melanjutkan

- Keputusan Harry 6 November (premi dicatat per deklarasi) tetap berlaku: deklarasi masih record sendiri dengan premi, kini di bawah polis MOP.
- Kode tipe NEW untuk deklarasi di Rekap Produksi adalah asumsi. Ubah `TYPE_CODES` di `lib/production-recap.ts` bila LCH memakai kode lain.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
