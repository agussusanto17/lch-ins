# Klaim: co-insurance dari nilai dibayar dan isian deductible

- **Tanggal:** 2026-11-18
- **Branch:** `feat/klaim-dibayar-deductible`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Lanjutan [detail-klaim-coinsurance-checklist-2026-11-18.md](detail-klaim-coinsurance-checklist-2026-11-18.md) (PR #262), yang menghitung bagian tiap asuransi co-insurance dari estimasi kerugian.
- Agus, 18 November 2026, setelah melihat klaim polis 50013026001304 (10 asuransi) di produksi:
  - bagian tiap asuransi seharusnya diambil dari nilai yang disetujui/dibayar, bukan dari estimasi kerugian;
  - form klaim perlu isian deductible.

## Yang berubah

- **Co-insurance dari nilai disetujui/dibayar:**
  - detail klaim dan cetakan Lembar Detail Klaim menghitung bagian tiap asuransi dari `paidAmount` (isian "Nilai Disetujui/Dibayar");
  - kalau nilai dibayar masih 0, nama, Leader/Member, dan share tetap tampil. Nominalnya "—" dengan keterangan "Bagian tiap asuransi muncul setelah jumlah dibayar diisi." Cetakan tidak menulis nominal.
- **Isian Deductible (nominal):**
  - kolom baru `claims.deductible_amount` (DECIMAL 18,2, default 0);
  - form klaim punya isian "Deductible (IDR)". Grup Nilai Kerugian & Klaim menjadi 2 × 2: Estimasi Kerugian, Nilai Diajukan, Deductible, dan Nilai Disetujui/Dibayar;
  - detail klaim (bagian Nilai klaim) dan cetakan (Rincian Nilai Klaim) menampilkan baris Deductible;
  - perubahan deductible tercatat di audit trail dengan label "Deductible" dalam format uang.
- Syarat deductible polis tetap tampil di panel info polis form klaim, sebagai acuan mengisi nominalnya.

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261118160000_klaim_deductible/migration.sql`
- `lib/data/types.ts`, `lib/server/claims.ts`, `app/(app)/claims/actions.ts`
- `components/claims/claim-form.tsx`, `components/claims/claim-detail-sheet.tsx`
- `components/documents/claim-documents.tsx`, `components/audit/audit-fields.ts`
- `lib/claim-detail.ts`, `tests/claim-detail.test.ts`

## Dampak

- **Database:** migrasi `20261118160000_klaim_deductible` menambah satu kolom dengan default 0. Kolom ini jalan otomatis saat build dan tetap cocok dengan kode lama.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Perilaku baru:** klaim co-insurance yang belum punya nilai dibayar tidak lagi menampilkan nominal per asuransi.

## Verifikasi

- `npx prisma migrate deploy` (DB lokal), `npx tsc --noEmit`, eslint file yang berubah, `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 276 tes lolos.
- **Browser lokal** (port 3002, SIT Admin), klaim CLM-LCH002/MV/XI/2026, polis 018/LCH-PLCMT/CI-MV/XI/2026 (Astra Buana 60%, Sinar Mas 40%):
  - **Sebelum edit:** Deductible IDR 0, dan co-insurance menampilkan "—" dengan keterangan.
  - **Edit klaim:** isi Deductible 300.000 (sesuai deductible polis IDR 300.000 for any one accident) dan Nilai Disetujui/Dibayar 14.700.000. Toast "Klaim berhasil diperbarui".
  - **Detail:** Deductible IDR 300.000, Jumlah dibayar IDR 14.700.000, Astra Buana IDR 8.820.000, Sinar Mas IDR 5.880.000.
  - **Cetakan:** baris yang sama, plus Deductible IDR 300.000 di Rincian Nilai Klaim.
  - **Audit:** `deductibleAmount` 0 → 300000 dan `paidAmount` 0 → 14700000.
  - Data uji dikembalikan (nilai klaim, `updated_at`), dan baris audit uji dihapus.

## Catatan untuk yang melanjutkan

- Deductible klaim belum ikut di rumus loss ratio (MoM poin 12). Rumus yang disepakati memakai klaim + adjuster fee − salvage.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
