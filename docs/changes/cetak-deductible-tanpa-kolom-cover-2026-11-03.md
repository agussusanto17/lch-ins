# Cetak deductible tanpa kolom Cover

- **Tanggal:** 2026-11-03
- **Branch:** `fix/cetak-deductible-tanpa-kolom-cover`
- **PR:** #84
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Harry meminta kolom Cover di bagian `DEDUCTIBLE & CONDITIONS` tidak ikut
tercetak, cukup teks deductible-nya. Teks deductible dari Master Data sudah
menyebut perilnya sendiri, misalnya
`Flood, Windstorm, Tempes, Water Damage (FWTWD) : 10% of Claim`, jadi kolom
Cover membuat informasinya dobel. Kalau dropdown deductible salah pilih di
slip, kolom Cover juga terlihat bertentangan dengan teksnya.

Keputusan user:

- Format baru berlaku untuk keempat dokumen (Placing Slip, Quotation, Cover
  Note, Closing Instruction) supaya konsisten.
- Teks deductible yang tidak menyebut perilnya, misalnya baris BI
  `14 (fourteen) days waiting period`, dilengkapi di data slip atau Master Data
  (contoh: `Business Interruption : 14 (fourteen) days waiting period`). Sistem
  tidak menambahkan nama cover secara otomatis.

## Yang berubah

- `DeductibleBlock` mencetak daftar teks deductible tanpa tabel dan tanpa kolom
  Cover.
- Teks yang persis sama dari beberapa cover dicetak sekali.
- Form slip tidak berubah: deductible tetap diisi per cover. Special Conditions
  tetap tercetak di bawah daftar deductible.

## File utama

- `components/documents/doc-blocks.tsx`: `DeductibleBlock` dan import
  `coverLabel` yang tidak lagi dipakai di file ini.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada variabel baru.
- **Deploy:** standar.

## Verifikasi

- `npx tsc --noEmit`, ESLint untuk `doc-blocks.tsx`, dan `npm run build` lolos.
- Dev server lokal, akun admin, slip `001/LCH-PLCMT/PS/VIII/2026` yang punya
  tiga cover dengan deductible terisi dan dua teks yang sama: halaman print
  slip, quotation, cover note, dan closing menampilkan dua baris deductible
  tanpa tabel dan tanpa kolom Cover.

## Catatan untuk yang melanjutkan

- Sebelum dokumen dikirim ke klien, cek slip yang deductible-nya tidak menyebut
  peril (terutama BI). Tanpa kolom Cover, teks seperti itu kehilangan konteks.
