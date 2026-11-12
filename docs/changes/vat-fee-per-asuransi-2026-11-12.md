# Status PPN additional fee per asuransi

- **Tanggal:** 2026-11-12
- **Branch:** `feat/vat-fee-per-asuransi`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Sejak #230, additional fee diisi dalam persen per asuransi di panel Security form closing. Status PPN-nya masih satu saklar untuk seluruh slip ("Additional fee include VAT"), lalu disalin ke polis sebagai satu status.
- **Permintaan Harry, 12 November 2026:** tambahkan include/exclude VAT per asuransi, karena additional fee tiap asuransi di panel berbeda-beda, termasuk status PPN-nya.

## Yang berubah

- **Form closing, panel Security:** setiap asuransi punya saklar **Incl. VAT** di bawah isian Additional Fee (%), di samping nominal fee asuransi itu. Saklar satu slip di bawah panel dihapus.
  - Ringkasan menampilkan PPN 2,2% (termasuk) dan Fee sebelum PPN kalau ada asuransi yang fee-nya termasuk PPN. PPN dihitung per asuransi: hanya dari fee asuransi yang saklarnya menyala.
  - Kolom fee di layar lebar melebar dari 170 px ke 200 px supaya saklar dan nominal muat.
- **Kolom baru `additional_fee_include_vat`** di `slip_security_panel` dan `policy_insurers` (migrasi `20261112170000_vat_fee_per_asuransi`).
  - Status lama per slip dan per polis disalin ke setiap asuransinya, jadi data yang sudah ada tidak berubah artinya.
  - Kolom lama `placing_slips.additional_fee_include_vat` dan `policies.additional_fee_include_vat` tidak dipakai lagi. Kolomnya dibiarkan supaya kode versi sebelumnya tetap jalan selama deploy.
- **Polis:**
  - Polis dari slip menyalin status PPN fee per asuransi dari panel, termasuk polis yang dicatat otomatis saat CI terbit dan record endorsement atau pembatalan dari ES/CS.
  - **Form polis co-insurance:** daftar co-insurance menulis "fee 12,5% incl. VAT" per asuransi. Nominal fee menulis PPN yang termasuk di dalamnya, dari asuransi yang fee-nya termasuk PPN. Saklar PPN fee satu polis tidak tampil lagi untuk co-insurance.
  - **Polis satu asuransi** (termasuk polis manual) tetap memakai saklar "Additional fee include VAT" di form polis, dan statusnya disimpan di baris asuransi itu.
- **Revisi slip setelah CI terbit** (#213) ikut membandingkan status PPN per asuransi. Saklar Incl. VAT yang diubah di slip Closed ikut ke polis yang masih bernomor sementara.
- **Audit trail** slip dan polis mencatat "Additional fee per asuransi", misalnya "PT Asuransi Astra Buana 12.5% termasuk PPN · PT Asuransi Sinar Mas 10%". Sebelumnya persen fee per asuransi belum tercatat di audit.
- **Export Policy Database:** kolom "Fee incl. VAT" berisi Ya, Tidak, atau Sebagian (kalau status PPN berbeda antar asuransi).

## File utama

- `prisma/schema.prisma` dan `prisma/migrations/20261112170000_vat_fee_per_asuransi/migration.sql`.
- `lib/calc.ts`: `additionalFeeVatFor` (PPN per asuransi), `additionalFeeVatAmount`, dan `additionalFeePanelText` untuk audit.
- `components/underwriting/placing-slip-form.tsx`: saklar Incl. VAT per asuransi dan ringkasan fee.
- `lib/server/placing-slips.ts`: simpan dan baca status per asuransi, serta audit.
- `lib/policy-from-slip.ts`: salin dan bandingkan status per asuransi.
- `lib/server/policies.ts`, `app/(app)/policies/actions.ts`, `app/(app)/placement/actions.ts`: simpan, validasi, dan audit.
- `components/policies/policy-form.tsx`, `components/policies/policy-database.tsx`, `components/audit/audit-fields.ts`.
- `tests/slip-revision-policy.test.ts`: PPN per asuransi, ringkasan audit, dan revisi status PPN satu asuransi.

## Dampak

- **Database:** migrasi `20261112170000_vat_fee_per_asuransi`. Dua kolom BOOLEAN baru, ditambah penyalinan status lama.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build seperti biasa. Kolom lama tetap ada, jadi deployment lama tidak error selama build.
- **Report dan rekap produksi** tidak berubah, karena keduanya membaca nominal fee, bukan status PPN-nya.

## Verifikasi

- `npx prisma generate`, `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (220 tes, 2 tes baru), dan `npm run build`: lolos. Build menerapkan migrasi di database lokal.
- **Uji browser lokal** (build `next start`, sesi admin sementara; slip MV uji co-insurance Astra Buana 60% dan Sinar Mas 40%, dihapus lagi setelah uji):
  - **Form closing:** fee 12,5% dan 10%, Incl. VAT hanya di Astra Buana. Ringkasan: total fee IDR 904.187,50, PPN IDR 12.693,86 (dari fee Astra Buana IDR 589.687,50), dan fee sebelum PPN IDR 891.493,64.
  - **Setelah CI terbit:** panel slip dan polis menyimpan status PPN Astra Buana ya dan Sinar Mas tidak, dengan fee polis IDR 904.187,50.
  - **Form polis:** daftar co-insurance menulis "fee 12,5% incl. VAT" dan "fee 10%", nominal fee menulis "termasuk PPN 2,2% IDR 12.693,86", dan saklar PPN fee satu polis tidak tampil.
  - **Revisi slip Closed** yang menyalakan Incl. VAT Sinar Mas: info "Polis … ikut diperbarui dari revisi slip." tampil, kedua asuransi polis menjadi termasuk PPN, dan audit slip maupun polis mencatat "Additional fee per asuransi" sebelum dan sesudahnya.
  - Tidak ada error console.
- **Migrasi di database lokal:** 3 slip dan 3 polis yang sebelumnya bertanda PPN fee menjadi 6 baris panel dan 6 baris asuransi polis yang bertanda PPN.

## Catatan untuk yang melanjutkan

- Hapus kolom lama `placing_slips.additional_fee_include_vat` dan `policies.additional_fee_include_vat` setelah semua deploy memakai versi ini.
- Kalau report atau rekap produksi nanti perlu memisahkan PPN fee, pakai `additionalFeeVatFor` dengan baris asuransi polis.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
