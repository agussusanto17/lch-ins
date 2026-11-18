# Additional discount di Quotation dan Quotation Slip Internal LCH

- **Tanggal:** 2026-11-18
- **Branch:** `feat/additional-discount-quotation`
- **PR:** #275
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (17 November 2026), poin 7: Quotation punya isian additional discount sampai 15%.
- Cetak Quotation menjadi dua:
  - format sekarang;
  - format internal LCH, dengan additional discount di PREMIUM CALCULATION.
- Ketentuan di MoM:
  - additional discount dihitung dari premi setelah discount utama;
  - hanya dipakai di cetakan internal;
  - premi di Closing Instruction, polis, dan report tetap memakai discount utama.

## Yang berubah

- **Isian Additional Discount (%)** di panel premi tahap Quotation dan Closing, di bawah Total Payable.
  - Maksimal 15%.
  - Bila diisi, form menampilkan nominal additional discount dan Total Payable internal LCH. Total Payable resmi tidak berubah.
  - Nilai di atas 15% ditandai merah dan slip tidak bisa disimpan. Ditolak juga di server lewat skema action.
- **Tombol Quotation Internal** di samping Quotation Slip (tahap Quotation dan Closing) membuka cetakan baru `/placement/quotation/[id]/internal`.
- **Isi cetakan Quotation Slip Internal LCH** sama dengan Quotation Slip, judulnya QUOTATION SLIP — INTERNAL LCH. PREMIUM CALCULATION memuat:
  - **Slip PAR + EQVET:** per kelompok PAR dan EQVET, berisi Premium, Discount, Premium after discount, Additional Discount, Premium after additional discount, Policy Cost + Stamp Duty, dan Total Premium. Grand Total ikut turun.
  - **Slip lain:** tabel Total Payable berisi Discount, Premium after discount, Additional Discount, Premium after additional discount, biaya, dan Total Payable.
  - **Multi lokasi dan multi kendaraan:** baris Additional Discount di jadwal premi lampiran, dan total di badan dokumen.
- **Quotation Slip biasa**, Placing Slip, Closing Instruction, Cover Note, polis, dan report tidak berubah.
- **Kolom baru:** `placing_slips.additional_discount_pct`. Ikut disalin bersama isian slip lain dan tercatat di audit trail ("Additional discount Quotation (%)").

## File utama

- `lib/calc.ts`: `additionalDiscountFor`, `internalTotalPayable`, `MAX_ADDITIONAL_DISCOUNT_PCT`.
- `components/documents/doc-blocks.tsx`: prop `internal` di blok premi. Lewat prop, bukan context, karena beberapa dokumen adalah server component.
- `components/documents/slip-documents.tsx` (`QuotationSlipDocument internal`), `app/(print)/placement/quotation/[id]/internal/page.tsx`.
- `components/underwriting/placing-slip-form.tsx`: isian dan tombol.
- `lib/server/placing-slips.ts`, `app/(app)/placement/actions.ts`, `lib/slip-audit.ts`.
- `prisma/migrations/20261118220000_additional_discount_quotation/migration.sql`.
- `tests/additional-discount.test.ts`.

## Dampak

- **Database:** migrasi `20261118220000_additional_discount_quotation` menambah `placing_slips.additional_discount_pct` (numeric 12,6; default 0). Slip lama 0.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: lolos, termasuk 3 test baru: hitungan per kelompok PAR dan EQVET, slip biasa, dan additional discount 0.
- **Browser lokal** (SIT Admin). Additional discount 5% diisi lewat database untuk tiga slip lalu dikembalikan ke 0; audit trail dan `updated_at` tidak berubah.
  - **004/PS-PAREQ** (discount 7,5%):
    - PAR 373.094.000 → setelah discount 345.111.950 → additional (17.255.597,50) → 327.856.352,50 + 270.000;
    - EQVET → 257.449.368,75;
    - Grand Total internal 585.575.721,25;
    - Quotation Slip biasa tetap tanpa additional discount, Grand Total 616.367.075.
  - **010/PS-PAR** (2 lokasi): lampiran memuat Additional Discount 5% (540.000), dan Grand Total 10.260.000 di badan dokumen dan lampiran.
  - **006/PS-CAR:** Total Premium 999.750.000, Discount 5%, Additional Discount 5% (47.488.125), Total Payable 902.794.375.
  - **Form Quotation 003/PS:**
    - isian 5% menampilkan Additional Discount (IDR 344.037,50) dan Total Payable internal IDR 6.581.712,50;
    - isian 20% ditandai merah, dan simpan ditolak dengan pesan maksimal 15%.

## Catatan untuk yang melanjutkan

- **Additional discount tidak ikut batas OJK** brokerage + diskon, karena tidak dipakai di CI, polis, dan report.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
