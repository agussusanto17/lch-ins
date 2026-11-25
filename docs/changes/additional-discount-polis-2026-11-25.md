# Additional discount Quotation di Policy Database dan report

- **Tanggal:** 2026-11-25
- **Branch:** `feat/additional-discount-polis`
- **PR:** #319
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 25 November 2026, dengan screenshot Edit Polis: "additional discount belum ada di policy database".

Sejak MoM review Phase 1 poin 7 (#275), additional discount hanya dipakai di Quotation Slip Internal LCH. Closing Instruction ke asuransi, polis, dan report memakai discount utama saja.

Karena itu diskon tambahan ini tidak ditanggung asuransi, melainkan oleh LCH. Template report Team LCH sudah punya kolom beban untuk ini, dan selama ini kolomnya kosong:

- Per Polis di Rekap Produksi: "MARKETING-DISCOUNT BEBAN LCH";
- Reserve Basis dan Laporan MOM: "MARKETING EXP-DISCOUNT".

## Yang berubah

- **Polis menyimpan Additional Discount (%)**, dihitung dari gross premium seperti slip (#318):
  - ikut dari slip saat polis dicatat dari CI, dan saat slip direvisi setelah CI terbit;
  - hanya polis Baru dan Renewal;
  - polis induk MOP (open cover) tidak memakainya.
- **Form polis (Policy Database):**
  - isian Additional Discount (%) di bawah Diskon, dengan nominalnya, misalnya "IDR 312.500 dari Gross Premium";
  - polis dari slip mengunci isian ini seperti Premium dan Diskon;
  - Nett Premium ke asuransi tidak berubah.
- **Export Policy Database:** kolom Additional Discount (%) dan Additional Discount (nominal).
- **Report (beban LCH, ditulis positif):**
  - **Rekap Produksi:** baris EXPENSE dengan sub akun pnl "MARKETING-DISCOUNT BEBAN LCH" per asuransi sesuai share. Percentage-nya persen additional discount.
  - **Per Polis:** kolom MARKETING-DISCOUNT BEBAN LCH_OC/IDR terisi dan ikut total (Income)/Beban.
  - **Reserve Basis:** kolom MARKETING EXP-DISCOUNT (K) terisi. TOTAL expenses, RESERVE, ROUNDING, dan TOTAL BEBAN + RESERVE ikut menghitungnya.
  - **Laporan MOM:** kolom h (MARKETING EXP-DISCOUNT) LCH Indonesia terisi, sehingga NET dan tabel comparative ikut turun.
  - Teks keterangan di ketiga report diperbarui.
- **Tidak berubah:** premi, diskon, brokerage, net ke asuransi, Produksi OJK, dan Loss Ratio.
- **Migrasi `20261125120000_additional_discount_polis`:**
  - menambah kolom `policies.additional_discount_pct` (default 0);
  - polis Baru/Renewal dari slip bukan open cover yang sudah punya additional discount ikut persennya.

## Asumsi

- **Additional discount dicatat sebagai beban LCH** ("MARKETING-DISCOUNT BEBAN LCH" / "MARKETING EXP-DISCOUNT"), bukan cashback, karena asuransi tidak menerimanya di Closing Instruction.

## File utama

- **Data:**
  - `prisma/schema.prisma` dan migrasinya;
  - `lib/data/types.ts`;
  - `lib/policy-from-slip.ts`;
  - `lib/server/policies.ts`;
  - `app/(app)/policies/actions.ts`.
- **Tampilan:** `components/policies/policy-form.tsx` dan `components/policies/policy-database.tsx`.
- **Report:**
  - `lib/production-recap.ts` (`MARKETING_DISCOUNT`) dan `lib/server/production-recap.ts`;
  - `lib/reserve-basis.ts` (`reserveFigures`);
  - `lib/mom-report.ts`.
- **Tes:** `tests/additional-discount-polis.test.ts` (baru), `tests/policy-from-slip.test.ts`, `tests/mom-report.test.ts`, dan `tests/reserve-basis.test.ts`.

## Dampak

- **Database:** satu migrasi (kolom baru plus isian dari slip).
- **Env:** tidak ada.
- **Deploy:** migrasi jalan otomatis saat build.
- **Angka:**
  - polis yang slipnya punya additional discount sekarang menampilkan beban MARKETING-DISCOUNT di Rekap Produksi dan Per Polis;
  - NET di Laporan MOM dan reserve di Reserve Basis ikut menghitung beban itu.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 449 lolos. Tes baru mencakup:
  - polis dari slip membawa persennya, dan open cover 0;
  - Rekap: baris EXPENSE 3.000.000 dan 2.000.000 untuk share 60/40 dari premi 100.000.000 dengan additional 5%, sedangkan baris COMM tidak berubah;
  - Per Polis: kolom terisi dan ikut total;
  - Reserve Basis: K9 5.000.000, reserve −1.000.000, TOTAL BEBAN + RESERVE −6.000.000, persentase 40%;
  - Laporan MOM: h Agustus 5.000.000 dan NET 10.000.000.
- **Migrasi lokal:** jalan.
- **Browser lokal**, polis 022 diberi additional discount 5% sementara lalu dikembalikan:
  - form Edit Polis menampilkan "Additional Discount (%) 5" dengan keterangan "IDR 312.500 dari Gross Premium. Ditanggung LCH, tidak mengurangi Nett Premium ke asuransi.";
  - isiannya terkunci karena polis dari slip, dan Nett Premium tetap 5.291.875;
  - Rekap Produksi November: baris COMM −937.500 dan EXPENSE MARKETING-DISCOUNT BEBAN LCH 312.500 (5%);
  - Per Polis: kolom 312.500, total −625.000.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Kolom MARKETING EXP-COMM (I) di Reserve Basis masih kosong,** padahal Laporan MOM sudah mengisi COMM EXPENSES dari sharing komisi LCH Singapore. Bisa diisi dengan cara yang sama kalau Team LCH mau.
- **Catatan terkait:**
  - `additional-discount-quotation-2026-11-18.md` (#275);
  - `additional-discount-dari-gross-2026-11-25.md` (#318);
  - `laporan-mom-2026-11-23.md` (#314).
