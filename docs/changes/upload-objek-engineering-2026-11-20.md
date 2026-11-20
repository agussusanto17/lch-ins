# Upload objek slip Engineering dari Excel

- **Tanggal:** 2026-11-20
- **Branch:** `feat/upload-objek-engineering`
- **PR:** #293
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Contoh slip Harry no. 31: Equipment All Risks (CPM) PT Habco Primatama, dengan GI Schedule berisi 22 unit alat berat dan rate per unit. Sebelumnya objek slip Engineering hanya bisa diketik satu per satu. Kendaraan Motor Vehicle sudah punya upload Excel (PR #282), Engineering belum.

Agus, 20 November 2026: "iya buatkan upload objek excel untuk engineering".

## Yang berubah

- **Form placing slip Engineering:** di bagian Interest Insured ada tombol Upload Excel. Drawer-nya mengikuti upload kendaraan:
  - template Excel, pilih file, ringkasan hasil baca (dibaca, siap, gagal, dilewati), kesalahan per baris, dan pratinjau nilai, rate, serta premi per objek;
  - pilihan "Ganti semua objek yang ada", atau tambahkan di akhir daftar;
  - file dengan beberapa sheet bisa dipilih sheet-nya. Jadwal unit LCH, misalnya, punya satu sheet per quotation.
- **Kolom:** Merek, Tipe / Model, No. Seri, Tahun, Uraian Lain, Nilai Pertanggungan, Rate (%) per cover objek pertama, dan Premi (otomatis).
  - Uraian tercetak disusun dari kolom-kolom itu, misalnya `KOMATSU WHEEL LOADER WA 200, S/N 30926, Year 1998`, lalu Uraian Lain di baris baru.
- **Jadwal unit LCH bisa langsung diupload.** Kolom BRAND, TYPE, SERIAL NO., YEAR (M), SUM INSURED, dan RATE dikenali.
  - **Sel berformat persen** dibaca sebagai persen. Di GI Schedule tertulis 1,10% tetapi tersimpan 0,011; tanpa ini rate jadi 100 kali lebih kecil.
  - **Tahun "1996, RECON 2018":** dibaca tahun 1996, keterangannya ikut dicetak.
  - **Baris total** di akhir jadwal dilewati.
- **No. Seri tidak boleh kembar.** Objek yang nomor serinya sudah ada di slip dilewati, jadi file yang sama bisa diupload ulang setelah barisnya diperbaiki.
- **Peringatan rate kecil:** muncul bila rate di bawah 0,05%, karena kemungkinan diisi pecahan (0,011) dan bukan persen.
- **Cover dan deductible objek baru** mengikuti objek pertama, sama seperti objek yang ditambah di form.
- **Slip ber-section (CAR/EAR):** objek masuk ke Section 1, dan limit Section 2 tidak berubah. Saat objek diganti, deductible Section 1 pindah ke objek baru pertama.
- **Slip lain tidak berubah:** upload hanya untuk COB Engineering (`supportsObjectUpload`).

## File utama

- `lib/object-import.ts` (baru): kolom, pembacaan baris, template, sel persen, nomor seri.
- `components/underwriting/object-upload.tsx` (baru): drawer upload.
- `components/underwriting/slip-model.ts`: `objectRateLabels`, `isBlankObjectGroup`, `importReplacesObjects`, `importObjectsPatch`.
- `lib/slip-items.ts`: `supportsObjectUpload`.
- `components/underwriting/placing-slip-form.tsx`: tombol dan drawer.
- `tests/object-import.test.ts` (baru).

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 364 lolos, 10 test baru. Cakupannya:
  - jadwal unit dengan sel persen, tahun RECON, dan baris total;
  - kesalahan per baris dan peringatan rate kecil;
  - objek yang sudah ada dilewati;
  - objek awal yang kosong diganti, cover dan deductible mengikuti objek pertama;
  - slip ber-section;
  - template yang dibaca ulang.
- **GI Schedule asli Habco:**
  - sheet 2023 (1): 22 objek, TSI 19.850.000.000, premi 138.215.000, sama dengan jadwal;
  - sheet 2023 (2): 6 objek, TSI 10.615.440.000, premi 66.877.272.
- **Browser lokal**, slip baru Engineering, tanpa disimpan:
  - tombol Upload Excel muncul;
  - GI Schedule terbaca 22 objek dan pilihan sheet berpindah ke 6 objek;
  - setelah Tambahkan, form berisi 22 objek, Total Interest Insured IDR 19.850.000.000, Total Premium IDR 138.215.000;
  - upload ulang file yang sama melewati 22 objek, dan mode ganti menyiapkan 22 objek pengganti.
- Sesi uji dan file sementara dihapus sesudahnya.

## Catatan untuk yang melanjutkan

- **COB lain** yang memakai rate per objek (Liability, Miscellaneous, Marine Cargo, General Accident) cukup ditambahkan di `supportsObjectUpload`. Uraian kolomnya mungkin perlu disesuaikan per COB.
- **Premi flat dan limit saja** belum dibaca dari file. Objek hasil upload memakai rate; dasar Flat atau Limit saja diubah di form.
- **Salinan template** untuk LCH ada di `documents/Template Upload Objek Engineering LCH.xlsx`. Template dari tombol di form selalu mengikuti cover slip yang sedang dibuka.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
