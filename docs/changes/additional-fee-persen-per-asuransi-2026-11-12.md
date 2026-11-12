# Additional fee menjadi persen per asuransi, diisi saat closing

- **Tanggal:** 2026-11-12
- **Branch:** `feat/additional-fee-persen-per-asuransi`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Additional fee (#213) diisi sebagai nominal di bagian premi slip, lalu disalin ke polis. Pada 12 November 2026 Harry meluruskan tiga hal, sambil melampirkan form Policy DB polis Manesh yang menampilkan "Additional Fee 15 · IDR 15":

1. "Ini 15% bro, bukan Rp 15." Additional fee adalah persen.
2. "Additional fee diisi pas closing aja, buat per masing-masing asuransi jika co-asuransi. Jika 100% ya 1 asuransi."
3. "Additional fee di Policy Database ngikut dari inputan placing slip yang masuk ke polis database, jadi otomatis include atau exclude VAT, brokerage juga, tapi ada nominal rupiah juga."

## Yang berubah

- **Slip, bagian premi:** isian nominal Additional Fee dihapus, diganti catatan bahwa fee diisi di panel Security saat closing.
- **Slip, panel Security (Panel Asuransi) di form closing**, atau saat slip sudah Closed, untuk COB yang memakai additional fee (Property dan Motor Vehicle):
  - kolom **Additional Fee (%)** per asuransi, dengan nominal per asuransi di bawahnya (premi × share × fee %);
  - saklar **Additional fee include VAT (PPN 2,2%)** pindah ke sini;
  - ringkasan total additional fee, PPN yang termasuk, dan fee sebelum PPN.

  Form quotation tidak menampilkan kolom fee.
- **Polis:**
  - menyimpan fee % per asuransi (`policy_insurers.additional_fee_pct`) serta status PPN brokerage (`include_vat`) dan additional fee (`additional_fee_include_vat`). Ketiganya disalin dari slip saat polis dicatat dari CI, saat polis dihubungkan ke slip, dan saat slip direvisi selama nomor polis masih sementara;
  - nominal `additional_fee` dihitung server: premi × fee (%) tertimbang share. Nominal ikut berubah bersama premi, dan negatif untuk pembatalan atau pengurangan premi;
  - setiap polis PAR + EQVET kena fee dari preminya sendiri. Sebelumnya seluruh nominal fee ikut polis PAR;
  - record endorsement atau cancellation dari slip, maupun dari form Policy Database, mendapat fee = premi endorsement × fee (%) polis induk. Sebelumnya 0.
- **Form Policy Database:**
  - **Brokerage (%)** dengan nominal Rupiah dan saklar include VAT;
  - **Additional Fee (%)** untuk polis satu asuransi, dengan nominal dan saklar include VAT. Polis co-insurance menampilkan nominal total, dan fee % per asuransi tampil di daftar co-insurance;
  - polis dari slip mengunci isian ini, karena nilainya mengikuti slip;
  - renewal dan endorsement dari polis induk menyalin persen dan status PPN-nya.
- **Export Policy Database:** kolom Brokerage incl. VAT, Additional Fee (%), Additional Fee (nominal), dan Fee incl. VAT.
- **Report Operational** tetap memakai nominal fee polis, jadi otomatis mengikuti perhitungan baru.

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261112140000_additional_fee_persen/migration.sql`
- `lib/calc.ts`: `weightedFeePct`, `additionalFeeFor`, `insurerAdditionalFee`, `additionalFeeAmount`, `feeVatInside`.
- `lib/data/types.ts`: `SecurityPanelRow.additionalFeePct`, `Policy.includeVat`, `Policy.additionalFeePct`, `Policy.additionalFeeIncludeVat`. `PlacingSlip.additionalFee` dihapus.
- `lib/policy-from-slip.ts`, `lib/server/placing-slips.ts`, `lib/server/policies.ts`, `lib/server/auto-policies.ts`
- `app/(app)/placement/actions.ts`, `app/(app)/policies/actions.ts`
- `components/underwriting/placing-slip-form.tsx`, `components/policies/policy-form.tsx`, `components/policies/policy-database.tsx`, `components/audit/audit-fields.ts`
- `tests/slip-revision-policy.test.ts`

## Dampak

- **Database:** migrasi `20261112140000_additional_fee_persen`.
  - **Skema:** kolom `slip_security_panel.additional_fee_pct`, `policy_insurers.additional_fee_pct`, `policies.include_vat`, dan `policies.additional_fee_include_vat`.
  - **Konversi data lama:**
    - fee slip 0 < x ≤ 100 menjadi persen untuk semua asuransi di panelnya;
    - fee polis 0 < x ≤ 100 menjadi persen per asuransi, dan nominalnya dihitung ulang (premi × persen);
    - fee polis lain (di atas 100, atau negatif) tetap nominalnya, dan persennya diturunkan dari premi;
    - status PPN polis disalin dari slipnya.

    Di demo, polis renewal Manesh (fee 15 dari #228) menjadi 15% × premi 8.845.000 = 1.326.750.
  - Kolom `placing_slips.additional_fee` tidak dipakai lagi; isinya dibiarkan sebagai isian lama.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build, di demo dan VPS.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint app components lib tests next.config.ts --quiet`, `npx tsx --test tests/*.test.ts` (211 tes), dan `npm run build`: lolos.
- **Migrasi diuji di DB lokal** di dalam transaksi yang di-rollback:
  - slip fee 15 → panel 15%;
  - polis fee 15 (premi 600.000) → 15%, nominal 90.000, status PPN ikut slip;
  - polis fee 500.000 (premi ±1 M) → nominal tetap, persen 0,050013%;
  - pembatalan fee −30.000 (premi −200.000) → 15%, nominal tetap −30.000.
- **Uji browser ujung ke ujung** (Playwright, worktree port 3001), dengan slip MV uji co-insurance Astra Buana 60% dan Sinar Mas 40%, premi 7.862.500, brokerage 15% include VAT. 14 cek lolos, tanpa error console:
  1. Form slip baru tidak punya isian fee nominal, dan form quotation tidak menampilkan kolom fee.
  2. Form closing: fee 12,5% dan 10% → per asuransi IDR 589.687,50 dan IDR 314.500, total IDR 904.187,50; PPN 2,2% IDR 19.463,92; sebelum PPN IDR 884.723,58.
  3. CI terbit → polis tercatat dengan fee 904.187,50, persen per asuransi 12,5% dan 10%, serta PPN brokerage dan fee = ya.
  4. Drawer Edit polis:
     - Brokerage "IDR 1.179.375 · termasuk PPN 2,2% IDR 25.387,72";
     - daftar co-insurance dengan fee per asuransi;
     - Additional Fee "IDR 904.187,50 · termasuk PPN 2,2% IDR 19.463,92";
     - kedua saklar menyala dan terkunci.
  5. Report Operational: Total Additional Fee Rp 904.188.
  6. Endorsement slip (UP 525 jt → 560 jt) ditutup → record endorsement premi 492.205,48 dengan fee 56.603,63 (11,5% tertimbang).
  7. Data uji dihapus per id, dan counter PS kembali ke 17.

## Catatan untuk yang melanjutkan

- **Brokerage di report masih nominal kotor** (premi × persen, termasuk PPN bila include VAT), sama seperti sebelumnya. Kalau LCH ingin pendapatan sebelum PPN, statusnya sudah tersimpan di polis.
- **Produksi per Insurer** di Report Operational masih mengelompokkan per asuransi leader. Pemecahan per asuransi co-insurance, sesuai format rekap LCH (kolom `asuransi`), dikerjakan bersama rekap produksi.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
