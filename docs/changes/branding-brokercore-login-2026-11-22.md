# Nama sistem BROKERCORE di halaman login

- **Tanggal:** 2026-11-22
- **Branch:** `chore/branding-brokercore`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 22 November 2026: judul panel login "Sistem Back Office" dengan teks "SPPA, placing slip, polis, dan klaim dalam satu sistem" diganti menjadi **BROKERCORE System**, dengan tagline **The Core of Your Business**.

## Yang berubah

- **Halaman login, panel kiri:**
  - judul menjadi "BROKERCORE" (putih) dan "System" (emas), dengan susunan dua baris yang sama seperti sebelumnya;
  - teks di bawahnya menjadi "The Core of Your Business".
- **Ukuran judul:** 60 px di layar `lg` (1024–1279 px) dan 72 px mulai `xl`. "BROKERCORE" berhuruf besar dan lebih lebar dari "Back Office", sehingga di 1024 px ukuran 72 px masuk ke padding panel.
- **Tidak diubah:** nama perusahaan (PT. LCH Insurance Brokers), judul tab browser, dan teks lain di aplikasi.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint, dan `npm run build`: lolos.
- **Browser lokal** (`lch.localhost:3002/login`):
  - lebar 1024 px: judul 60 px, tepi kanan teks 449 px, masih di dalam batas isi panel (492 px);
  - lebar 1280 px: judul 72 px, tepi kanan 528 px, batas 629 px;
  - mobile 375 px: judul 36 px, tanpa scroll horizontal.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
