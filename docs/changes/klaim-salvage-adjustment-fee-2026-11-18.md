# Klaim: isian adjustment asuransi, nilai salvage, dan adjuster fee

- **Tanggal:** 2026-11-18
- **Branch:** `feat/klaim-salvage-adjustment-fee`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Lanjutan [klaim-dibayar-deductible-2026-11-18.md](klaim-dibayar-deductible-2026-11-18.md) (PR #265), yang menambah isian Deductible.
- Team LCH, 18 November 2026, meminta isian angka di form klaim, dengan pengertian berikut:
  - **Nilai Salvage:** nilai penjualan kembali barang yang diklaim/rusak, lebih rendah dari harga normal.
  - **Adjustment Asuransi:** untuk klaim yang nilainya di-adjust/dikurangi asuransi karena tidak dijamin polis.
  - **Adjuster Fee:** biaya jasa adjuster yang ditambahkan asuransi dalam catatan nilai klaim.
  - **Deductible:** potongan nilai klaim berupa risiko sendiri sesuai ketentuan polis. Bisa berbeda per penyebab kejadian. Isian ini sudah ada sejak #265.
- Ini juga memenuhi MoM review Phase 1 poin 11 (adjuster fee) dan poin 12 (salvage). Adjuster fee dibuat sebagai nominal: 0 berarti tanpa adjuster fee, jadi tidak perlu pilihan Ya/Tidak terpisah.

## Yang berubah

- **Kolom baru di `claims`**, semuanya DECIMAL(18,2) dengan default 0:
  - `adjustment_amount`;
  - `salvage_amount`;
  - `adjuster_fee_amount`.
- **Form klaim, grup Nilai Kerugian & Klaim:**
  - baris pertama kembali 3 kolom: Estimasi Kerugian, Nilai Diajukan, dan Nilai Disetujui/Dibayar;
  - di bawahnya ada blok 2 × 2: Adjustment Asuransi, Deductible, Nilai Salvage, dan Adjuster Fee. Setiap isian diberi keterangan singkat dari pengertian Team LCH.
- **Detail klaim (Nilai klaim) dan cetakan (Rincian Nilai Klaim)** menampilkan semua nilai dengan urutan yang sama dengan form.
- **Audit trail** mencatat perubahan ketiga nilai dengan label Adjustment asuransi, Nilai salvage, dan Adjuster fee, dalam format uang.
- **Nilai Disetujui/Dibayar** tetap diisi manual sesuai angka dari asuransi. Sistem tidak menghitungnya dari potongan.

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261118170000_klaim_salvage_adjustment_fee/migration.sql`
- `lib/data/types.ts`, `lib/server/claims.ts`, `app/(app)/claims/actions.ts`
- `components/claims/claim-form.tsx`, `components/claims/claim-detail-sheet.tsx`
- `components/documents/claim-documents.tsx`, `components/audit/audit-fields.ts`

## Dampak

- **Database:** migrasi `20261118170000_klaim_salvage_adjustment_fee` menambah tiga kolom dengan default 0. Migrasi jalan otomatis saat build dan tetap cocok dengan kode lama.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx prisma migrate deploy` (DB lokal), `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 276 tes lolos.
- **Browser lokal** (viewport 1280, SIT Admin), klaim CLM-LCH002/MV/XI/2026:
  - **Form:** tampil 3 kolom nilai utama dan blok 2 × 2 dengan keterangan.
  - **Isian uji:** Diajukan 15.000.000, Dibayar 14.400.000, Adjustment 200.000, Deductible 300.000, Salvage 100.000, dan Adjuster Fee 1.500.000.
  - **Hasil:** detail dan cetakan menampilkan keenam nilai. Co-insurance ikut dari nilai dibayar: Astra Buana 8.640.000, Sinar Mas 5.760.000.
  - **Audit:** mencatat keenam perubahan.
  - Data uji dikembalikan (nilai klaim, `updated_at`), dan baris audit uji dihapus.

## Catatan untuk yang melanjutkan

- Loss ratio (MoM poin 12 dan 13) bisa memakai `adjusterFeeAmount` dan `salvageAmount` dari kolom ini. Rumusnya menunggu konfirmasi Team LCH soal nilai klaim yang dipakai.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
