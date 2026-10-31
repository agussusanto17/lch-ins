# Chip pilihan, input berbentuk pil, dan switch alamat utama

- **Tanggal:** 2026-10-31
- **Branch:** `fix/chip-tarif-ojk`
- **PR:** [#64](https://github.com/agussusanto17/lch-ins/pull/64)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus meninjau tampilan form pada 31 Oktober 2026 dan menemukan beberapa hal:

- Chip pilihan di panel Referensi Tarif OJK terlalu datar. Pilihan yang tidak
  aktif tidak berbingkai, jadi sulit dibedakan dari label biasa, dan pilihan
  yang aktif hanya berlatar abu-abu muda. Masalah yang sama ada di Wording
  Form dan Tipe Klien. Agus minta perbaikannya berlaku di semua halaman.
- Sudut kontrol form tidak seragam. Dropdown berbentuk pil, sedangkan input
  teks, input angka, dan textarea memakai `rounded-lg`. Agus minta semuanya
  berbentuk pil, sama seperti template BPPP yang memakai `rounded-4xl` untuk
  input.
- Radio "Alamat utama" di form klien terlalu kecil dan sulit diklik. Agus
  minta diganti switch.

## Yang berubah

- Varian `filter` ditambahkan ke `Toggle` dan dijadikan gaya bawaan `Toggle`
  serta `ToggleGroup`, jadi semua pilihan berbentuk chip, termasuk yang dibuat
  nanti, memakai gaya ini:
  - Belum aktif: bingkai abu-abu tipis (`border-border`, permintaan Agus
    setelah versi `foreground/50` dinilai terlalu hitam), kursor pointer, dan
    bingkai berubah primary saat hover.
  - Aktif: bingkai primary 2px, latar `primary/8` (setara primary-50, sama
    dengan nuansa badge info), dan teks primary (4,95:1; dark mode 4,68:1).
    Latar biru penuh tidak dipakai supaya tidak mirip tombol utama (permintaan
    Agus).
  - Tebal bingkai 2px menjadi penanda selain warna (WCAG 1.4.1). Padding
    dikurangi 1px supaya lebar chip tidak bergeser saat dipilih.
- Chip Wording Form dan pilihan Correspondence Address di form slip pindah dari
  `Button` dengan varian berganti-ganti ke `Toggle`. Ikon centang tetap ada.
- Input teks, input angka, dan grup input (`rounded-lg`) menjadi `rounded-4xl`,
  sehingga berbentuk pil seperti dropdown. Perubahan ini ikut menyentuh kolom
  telepon "+62" dan input tanggal.
- Textarea memakai `rounded-3xl`. Bentuk pil penuh di kotak beberapa baris akan
  memotong sudut teks, jadi radius besar ini yang paling dekat.
- Radio "Alamat utama" diganti switch, sama seperti "Period TBA" di form slip.
  Switch tetap saling eksklusif antar-alamat. Bila semua dimatikan, alamat
  pertama dijadikan utama saat simpan, sesuai perilaku sebelumnya.

## File utama

- `components/ui/toggle.tsx`, `components/ui/toggle-group.tsx`: varian `filter`
  dan gaya bawaan.
- `components/ui/input.tsx`, `number-input.tsx`, `input-group.tsx`,
  `textarea.tsx`: radius sudut.
- `components/underwriting/placing-slip-form.tsx`: Wording Form memakai
  `Toggle`.
- `components/underwriting/insured-picker.tsx`: pilihan alamat memakai
  `Toggle`.
- `components/marketing/client-form.tsx`: switch alamat utama.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint` pada file yang diubah: lolos.
- Cek tampilan dan gaya terhitung di localhost:
  - Panel tarif kendaraan bermotor dan harta benda: pilihan aktif berbingkai
    2px biru, yang lain 1px abu-abu tipis. Bingkai berubah biru saat hover.
  - Wording Form slip 001/LCH-PLCMT/PS-PL/X/2026 dan Correspondence Address
    di draft slip (tidak disimpan): pilihan terpilih 2px biru dengan ikon
    centang.
  - Form Edit KYC PT Graha Sentosa Properti (tidak disimpan):
    - Input, termasuk telepon "+62" dan tanggal, memiliki radius 20,8px pada
      tinggi 36px, jadi berbentuk pil penuh. Dropdown 17,6px.
    - Textarea 17,6px.
    - Radio sudah tidak ada. Menyalakan switch alamat kedua mematikan switch
      alamat pertama.
    - Tipe Klien memakai gaya chip baru.

## Catatan untuk yang melanjutkan

- Tab halaman (komponen `Tabs`, misalnya Database Klien, SPPA, Renewal
  Notice) belum disentuh. Pola tab beda dari chip pilihan.
- Tombol Bawah/Atas dan angka rate bertombol di panel tarif memakai `Button`
  outline dan belum disamakan.
- Komponen `RadioGroup` tidak lagi dipakai di form. Bila nanti dipakai,
  ukurannya perlu diperbesar dulu (Agus menilai radio terlalu kecil).
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
