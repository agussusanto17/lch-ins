# Premi prorata hari, admin cost, dan stamp duty di form endorsement

- **Tanggal:** 2026-11-11
- **Branch:** `feat/premi-prorata-endorsement`
- **PR:** [#217](https://github.com/agussusanto17/lch-ins/pull/217)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Permintaan Agus, 11 November 2026: form endorsement di Policy Database perlu isian rate dan kolom prorata hari.

- **Prorata hari:** dari tanggal efektif endorsement sampai tanggal akhir polis, dibagi 365.
- **Contohnya:** 525.000.000 × rate × 14/365 = premi.
- **Isian tambahan:** admin cost dan stamp duty, untuk menghasilkan total premi.

Rumusnya ada di `documents/Rumus Prorate Hari.xlsx`:

- **Sheet MASTER:**
  - Number of Days = DATEDIF(start, end). Contohnya 10 Nov 2026 s/d 24 Nov 2026 = 14 hari.
  - Setiap baris dihitung TSI × Rate (%) × hari / 365.
  - Hasilnya dijumlahkan menjadi Additional Premium, lalu ditambah Administration Cost menjadi Total.
- **Sheet2 dan CALCULATION:** Policy Cost dan Stamp Duty juga ditambahkan ke total.
- **Di semua sheet,** rate dikalikan TSI penuh per jaminan, bukan hanya tambahan UP.

## Yang berubah

- **Form polis tipe Endorsement** mendapat isian baru:
  - **TSI Dasar Premi** (opsional): sum insured yang dikalikan rate.
    - Kosongkan kalau sama dengan Total Sum Insured, misalnya endorsement tambah UP.
    - Isi UP penuh kalau rate atau jaminan berubah tanpa mengubah UP, seperti contoh 525 jt. Dengan begitu kolom Total Sum Insured (tambahan/pengurangan UP) tetap 0, dan cetakan maupun report tidak membaca UP bertambah.
  - **Rate (%)**, sampai 6 desimal.
  - **Prorata Hari:** dihitung dari Tanggal Efektif s/d Tanggal Berakhir, dan hanya bisa dibaca.
  - **Premium:**
    - Kalau rate diisi, premi dihitung otomatis dengan rumus dasar premi × rate × hari / 365 dan hanya bisa dibaca. Rumusnya tampil di bawah isian.
    - Tanpa rate, premi tetap diisi manual seperti sebelumnya.
    - Sum insured negatif menghasilkan pengembalian premi.
  - **Admin Cost** dan **Stamp Duty**.
  - **Total Premi** = premi + admin cost + stamp duty.
- **Susunan isian uang di form endorsement:**
  - Mata Uang | Total Sum Insured
  - TSI Dasar Premi | Rate
  - Prorata Hari | Premium
  - Admin Cost | Stamp Duty
  - Total Premi
  - Brokerage | Additional Fee
- **Server menghitung ulang premi** endorsement yang ber-rate (`endorsementPremium` di `lib/endorsement-premium.ts`). Rate, TSI dasar premi, admin cost, dan stamp duty hanya disimpan untuk tipe Endorsement.
- **Kolom `premium` tetap premi produksi** yang dibaca report. Admin cost dan stamp duty disimpan terpisah.
- **Cetak endorsement:** baris premi menampilkan rumusnya, misalnya "IDR 525.000.000,00 × 2,39% × 14/365". Biaya Administrasi dan Bea Meterai tampil kalau terisi, dan Total = premi + keduanya.
- **Audit polis** ikut mencatat rate, admin cost, dan stamp duty.

## File utama

- `lib/endorsement-premium.ts` (baru): hari prorata, premi prorata, dasar premi, dan total premi.
- `components/policies/policy-form.tsx`, `components/documents/endorsement-document.tsx`
- `lib/server/policies.ts`, `app/(app)/policies/actions.ts`, `lib/data/types.ts`
- `prisma/schema.prisma`, `prisma/migrations/20261111090000_premi_prorata_endorsement/migration.sql`
- `tests/endorsement-premium.test.ts` (baru, 6 tes)

## Dampak

- **Database:** migrasi `20261111090000_premi_prorata_endorsement` menambah kolom berikut di `policies`:
  - `rate` dan `premium_basis` (boleh kosong);
  - `admin_cost` dan `stamp_duty` (default 0).

  Polis lama tidak berubah.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build.

## Verifikasi

- **Tes otomatis:** `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts` (187 tes, termasuk 6 tes baru), dan `npm run build` lolos. Tes rumus memakai angka sheet MASTER:
  - HM 16,8 M × 0,4015% × 299/365 = 55.255.200;
  - IV = 3.530.002,19;
  - WAR = 1.771.882,19;
  - Total + admin 50.000 = 60.607.084,38.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara). Lewat "Buat endorsement" pada `PAR/2025/JKT/0871`, isiannya: efektif 18 Agustus 2026, berakhir 1 September 2026, Total Sum Insured 0, TSI Dasar Premi 525.000.000, rate 2,39%, admin cost 50.000, stamp duty 10.000. Hasilnya:
  - Prorata Hari 14, Premium otomatis 481.273,97 (hanya baca), dan rumusnya tampil;
  - Total Premi 541.273,97;
  - tersimpan dengan UP 0, dasar 525 jt, rate 2,39, premi 481.273,97, admin 50.000, dan meterai 10.000;
  - cetak endorsement menampilkan rumus, Biaya Administrasi, Bea Meterai, dan Total IDR 541.273,97, tanpa baris perubahan UP.
  - Endorsement uji dan audit-nya dihapus. Tidak ada error di console.
- **Database lokal:** migrasi sempat diterapkan dengan versi tanpa `premium_basis`, lalu dibatalkan dan diterapkan ulang dengan versi final.

## Catatan untuk yang melanjutkan

- **Satu endorsement satu rate.** Rumus Excel bisa memuat beberapa baris jaminan (misalnya HM, IV, WAR) atau baris pengembalian perhitungan lama. Kalau LCH butuh itu di sistem, isiannya perlu dibuat per baris.
- **Pembatalan tetap memakai usulan prorata dari premi (#207)**, bukan rate.
- **Tahun kabisat:** pembagi tetap 365 sesuai permintaan, walaupun satu contoh di sheet DUMMY memakai 366.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
