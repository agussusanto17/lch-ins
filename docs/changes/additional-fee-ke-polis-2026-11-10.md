# Additional fee: revisi slip ikut ke polis, switch PPN, dan audit

- **Tanggal:** 2026-11-10
- **Branch:** `fix/additional-fee-ke-polis`
- **PR:** [#213](https://github.com/agussusanto17/lch-ins/pull/213)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ada tiga laporan Agus pada 10 November 2026, dari pengujian Harry di demo.

1. **Additional fee belum masuk report produksi.** Report membaca fee dari Policy Database, jadi masalahnya ada di polis. Urutan kejadian di demo, menurut Audit Trail:
   - **17.00:** CI 007/LCH-PLCMT/PS-MV/XI/2026 terbit, dan polisnya tercatat otomatis dengan fee 0.
   - **17.07:** Harry merevisi slip itu dan mengisi Additional Fee.

   Revisi slip sesudah CI terbit tidak diteruskan ke polis. Akibatnya polis dan report tetap membaca 0.
2. **Additional fee perlu tombol include/exclude PPN seperti Brokerage.**
3. **Revisi slip tidak menunjukkan apa yang berubah.** Audit Trail hanya menulis "Tidak ada rincian perubahan", karena audit revisi slip hanya mencatat nama tertanggung, status, dan tanggal dokumen.

## Yang berubah

- **Revisi slip setelah CI terbit ikut ke polis** (`syncPoliciesFromSlipRevision` di `lib/server/auto-policies.ts`):
  - **Kapan:** slip yang sudah Closed disimpan lagi, dan dari slip itu ada polis yang nomornya masih nomor sementara dari CI.
  - **Yang disalin:** hanya isian polis dari slip yang berubah pada revisi itu, misalnya fee, premi, brokerage, periode, atau panel asuransi. Perbandingannya memakai `changedSlipFields` di `lib/policy-from-slip.ts`.
  - **Yang tidak tertimpa:** isian yang diubah petugas polis di Policy Database, selama isian slip yang sama tidak ikut berubah.
  - **Yang tidak disentuh:** polis yang nomornya sudah diganti nomor polis dari asuransi. Sejak itu datanya mengikuti polis asli.
  - **Panel asuransi** dibandingkan dari nama, share, dan peran, bukan dari id barisnya.
  - **Polis EQVET** tetap tanpa fee, karena fee ikut polis PAR.
  - **Hasilnya:** perubahan polis tercatat di audit polis. Form slip menampilkan info "Polis … ikut diperbarui dari revisi slip." Kalau gagal, revisi slip tetap tersimpan dan alasannya tampil sebagai info.
- **Switch "Include VAT (PPN 2,2%)" untuk Additional Fee** di form slip (Property dan Motor Vehicle), seperti di Brokerage:
  - Kolom baru `placing_slips.additional_fee_include_vat`.
  - Kalau switch menyala dan fee terisi, form menampilkan "PPN 2,2% (termasuk)" dan "Fee sebelum PPN" (`additionalFeeVatAmount` di `lib/calc.ts`).
  - Tarifnya diasumsikan sama dengan brokerage (2,2%).
  - Seperti brokerage, status PPN ini belum dibawa ke polis dan report.
  - Isian fee sekarang berada sesudah ringkasan brokerage, supaya setiap rincian dekat dengan isiannya.
- **Audit revisi slip** sekarang juga mencatat Brokerage (%), Brokerage termasuk PPN, Additional fee, dan Additional fee termasuk PPN. Additional fee tampil sebagai nilai uang.

## File utama

- `lib/server/auto-policies.ts`, `lib/policy-from-slip.ts`, `app/(app)/placement/actions.ts`
- `lib/calc.ts`, `lib/data/types.ts`, `lib/server/placing-slips.ts`
- `components/underwriting/placing-slip-form.tsx`, `components/audit/audit-fields.ts`
- `prisma/schema.prisma`, `prisma/migrations/20261110200000_additional_fee_ppn/migration.sql`
- `tests/slip-revision-policy.test.ts` (baru, 7 tes)

## Dampak

- **Database:** migrasi `20261110200000_additional_fee_ppn` menambah kolom boolean dengan default `false`. Kode lama tetap jalan dengan kolom ini.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build. Polis 007 di demo **tidak otomatis** ikut berubah, karena fee slip 007 sudah tersimpan sebelum perbaikan ini. Ada dua cara memperbaikinya:
  - ubah nilai fee di slip 007, lalu Simpan Revisi;
  - isi Additional Fee langsung di polisnya di Policy Database.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts` (172 tes, termasuk 7 tes baru), dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara) dengan slip `015/LCH-PLCMT/PS-TS/XI/2026` (Property, Closed):
  1. "Catat polis dari CI ini" mencatat polis `015/LCH-PLCMT/CI-TS/XI/2026` dengan fee 0. Lewat SQL, grouping insured polis diubah menjadi "GRUP UJI" dan brokerage menjadi 7,5, untuk meniru perubahan dari petugas polis.
  2. Di form closing, fee diisi 102.200 dan Include VAT dinyalakan. Rinciannya menampilkan PPN IDR 2.200 dan fee sebelum PPN IDR 100.000.
  3. Setelah Simpan Revisi:
     - info "Polis 015/LCH-PLCMT/CI-TS/XI/2026 ikut diperbarui dari revisi slip." tampil;
     - polis berisi fee 102.200, sementara brokerage 7,5 dan grouping "GRUP UJI" tetap;
     - audit polis mencatat `additionalFee` 0 → 102.200;
     - audit slip mencatat `additionalFee` dan `additionalFeeIncludeVat`.
  4. Revisi yang hanya mengubah Subjectivity tidak mengubah polis: jumlah audit Update polis tetap 1.
  5. Tidak ada error di console. Polis uji, audit uji, dan sesi dihapus, dan slip 015 dikembalikan.

## Catatan untuk yang melanjutkan

- **Waktu audit di database lokal tergeser 7 jam** dari `now()` database: baris yang ditulis aplikasi pukul 17.38 WIB tersimpan sebagai 10.38+07. Demo tidak mengalami ini. Di skrip uji lokal, bersihkan data uji berdasarkan id, bukan waktu.
- **Struktur bagian slip yang berubah sesudah CI** belum ditangani, misalnya premi EQVET yang tadinya 0 lalu terisi sehingga slip menjadi dua polis PAR/EQVET. Polis yang sudah ada diperbarui per bagiannya saja.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
