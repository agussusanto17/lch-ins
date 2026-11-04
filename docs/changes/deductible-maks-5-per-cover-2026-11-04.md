# Deductible sampai lima isian per cover

- **Tanggal:** 2026-11-04
- **Branch:** `feat/deductible-maks-5-per-cover`
- **PR:** [#110](https://github.com/agussusanto17/lch-ins/pull/110)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Sejak deductible ditulis per cover (catatan
[deductible-per-cover-2026-10-29.md](deductible-per-cover-2026-10-29.md)),
setiap cover hanya punya satu isian. Slip dengan satu cover, misalnya Liability
"Comprehensive General Liability", sering butuh beberapa deductible (property
damage, bodily injury, products). Diminta lima isian, bukan satu (Request &
Temuan REQ-026, 4 November 2026).

## Yang berubah

- **Form placing slip** (juga Draft Quotation, yang memakai form yang sama):
  setiap cover menampilkan isian deductible yang sudah ada, minimal satu.
  Tombol "Tambah deductible" menambah isian sampai lima. Begitu ada lebih dari
  satu isian, setiap isian punya tombol hapus. Setiap isian tetap punya tombol
  Pilih dari Master Data > Deductible.
- **Data:** kolom baru `slip_rate_lines.deductibles` (`text[]`). Deductible
  lama disalin ke kolom ini lewat migrasi. Kolom `deductible` dibiarkan supaya
  kode versi sebelumnya tetap jalan selama deploy, tapi tidak dibaca dan tidak
  ditulis lagi.
- **Server:** isian kosong dibuang dan isian dipotong jadi lima sebelum
  disimpan. Validasi action menolak lebih dari lima deductible per cover dan
  teks lebih dari 500 karakter. Form yang dibuka sebelum deploy masih mengirim
  satu teks `deductible`; validasi mengubahnya ke `deductibles` supaya tidak
  terbuang.
- **Dokumen** (Placing Slip, Quotation, Cover Note, Closing Instruction): semua
  deductible dicetak sebagai butir "-". Teks yang sama dari beberapa cover
  tetap dicetak sekali.
- **Duplikat slip** ikut membawa semua deductible.

## File utama

- `prisma/schema.prisma`,
  `prisma/migrations/20261104170000_deductible_maks_lima/`: kolom dan salinan
  data lama.
- `lib/data/types.ts`: `RateLine.deductibles` dan `MAX_DEDUCTIBLES`.
- `components/underwriting/deductible-input.tsx`: komponen `DeductibleList`.
- `components/underwriting/placing-slip-form.tsx`: pemakaian di form.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan,
  muat, dan validasi.
- `components/documents/doc-blocks.tsx`: cetak deductible.
- `lib/data/slips.ts`, `scripts/test-placing-slip-e2e.ts`: data contoh dan
  script uji ikut bentuk baru.

## Dampak

- **Database:** migrasi `20261104170000_deductible_maks_lima`, jalan otomatis
  saat build di Vercel dan VPS. Hanya menambah kolom dan menyalin data, jadi
  aman untuk kode lama yang masih melayani selama deploy.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Migrasi di database lokal: 18 deductible lama tersalin persis ke
  `deductibles`, baris lain berisi daftar kosong, tidak ada NULL.
- Simpan dan muat ke database lokal: dua deductible plus isian kosong tersimpan
  sebagai dua; lima tersimpan berurutan; enam dipotong jadi lima; duplikat
  membawa kelimanya; kolom lama tidak ditulis lagi. Slip uji dihapus.
- Form dirender dengan komponen asli dan CSS hasil build: tiga deductible
  tampil sebagai tiga isian dengan tombol hapus dan "Tambah deductible"; lima
  isian menyembunyikan tombol tambah; cover tanpa deductible tampil satu isian
  tanpa tombol hapus; slip Property punya tombol tambah di setiap cover.
- Dokumen: tiga deductible tercetak sebagai tiga butir; teks sama di beberapa
  cover tercetak sekali.
- Schema action diuji dari teksnya di `actions.ts`: bentuk lama `deductible`
  menjadi `["Nil"]`, bentuk baru menang bila keduanya ada, enam isian dan teks
  501 karakter ditolak dengan pesan yang benar.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Kolom `deductible` bisa dihapus di migrasi berikutnya, setelah tidak ada
  deploy yang masih memakai kode sebelum perubahan ini.
- Field `deductible` di schema action hanya untuk form yang dibuka sebelum
  deploy; boleh dihapus bersama kolomnya.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
