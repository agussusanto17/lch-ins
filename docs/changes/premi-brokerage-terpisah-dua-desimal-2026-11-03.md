# Brokerage dipisah dari perhitungan premi, nominal premi 2 desimal

- **Tanggal:** 2026-11-03
- **Branch:** `fix/premi-brokerage-terpisah-dua-desimal`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

LCH meminta dua penyesuaian pada tabel `RATE & PREMIUM` di dokumen cetak:

- Brokerage tidak dijadikan satu dengan perhitungan premi. Sebelumnya baris
  `Brokerage x% (INCL./EXCL. VAT)` dan `Net Premium (after Brokerage)` ada di
  dalam tabel premi Placing Slip dan Closing Instruction, di antara Total
  Premium dan Discount.
- Perhitungan premi memakai 2 angka di belakang koma. Untuk IDR, nominal yang
  bulat sebelumnya dicetak tanpa sen (`IDR 5.200.000`).

Keputusan user:

- Brokerage dan Net Premium dicetak di blok `BROKERAGE` tersendiri di bawah
  Total Payable, bukan dihapus.
- Aturan 2 desimal berlaku untuk nominal saja. Rate tetap presisi penuh karena
  ada rate 3 desimal di data (misalnya 0,028‰). Kalau dibulatkan ke 2 desimal,
  premi yang tercetak tidak bisa dicek ulang dari rate-nya.

## Yang berubah

- Tabel premi di keempat dokumen (Placing Slip, Quotation, Cover Note, Closing
  Instruction) berhenti di Total Premium, lalu Discount, Admin Cost, Stamp
  Duty, dan Total Payable.
- Blok baru `BROKERAGE` di Placing Slip dan Closing Instruction berisi
  persentase brokerage dengan label VAT, nilai brokerage, dan Net Premium.
  Rumusnya tidak berubah: Net Premium = Total Premium − brokerage, dan untuk
  Motor Vehicle persentase yang dicetak tetap `brokeragePct - discountPct`.
  Quotation dan Cover Note tetap tanpa brokerage.
- Semua nominal di tabel premi, tabel payable, dan blok brokerage selalu
  dicetak 2 desimal, misalnya `IDR 5.200.000,00`.
- Rate dicetak minimal 2 dan maksimal 6 desimal tanpa nol berlebih:
  `2,080000` menjadi `2,08`, `0,028` tetap `0,028`.
- Discount dan Total Payable di dokumen memakai `discountAmount()` dan
  `totalPayable()` dari `lib/calc.ts`, jadi pembulatan sen sama dengan form.
- Sum insured dan limit TPL/PA tidak diubah, karena bukan bagian dari
  perhitungan premi.

## File utama

- `components/documents/doc-blocks.tsx`: `PremiumTable`, `PayableTable`,
  format rate, dan `BrokerageBlock` baru.
- `components/documents/slip-documents.tsx`: `brokerageRows` diganti
  `BrokerageBlock` di Placing Slip dan Closing Instruction.
- `lib/format.ts`: `moneyCents()` dan argumen desimal maksimum di `num()`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada variabel baru.
- **Deploy:** standar.

## Verifikasi

- `npx tsc --noEmit`, ESLint untuk file yang diubah, dan `npm run build`
  lolos.
- E2E dengan ego-browser di dev server lokal, akun admin, 12 halaman cetak (3
  slip × 4 dokumen):
  - Slip MV `001/LCH-PLCMT/PS/VIII/2026` (brokerage 10%, diskon 15%): blok
    Brokerage tercetak `0,00%`, Net Premium IDR 8.095.000,00.
  - Slip MV draft (brokerage 25%, diskon 15%): Brokerage 10,00% IDR
    400.000,00, Net Premium IDR 3.600.000,00.
  - Slip Property `002/LCH-PLCMT/PS-PAREQ/VIII/2026` (brokerage 12,5%, incl.
    VAT): rate 0,028, 0,035, 0,412, dan seterusnya tercetak utuh. Brokerage
    IDR 83.219.875,00, Net Premium IDR 582.539.125,00.
  - Di semua halaman tidak ada baris Brokerage atau Net Premium di tabel premi,
    dan semua nominal berakhir dengan 2 desimal. Blok Brokerage hanya muncul
    di Placing Slip dan Closing Instruction.

## Catatan untuk yang melanjutkan

- Form slip tidak berubah. Ringkasan premi di form masih memakai `money()`
  yang menyembunyikan sen untuk nominal IDR bulat. Kalau LCH ingin form ikut
  2 desimal, ganti dengan `moneyCents()`.
