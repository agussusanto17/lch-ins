# Additional discount Quotation dihitung dari gross premium

- **Tanggal:** 2026-11-25
- **Branch:** `fix/additional-discount-dari-gross`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 25 November 2026, dengan screenshot isian Additional Discount (%) di Quotation: "ini tolong dihitung dari gross premi sebelum dipotong diskon ya".

Sejak MoM review Phase 1 poin 7 (#275), additional discount dihitung dari premi setelah discount utama. Batasnya dibuka sampai 100% di #305.

## Yang berubah

- **Dasar hitung:** additional discount = persen × gross premium, yaitu premi sebelum discount. Contoh slip 003 lokal: gross 8.095.000 dengan discount 15%, additional discount 5% sekarang 404.750; sebelumnya 344.037,50 dari premi setelah discount.
- **Slip PAR + EQVET:** dasarnya gross premium tiap kelompok, sama seperti discount utama.
- **Berlaku di:**
  - Total Payable internal LCH di form Quotation;
  - tiga bentuk cetakan Quotation Slip Internal: tabel biasa, kelompok PAR + EQVET, dan ringkasan;
  - keterangan isian ("Dihitung dari gross premium, sebelum discount").
- **Batas baru:** discount + additional discount maksimal 100% dari gross premium, supaya premi tidak negatif. Sebelumnya batas 100% cukup karena dasarnya premi setelah discount. Discount 15% menyisakan 85%.
  - Isian ditandai merah dengan pesan "… sisa 85,00%".
  - Simpan slip ditolak dengan pesan yang sama.
- **Tidak berubah:** Closing Instruction, polis, dan report, karena semuanya memakai discount utama saja.

## File utama

- **Hitungan:** `lib/calc.ts` (`additionalDiscountFor`, `internalTotalPayable`, `maxAdditionalDiscountPct`).
- **Cetakan:** `components/documents/doc-blocks.tsx`.
- **Form:** `components/underwriting/placing-slip-form.tsx`.
- **Tipe:** `lib/data/types.ts` (keterangan `additionalDiscountPct`).
- **Tes:** `tests/additional-discount.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Angka:** slip yang sudah punya additional discount akan menampilkan nominal yang lebih besar di cetakan Quotation Internal, karena dasarnya sekarang gross premium. Persennya tidak berubah.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 444 lolos.
  - Slip biasa: 10.000.000 − 1.000.000 − 500.000 + 60.000 = 8.560.000.
  - PAR + EQVET: 16.849.400 + 5.150.000.
  - Batas: 100 / 90 / 0 untuk discount 0 / 10 / 100, dan discount 10% + additional 90% menyisakan biaya polis 60.000.
- **Browser lokal**, slip 003 di Quotation tanpa disimpan:
  - additional 5% → IDR 404.750, Total Payable internal IDR 6.521.000;
  - additional 90% → isian merah dengan pesan "Discount + additional discount maksimal 100% dari gross premium; sisa 85,00%.";
  - data slip tidak berubah.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.

## Catatan untuk yang melanjutkan

- **Server** tetap menerima additional discount 0–100% per isian. Batas gabungan dengan discount diperiksa di form.
