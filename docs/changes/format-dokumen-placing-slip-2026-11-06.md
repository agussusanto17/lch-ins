# Format dokumen Placing Slip: logo, isian user, footer

- **Tanggal:** 2026-11-06
- **Branch:** `fix/format-dokumen-placing-slip`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Review DRAFT Placing Slip menemukan tiga hal:

1. Logo di kop bergeser ke kanan dari kolom teks dokumen. File
   `public/images/logo-lch.jpg` punya ruang putih di kiri (4,2% lebar gambar),
   jadi tinta logo mulai ±12pt di kanan label seperti "Type of Cover".
2. Hasil cetak tidak mengikuti isian user. Insured Name selalu dijadikan huruf
   kapital. Baris alamat Risk(s) Location digabung jadi satu baris dengan koma,
   jadi teks seperti "PT. MARGAMAS INDAH DEVELOPMENT :\nJl. Taman..." tercetak
   ":, Jl. Taman...".
3. Footer tidak muncul di semua halaman.

## Yang berubah

- Logo dokumen (`LchLogo`) diberi margin kiri negatif 16px, sehingga tinta logo
  sejajar dengan kolom teks. Ini berlaku di kop cetak, kop layar, dan form KYC.
- Insured Name dicetak persis seperti diketik, tanpa dijadikan kapital.
  Uraian tertanggung tetap di bawahnya.
- Risk Location (satu lokasi) dan Risk(s) Location (banyak lokasi) dicetak per
  baris seperti isian user. Spasi tepi dan baris kosong dibuang. Untuk banyak
  lokasi, "Sum Insured: ..." pindah ke baris sendiri di bawah alamat.
- Footer: di Chrome, Edge, dan Firefox header dan footer sudah berulang di
  setiap halaman (dicek pada PDF 6 halaman). Safari (WebKit) mencetak elemen
  `position: fixed` hanya sekali dan tidak mengulang `thead`/`tfoot`, jadi
  footer hanya muncul di halaman terakhir. Di Safari, toolbar dokumen sekarang
  menampilkan peringatan supaya user mencetak lewat Chrome atau Edge.

## File utama

- `components/documents/letterhead.tsx`: offset logo.
- `components/documents/doc-blocks.tsx`: Insured Name tanpa kapital, alamat
  lokasi per baris.
- `lib/slip-locations.ts`: helper `addressLines` (dites di
  `tests/slip-locations.test.ts`).
- `lib/print-support.ts`: deteksi browser yang tidak mengulang header/footer
  cetak (dites di `tests/print-support.test.ts`).
- `components/documents/document-shell.tsx`: peringatan Safari di toolbar.
- `components/underwriting/insured-picker.tsx`: komentar disesuaikan.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

Semua dokumen yang memakai `DetailTable` ikut berubah: Placing Slip,
Quotation Slip, Cover Note, dan Closing Instruction. Slip lama dengan nama
tertanggung yang diketik huruf kecil sekarang tercetak huruf kecil juga.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: semua lolos, termasuk 4 tes baru.
- `npx tsc --noEmit` dan `npm run build` lolos.
- Slip Property draft di DB lokal diisi 3 lokasi dengan alamat bertitik dua dan
  multi baris, lalu dicetak ke PDF lewat Chrome:
  - tinta logo mulai di x≈51pt, sejajar label (51pt);
  - footer navy ada di keenam halaman, dan teks isi berhenti di atas footer;
  - Risk(s) Location tercetak per baris, dengan Sum Insured di baris sendiri.
  
  Data lokal dikembalikan setelah dicek.
- WebKit dicek dengan WKWebView: elemen fixed hanya tercetak sekali, `@page`
  margin box (`@bottom-center`) tidak didukung, dan `thead`/`tfoot` tidak
  berulang.

## Catatan untuk yang melanjutkan

- `-ml-4` di `LchLogo` terikat pada tinggi `h-14` yang dipakai semua dokumen.
  Kalau tinggi logo diubah, offset ikut berubah (4,2% dari lebar tampil).
- Supaya footer juga berulang di Safari, perlu paginasi JS sendiri: memecah isi
  ke kontainer A4 per halaman sebelum cetak. Cara ini dipertimbangkan tapi
  belum dibuat karena besar dan berisiko memecah tabel. paged.js dukungannya
  di Safari kurang, dan PDF dari server terlalu berat untuk kebutuhan ini.
- Nomor daftar Risk(s) Location (x=206pt) sedikit di kanan nilai baris lain
  (202,5pt) karena `list-decimal pl-5`. Ini dibiarkan.
