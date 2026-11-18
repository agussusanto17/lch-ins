# Gross dan Nett Premium, diskon polis, dan loss ratio klaim

- **Tanggal:** 2026-11-18
- **Branch:** `feat/gross-premium-loss-ratio`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (17 November 2026):
  - **poin 19:** Gross Premium = Premi − Diskon; Nett Premium = Premi − Diskon − Brokerage − Additional Fee;
  - **poin 13:** form dan detail klaim menampilkan Gross Loss Ratio dan Nett Loss Ratio:
    - Gross Loss Ratio = (Klaim + Adjuster/Surveyor Fee − Salvage) / Gross Premium;
    - Nett Loss Ratio = (Klaim + Adjuster/Surveyor Fee − Salvage) / Nett Premium.
- Sheet "Perhitungan LOSS RATIO" dari Team LCH (`documents/Perhitungan LOSS RATIO.xlsx`, 18 November 2026):
  - loss ratio dihitung per tahun, lalu total semua tahun;
  - NET = PREMI + DISCOUNT + Brokerage, dengan discount dan brokerage bernilai minus;
  - Gross L/R = klaim / premi; expenses (adjuster fee) ditambahkan ke klaim.
- Sebelumnya:
  - diskon hanya ada di slip, polis tidak menyimpan diskon;
  - premi di Policy Database, Dashboard, dan report masih premi sebelum diskon;
  - net ke asuransi di Ringkasan Penutupan = premi − brokerage − fee, tanpa diskon;
  - kolom Premium_Discount di Rekap Produksi selalu 0;
  - belum ada loss ratio.

## Yang berubah

- **Diskon tercatat di polis** (`policies.discount_amount`, bertanda sama dengan premi).
  - Polis dari slip memakai diskon slip per polis, termasuk per bagian PAR/EQVET. Open cover dan deklarasi 0.
  - Endorsement dan pembatalan dari ES/CS memakai selisih diskon prorata.
  - Form polis punya isian Diskon (nominal) dengan keterangan Gross dan Nett Premium. Server menolak diskon yang tandanya beda dengan premi atau melebihi premi.
  - Audit Trail mencatat perubahan Diskon.
- **Gross Premium (premi − diskon)** dipakai di:
  - Policy Database: kolom Gross Premium dengan baris Diskon, kolom Diskon dan Gross Premium di export, footer "Total Gross Premium (setara IDR)";
  - Dashboard (sub-label kartu Total Brokerage) dan Report Operational (kolom dan total Gross Premium);
  - daftar Renewal Notice di Marketing, export, dan cetak daftarnya.
  - Brokerage tetap dihitung dari premi sebelum diskon.
- **Ringkasan Penutupan**:
  - urutan baris: Premi, Diskon x%, Gross Premium, Brokerage (dari premi sebelum diskon), Additional fee, lalu Nett Premium ke asuransi;
  - rincian per asuransi punya kolom Diskon. Selisih pembulatan co-insurance masuk ke asuransi terakhir.
- **Rekap Produksi**: Premium_Discount_OC dan Premium_Discount diisi diskon × share, bertanda minus seperti komisi.
- **Panel Loss Ratio** ada di form klaim (bagian Nilai Kerugian & Klaim) dan di tab Ringkasan detail klaim.
  - Angka utama: Gross dan Nett Loss Ratio total semua tahun polis.
  - Rincian di bawahnya: klaim, adjuster fee, salvage, Gross Premium, dan Nett Premium.
  - Tabel per tahun polis muncul bila polis punya renewal. Kolomnya Gross Premium, Nett Premium, Klaim, Gross L/R, dan Nett L/R, ditutup baris Total. Tahun polis klaim ditandai "Klaim ini".
  - Di form, angkanya ikut isian sebelum disimpan, termasuk klaim baru.

## Asumsi (menunggu konfirmasi Team LCH)

- **Satu tahun polis** = polis Baru atau Renewal beserta endorsement, pembatalan, dan deklarasinya.
  - Tahun-tahunnya diambil dari rantai renewal lewat polis induk (`parent_policy_id`), sebelum dan sesudah polis klaim.
  - Renewal yang hanya mencatat nomor polis lama (`previous_policy_no`) tidak tersambung.
- **Nilai klaim**: jumlah dibayar untuk Settled dan Closed, estimasi kerugian untuk Outstanding dan Partial Settle. Rejected tidak dihitung.
- **Brokerage dan additional fee** dihitung dari premi sebelum diskon.
- **Premium_Discount bertanda minus.** Contoh rekap LCH tidak memuat diskon, tapi sheet loss ratio menjumlahkan premi + discount + brokerage, jadi diskon diperlakukan seperti brokerage.
- **Gross L/R.** Sheet LCH membagi klaim dengan premi, dan diskon di contohnya 0. Panel memakai Gross Premium = premi − diskon sesuai MoM poin 19. Hasilnya sama selama diskonnya 0.
- **Mata uang berbeda** dalam satu rantai polis dan klaim: semua nilai dikonversi ke IDR dengan kurs tetap report.

## File utama

- `lib/calc.ts`: `slipDiscountAmount`, `slipPolicyDiscount`, `grossPremium`, `policyBrokerage`, `nettPremium`.
- `lib/loss-ratio.ts`: rumus loss ratio, nilai klaim per status, tabel per tahun polis (`lossRatioTable`).
- `lib/server/claims.ts`: `lossRatioData`, yang menyusun rantai renewal beserta premi dan klaimnya untuk `getClaimPolicyInfo`.
- `components/claims/loss-ratio-panel.tsx`, `components/claims/claim-form.tsx`, `components/claims/claim-detail-sheet.tsx`.
- `lib/policy-from-slip.ts`, `lib/server/auto-policies.ts`, `lib/server/policies.ts`, `app/(app)/policies/actions.ts`, `components/policies/policy-form.tsx`: diskon polis.
- `lib/data/analytics.ts` (`premiumIdr` = Gross Premium dalam IDR), `components/policies/policy-database.tsx`, `components/reports/report-view.tsx`, `components/dashboard/dashboard-view.tsx`, `components/marketing/renewal-notice.tsx`, `components/documents/renewal-documents.tsx`.
- `lib/closing-summary.ts`, `components/underwriting/closing-summary.tsx`: Ringkasan Penutupan.
- `lib/production-recap.ts`, `lib/server/production-recap.ts`: Premium_Discount.
- `prisma/schema.prisma`, `prisma/migrations/20261119000000_diskon_polis/migration.sql`.
- `tests/gross-premium-loss-ratio.test.ts`.

## Dampak

- **Database:** migrasi `20261119000000_diskon_polis`.
  - Menambah kolom `policies.discount_amount` (default 0).
  - Mengisi diskon polis dari slip berdiskon: premi × diskon slip (%), kecuali deklarasi. Di database lokal 1 polis terisi (CAR/2026/JTG/0019, diskon 49.987.500).
  - Setelah deploy, premi polis berdiskon di Policy Database, Dashboard, report, dan Renewal Notice turun sebesar diskonnya.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint: lolos, kecuali 1 warning lama di `components/claims/claims-view.tsx` (5 November, di luar branch ini).
- `npx tsx --test tests/*.test.ts`: 318 lolos, termasuk 8 test baru:
  - contoh MoM poin 19: Gross Premium 90.000.000, Nett Premium 70.000.000, loss ratio 45,56% dan 58,57%;
  - nilai klaim per status, serta isian form yang menggantikan klaim tersimpan;
  - angka sheet LCH 2019–2023: per tahun dan total, Net 26,42% dan Gross 19,82%;
  - diskon slip ke polis dan Ringkasan Penutupan, diskon per bagian PAR/EQVET, Premium_Discount minus per share.
- **Browser lokal** (SIT Admin):
  - **Detail klaim CLM/2026/08/0031.** Diuji dengan rantai renewal sementara 3 tahun:
    - 2024: polis uji dengan endorsement dan klaim Settled;
    - 2025: PAR/2025/JKT/0871 beserta END01;
    - 2026: renewal uji.
    - Hasil total Gross 59,66% dan Nett 68,33%. Per tahun: 38,25%/44,03%, 139,09%/158,96%, dan 0%. Semua cocok dengan hitungan manual.
  - **Form Edit klaim:** estimasi diganti 300.000.000, loss ratio langsung jadi 34,96% dan 40,04%. Tidak disimpan.
  - **Form klaim baru** dengan CAR/2026/JTG/0019: Gross Premium 949.762.500, brokerage 99.975.000 dari premi sebelum diskon, loss ratio 36,85% dan 41,19%.
  - **Tampilan lain:** Policy Database, isian Diskon di form polis, Ringkasan Penutupan slip 006/LCH-PLCMT/PS-CAR/X/2026, dan Report Operational.
  - Data uji dihapus, tautan renewal dikembalikan, dan sesi uji dihapus. Jumlah audit tetap 525.

## Catatan untuk yang melanjutkan

- `premiumIdr` sekarang Gross Premium. Untuk premi sebelum diskon, pakai `toIdr(p.premium, p.currency)`.
- Surat renewal notice ke klien ("Premi Periode Berjalan") masih mencetak premi sebelum diskon.
- Kalau Team LCH ingin loss ratio per klien atau per COB, cukup ganti pengelompokan di `lossRatioData`. Rumusnya tetap.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
