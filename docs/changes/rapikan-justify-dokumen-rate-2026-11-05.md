# Kolom RATE dan PREMIUM CALCULATION dokumen Property dirapikan

- **Tanggal:** 2026-11-05
- **Branch:** `fix/rapikan-justify-dokumen-rate`
- **PR:** [#130](https://github.com/agussusanto17/lch-ins/pull/130)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Lanjutan [rate-dokumen-per-mil-2026-11-05.md](rate-dokumen-per-mil-2026-11-05.md)
(PR #126). User minta bagian justify di dokumen itu diperbaiki dan tampilan
print out dirapikan (5 November 2026). Contoh yang diminta: titik dua, `=`,
`IDR`, dan nilai premi lurus satu garis di setiap baris.

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
- **PREMIUM CALCULATION** menjadi tabel sembilan kolom: label, titik dua,
  `IDR`, nilai pertanggungan (rata kanan), rate dan loss limit, `=`, `IDR`,
  premi (rata kanan), dan tanda `+`/`-`. Kode mata uang dipisah dari angka
  supaya `IDR` lurus dan angkanya rata kanan. Tanda `+`/`-` punya kolom
  sendiri sehingga tidak menggeser angka, dan kurung tutup Discount
  menggantung di luar kolom angka.
- PAR, EQVET, dan GRAND TOTAL sekarang satu tabel, jadi kolomnya sejajar dari
  atas sampai bawah, termasuk baris Premium, Discount, Premium after discount,
  Policy Cost + Stamp Duty, dan Total.
- Nilai, rumus, dan teks tidak berubah. Hanya perataan.

Berlaku di semua dokumen Property yang memakai blok rate PAR/EQVET: Placing
Slip, Quotation Slip, Cover Note, dan Closing Instruction.

## File utama

- `components/documents/doc-blocks.tsx`: `ParEqvetRateBlock`,
  `ParEqvetGroupSection` (sekarang `<tbody>`), `ParEqvetCalculationBlock`, serta
  komponen baru `AmountCells` dan `SummaryRow`.

## Dampak

- Database: tidak ada migrasi.
- Env dan deploy: tidak ada perubahan.

## Cara verifikasi

1. Buka dokumen slip Property, misalnya `/underwriting/slip/<id>`, termasuk
   slip dengan loss limit pada FLEXAS.
2. Bagian RATE: semua titik dua berada di satu garis vertikal, termasuk baris
   loss limit.
3. Bagian PREMIUM CALCULATION: titik dua, `IDR`, ujung kanan nilai
   pertanggungan, `=`, `IDR` premi, ujung kanan premi, dan tanda `+`/`-`
   sejajar di semua baris PAR, EQVET, dan GRAND TOTAL.
4. Ulangi di Quotation Slip, Cover Note, dan Closing Instruction, lalu
   Print / Save PDF. Pada lebar konten A4 (174 mm) tidak ada kolom yang
   terpotong dan setiap baris rumus tetap satu baris.

Hasil pengukuran DOM di lebar layar dan lebar konten A4, pada slip Property
dengan loss limit dan slip PAR + EQVET dengan discount: posisi `=`, `IDR`, dan
ujung kanan angka sama di setiap baris, dan tabel tidak melebihi lebar konten.

## Catatan untuk yang melanjutkan

- Lebar kolom PREMIUM CALCULATION otomatis mengikuti isi, tanpa lebar tetap.
  Yang diuji hanya nilai pertanggungan sampai ratusan miliar rupiah.
- Teks klausula dan paragraf lain di dokumen tidak diubah ke rata kiri-kanan
  (text-align justify).
