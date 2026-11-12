# Additional Fee polis lama diisi dari slipnya

- **Tanggal:** 2026-11-12
- **Branch:** `fix/fee-polis-dari-slip-lama`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Report Operational menghitung Additional Fee dari polis di Policy Database. Sejak #213 (10 November 2026), fee di placing slip ikut tersalin ke polis saat polis dicatat dari slip (`policyFieldsFromSlip`). Polis yang tercatat sebelum itu tetap bernilai 0.

Harry dan Agus menemukannya pada 12 November 2026. Slip 007 (Motor Vehicle, Manesh) punya Additional Fee 15, tetapi polis renewal 45020125022398 yang tercatat dari slip itu masih 0. Akibatnya report 2025 (Tahunan, acuan Desember 2025) menampilkan Additional Fee Rp 0. Hal yang sama terjadi di demo maupun di VPS.

## Yang berubah

Migrasi data `20261112130000_backfill_fee_polis_dari_slip` mengisi Additional Fee polis dari placing slip-nya dengan aturan yang sama seperti pencatatan sekarang:
- hanya polis Baru atau Renewal yang terhubung ke placing slip (bukan endorsement atau cancellation slip);
- hanya polis yang fee-nya masih 0 dan slipnya punya fee, jadi fee yang sudah diisi atau diubah di Policy Database tidak tertimpa;
- bagian EQVET dari slip PAR + EQVET dilewati, karena fee slip itu ikut polis PAR.

Record Endorsement dan Cancellation tidak disentuh.

## File utama

- `prisma/migrations/20261112130000_backfill_fee_polis_dari_slip/migration.sql`

## Dampak

- **Database:** migrasi data (UPDATE), tanpa perubahan skema. Jalan otomatis saat build/deploy, di demo Vercel dan di VPS, karena keduanya menjalankan `prisma migrate deploy`. Perkiraan di kedua database: polis renewal 45020125022398 (Manesh) mendapat fee 15 dari slip 007. Polis lama lain yang slipnya punya fee ikut terisi. Tidak tercatat di Audit Trail, karena perubahan lewat migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- **Uji SQL di database lokal**, di dalam transaksi yang di-rollback. Skenario: fee slip 006, 011, dan 012 diisi; satu polis diberi fee sendiri; satu polis diubah menjadi endorsement; satu polis menjadi bagian EQVET. Hasilnya:
  - polis Baru dari slip ber-fee terisi (75.000);
  - polis yang sudah punya fee tidak ditimpa (tetap 5.000);
  - endorsement tetap 0;
  - bagian EQVET tetap 0.

  Setelah rollback, semua kembali 0.
- **Agregasi report** sudah dicek sebelumnya: polis dengan fee tampil per COB dan per insurer. Di VPS, report 2026 menampilkan fee Rp 15 dari record endorsement Manesh.
- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts`, dan `npm run build` (termasuk `prisma migrate deploy` lokal): lolos.

## Catatan untuk yang melanjutkan

- **Pengisian fee lewat migrasi hanya sekali.** Untuk polis berikutnya, fee tetap disalin saat polis dicatat dari slip (#213). Revisi slip setelah polis bernomor asli tidak menyalin ulang fee; ubah lewat Edit polis.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
