# Kolom RATE dan PREMIUM CALCULATION dokumen Property dirapikan

- **Tanggal:** 2026-11-05
- **Branch:** `fix/rapikan-justify-dokumen-rate`
- **PR:** belum dibuat
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Lanjutan [rate-dokumen-per-mil-2026-11-05.md](rate-dokumen-per-mil-2026-11-05.md)
(PR #126). User minta bagian justify di dokumen itu diperbaiki dan tampilan
print out dirapikan (5 November 2026).

Masalahnya ada di perataan:

- **RATE** memakai `justify-between`: nama peril di kiri, rate didorong ke tepi
  kanan. Baris loss limit (`0,893000‰ × 85% = 0,759050‰`) lebih panjang, jadi
  titik duanya bergeser ke kiri dibanding baris lain (x=542 lawan x=674 di
  layar).
- **PREMIUM CALCULATION** mencetak rumus sebagai satu teks
  (`FLEXAS : IDR … x 0,893000‰ x 85% =`), jadi titik dua, nilai pertanggungan,
  rate, dan tanda `=` tidak sejajar antarbaris. Tabel PAR dan EQVET juga
  terpisah, sehingga lebar kolomnya berbeda.

## Yang berubah

- **RATE** menjadi tabel tiga kolom: nama peril, titik dua, rate. Semua titik
  dua dan rate sejajar, rate rata kiri. Nama peril yang panjang turun baris di
  kolomnya sendiri.
- **PREMIUM CALCULATION** menjadi tabel enam kolom: label, titik dua, nilai
  pertanggungan (rata kanan), rate dan loss limit, `=`, dan premi (rata
  kanan). PAR dan EQVET sekarang satu tabel, jadi kolomnya sejajar dari atas
  sampai bawah. Baris Premium, Discount, Policy Cost + Stamp Duty, dan Total
  tetap memakai kolom premi yang sama.
- Nilai, rumus, dan teks tidak berubah. Hanya perataan.

Berlaku di semua dokumen Property yang memakai blok rate PAR/EQVET: Placing
Slip, Quotation Slip, Cover Note, dan Closing Instruction.

## File utama

- `components/documents/doc-blocks.tsx`: `ParEqvetRateBlock`,
  `ParEqvetGroupSection` (sekarang `<tbody>`), dan `ParEqvetCalculationBlock`.

## Dampak

- Database: tidak ada migrasi.
- Env dan deploy: tidak ada perubahan.

## Cara verifikasi

1. Buka dokumen slip Property, misalnya `/underwriting/slip/<id>`, termasuk
   slip dengan loss limit pada FLEXAS.
2. Bagian RATE: semua titik dua berada di satu garis vertikal, termasuk baris
   loss limit.
3. Bagian PREMIUM CALCULATION: titik dua, nilai pertanggungan, rate, `=`, dan
   premi sejajar di semua baris PAR dan EQVET.
4. Ulangi di Quotation Slip, Cover Note, dan Closing Instruction, lalu
   Print / Save PDF. Pada lebar konten A4 (174 mm) tidak ada kolom yang
   terpotong dan setiap baris rumus tetap satu baris.

Hasil pengukuran DOM pada lebar konten A4, slip PAR + EQVET: posisi kolom
sama di keempat dokumen, nol sel overflow.

## Catatan untuk yang melanjutkan

- Lebar kolom PREMIUM CALCULATION otomatis mengikuti isi, tanpa lebar tetap.
  Yang diuji hanya nilai pertanggungan sampai ratusan miliar rupiah.
- Teks klausula dan paragraf lain di dokumen tidak diubah ke rata kiri-kanan
  (text-align justify).
