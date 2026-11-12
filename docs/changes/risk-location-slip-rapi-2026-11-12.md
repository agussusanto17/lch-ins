# Risk Location bernomor di dokumen slip dicetak lebih rapi

- **Tanggal:** 2026-11-12
- **Branch:** `fix/risk-location-slip-rapi`
- **PR:** #239
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

- Placing Slip D'BEST (Machinery Breakdown) menulis Risk Location sebagai
  daftar bernomor. Setiap butir berisi:
  - nama tertanggung;
  - nama lokasi (misalnya MALL PANAKKUKANG);
  - alamat.
- Sebelumnya hanya baris bernomor yang menjorok. Nama lokasi dan alamat
  kembali rata kiri di bawah nomor, dan butir-butirnya berdempetan. Akibatnya
  sulit melihat baris mana milik butir mana.
- User minta semua baris butir sejajar teks setelah nomor dan antar butir diberi
  jarak. Baris alamat ikut menjorok; ini pilihan user saat ditanya.

## Yang berubah

- Baris Risk Location di tabel detail dokumen slip:
  - semua baris tanpa nomor sesudah sebuah nomor (nama lokasi, alamat) ikut
    butir itu, sejajar teks setelah "1)";
  - antar butir ada jarak kosong.
- Berlaku untuk Placing Slip, Quotation Slip, Cover Note, dan Closing
  Instruction, karena keempatnya memakai tabel detail yang sama.
- Risk Location tanpa nomor (satu alamat biasa) tetap dicetak seperti dulu.
- Baris lain tidak berubah. Contohnya Insured Name, yang memang mencetak
  kalimat "and/or Associated…" rata kiri sesudah daftar.

## File utama

- `lib/document-format.ts`: `groupNumberedItems()` mengelompokkan baris per
  nomor butir.
- `components/documents/doc-blocks.tsx`:
  - komponen `NumberedItemsText`;
  - tipe `InfoRow` dengan opsi `numberedItems`;
  - baris Risk Location di `DetailTable` memakai opsi itu.
- `tests/documents.test.ts`: test `groupNumberedItems`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos. Test `groupNumberedItems` lolos.
- Cek E2E di browser lokal (mode cetak). Slip Engineering draft diisi
  sementara dengan teks Risk Location D'BEST, lalu dikembalikan.
  - Nomor "1)" dan "2)" di kiri. Nama perusahaan, nama lokasi, dan alamat
    sejajar satu garis di kanan nomor.
  - Jarak antar butir 12px.

## Catatan untuk yang melanjutkan

- Hanya butir bernomor angka (1) 1. (1)) yang memulai butir baru. Baris
  ber-bullet atau berhuruf (a.) di dalam butir tetap ikut butir itu dengan
  hanging indent sendiri.
- Lampiran DAFTAR LOKASI (slip Property multi lokasi) tidak berubah, karena
  alamat di sana dicetak per lokasi di kolom tabel.
- Tiga test lama di `tests/documents.test.ts` (margin 18mm) sudah gagal di
  `main` sejak PR #236 mengganti margin cetak menjadi `--print-x`. Perbaikannya
  di branch terpisah.
