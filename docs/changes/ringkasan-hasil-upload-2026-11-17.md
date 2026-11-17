# Ringkasan hasil upload deklarasi MOP dan impor peserta PA

- **Tanggal:** 2026-11-17
- **Branch:** `feat/ringkasan-hasil-upload`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Upload deklarasi MOP (PR #258, #260) dan impor peserta PA grup (PR #160) menolak seluruh file kalau ada satu baris salah. Kalau semua benar, yang muncul hanya toast singkat.
- Agus, 17 November 2026, setelah upload deklarasi dari template berhasil: perlu info berapa baris berhasil dan berapa gagal, untuk deklarasi dan juga PA, supaya baris yang terlewat atau gagal ketahuan.

## Yang berubah

- **Baris yang benar tetap diproses, baris yang salah dilaporkan.** Kesalahan tingkat file tetap menahan seluruh file:
  - kolom wajib tidak ditemukan;
  - jumlah baris melebihi batas;
  - file kosong;
  - file tidak bisa dibaca.
- **Komponen `UploadSummary`** dipakai bersama. Isinya:
  - angka Dibaca, Berhasil (Siap disimpan / Tersimpan / Diimpor), Gagal, dan Dilewati;
  - daftar baris yang gagal beserta alasannya, misalnya "Baris 5: Kategori Rate "BULK" tidak ada di slip.";
  - petunjuk perbaikan.
- **Upload deklarasi MOP:**
  - **Sebelum simpan:** "Hasil baca file". Tombol Simpan menyimpan baris yang siap saja.
  - **Setelah simpan:**
    - Kalau ada baris gagal, drawer tetap terbuka dengan "Hasil upload" (Tersimpan, Gagal, Dilewati, dan daftar barisnya), toast-nya peringatan, dan tombol berubah menjadi Tutup.
    - Kalau semua berhasil, drawer tertutup dengan toast yang juga menyebut jumlah baris yang dilewati.
    - Kalau satu kelompok simpan gagal di server, baris yang belum tersimpan ikut masuk daftar dan bisa disimpan ulang.
  - **Memperbaiki baris yang gagal:** perbaiki di file yang sama lalu upload lagi. Baris yang sudah tersimpan otomatis dilewati.
- **Impor peserta PA:**
  - Peserta dari baris yang benar masuk daftar. "Hasil impor peserta" (Dibaca, Diimpor, Gagal, daftar baris) tetap tampil di bawah tombol sampai impor berikutnya atau daftar dikosongkan.
  - Toast menjadi peringatan kalau ada baris gagal.
  - Dialog Ganti daftar peserta menyebut jumlah baris yang gagal.
- **Parser:**
  - `declarationsFromRows` dan `participantsFromRows` sekarang mengembalikan `read`, `failed`, dan `fileErrors`.
  - Baris yang gagal tidak lagi ikut di hasil `participants`. Sebelumnya baris itu tetap ikut, tapi seluruh impor ditolak.

## File utama

- `components/shared/upload-summary.tsx` (baru)
- `components/policies/declaration-upload.tsx`
- `components/underwriting/slip-participants.tsx`
- `lib/declaration-import.ts`, `lib/slip-participants.ts`
- `tests/declaration-import.test.ts`, `tests/slip-participants.test.ts`

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Perilaku baru:** file dengan sebagian baris salah tidak lagi ditolak utuh. Baris yang benar tersimpan atau diimpor, dan baris yang salah tercantum di ringkasan. Untuk PA, peserta yang barisnya gagal belum masuk daftar sampai filenya diperbaiki dan diimpor lagi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 272 tes, 272 lolos. Tes baru memeriksa jumlah dibaca/gagal, baris campuran (yang benar tetap masuk), dan kesalahan tingkat file yang menahan seluruh file.
- **Browser lokal:**
  - **Upload deklarasi** ke polis MOP 023 dengan file 5 baris (2 benar, 1 tanggal di luar periode, 1 kategori BULK, 1 sudah tercatat):
    - "Hasil baca file" menampilkan Dibaca 5, Siap disimpan 2, Gagal 2, Dilewati 1, beserta alasan baris 3 dan 5;
    - setelah Simpan, "Hasil upload" menampilkan Tersimpan 2, Gagal 2, Dilewati 1, toast "2 deklarasi tersimpan, 2 baris gagal", dan tombol Tutup;
    - data uji dihapus.
  - **Impor peserta PA** di form slip baru General Accident (tidak disimpan), file 4 baris dengan 1 nama kosong dan 1 tanggal lahir salah:
    - "Hasil impor peserta" menampilkan Dibaca 4, Diimpor 2, Gagal 2, beserta alasannya;
    - Ani Uji dan Citra Uji masuk daftar;
    - toast "2 peserta diimpor, 2 baris gagal".

## Catatan untuk yang melanjutkan

- Komponen `UploadSummary` bisa dipakai untuk impor Excel lain nanti.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
