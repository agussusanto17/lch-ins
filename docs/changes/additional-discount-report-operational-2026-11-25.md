# Additional discount di Report Operational

- **Tanggal:** 2026-11-25
- **Branch:** `feat/additional-discount-report-operational`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 25 November 2026: "additional discount yang dari policy database keluarkan juga di report".

Sejak #319, additional discount polis (persen dari gross premium, beban LCH) sudah masuk report Excel: Rekap Produksi, Per Polis, Reserve Basis, dan Laporan MOM. Report Operational (menu Report) belum menampilkannya.

## Yang berubah

Report Operational menampilkan additional discount dalam IDR, dihitung dari persen polis × gross premium dengan kurs report:

- **Ringkasan Periode:** baris "Total Additional Discount (beban LCH)".
- **Tab Produksi Polis:** kolom Additional Discount di tabel per Class of Business dan per Insurer, termasuk export-nya.
- **Tab Polis:**
  - kolom Additional Discount di tabel; polis tanpa additional discount tampil "—";
  - export Excel/CSV mendapat kolom Additional Discount (%) dan Additional Discount (IDR).
- **Tidak berubah:** Gross Premium, Brokerage, Additional Fee, dan Pendapatan (Brokerage + Fee).

## File utama

- **Hitungan:** `lib/data/analytics.ts` (`additionalDiscountIdr`, kolom `additionalDiscount` di breakdown per COB dan per insurer).
- **Tampilan:** `components/reports/report-view.tsx`.
- **Tes:** `tests/additional-discount-polis.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 450 lolos.
  - Tes baru: USD 10.000 × 5% = 8.100.000 IDR.
  - Breakdown per COB menjumlah additional discount 5.000.000.
- **Browser lokal**, polis 022 diberi additional discount 5% sementara lalu dikembalikan:
  - Ringkasan: "Total Additional Discount (beban LCH) Rp 312.500";
  - per COB: Motor Vehicle Rp 312.500; per Insurer: Astra Buana Rp 312.500;
  - tab Polis: baris 022 Rp 312.500;
  - export Excel: kolom Additional Discount (%) 5% dan Additional Discount (IDR) 312.500.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Catatan terkait:** `additional-discount-polis-2026-11-25.md` (#319).
