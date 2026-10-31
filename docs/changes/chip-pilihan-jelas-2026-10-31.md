# Chip pilihan terbaca bisa diklik dan state aktif jelas

- **Tanggal:** 2026-10-31
- **Branch:** `fix/chip-tarif-ojk`
- **PR:** [#64](https://github.com/agussusanto17/lch-ins/pull/64)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus menilai chip pilihan di panel Referensi Tarif OJK terlalu datar. Pilihan
yang tidak aktif tidak berbingkai, jadi sulit dibedakan dari label biasa.
Pilihan yang aktif hanya berlatar abu-abu muda. Masalah yang sama ada di
Wording Form dan Tipe Klien, dan Agus minta perbaikannya berlaku di semua
halaman.

Hasil ukur sebelum perubahan: bingkai `border-input` hanya 1,19:1 terhadap
latar putih, jauh di bawah batas WCAG 3:1 untuk batas komponen yang bisa
diklik.

## Yang berubah

- Varian `filter` ditambahkan ke `Toggle` dan dijadikan gaya bawaan `Toggle`
  serta `ToggleGroup`, jadi semua pilihan berbentuk chip, termasuk yang dibuat
  nanti, memakai gaya ini:
  - Belum aktif: bingkai `foreground/50` (3,41:1 terhadap putih), kursor
    pointer, dan bingkai berubah primary saat hover.
  - Aktif: bingkai primary 2px, latar `primary/8` (setara primary-50 dan sama
    dengan nuansa badge info), teks primary (4,95:1; dark mode 4,68:1).
    Latar biru penuh sengaja tidak dipakai supaya tidak mirip tombol utama
    (permintaan Agus).
  - Tebal bingkai 2px menjadi penanda selain warna (WCAG 1.4.1). Padding
    dikurangi 1px supaya lebar chip tidak bergeser saat dipilih.
- Chip Wording Form dan pilihan Correspondence Address di form slip berpindah
  dari `Button` dengan varian berganti-ganti ke `Toggle`. Ikon centang tetap
  ada.
- Halaman yang ikut berubah: panel Referensi Tarif OJK (harta benda, gempa,
  banjir, kendaraan bermotor), Wording Form, Correspondence Address, dan Tipe
  Klien di form klien.

## File utama

- `components/ui/toggle.tsx`: varian `filter` dan gaya bawaan.
- `components/ui/toggle-group.tsx`: gaya bawaan grup.
- `components/underwriting/placing-slip-form.tsx`: Wording Form memakai
  `Toggle`.
- `components/underwriting/insured-picker.tsx`: pilihan alamat memakai
  `Toggle`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- `npx eslint` pada file yang diubah: lolos.
- Cek tampilan dan gaya terhitung di localhost:
  - Panel tarif kendaraan bermotor (slip Motor) dan harta benda (slip
    Property): pilihan aktif berbingkai 2px biru, yang lain 1px abu-abu.
    Bingkai berubah biru saat hover.
  - Wording Form slip 001/LCH-PLCMT/PS-PL/X/2026: wording terpilih 2px biru,
    yang lain 1px.
  - Correspondence Address setelah klien dipilih di draft slip (tidak
    disimpan): alamat terpilih 2px biru dengan ikon centang.
  - Tipe Klien di form klien: pilihan aktif 2px biru.

## Catatan untuk yang melanjutkan

- Tab halaman (komponen `Tabs`, misalnya Database Klien, SPPA, Renewal
  Notice) belum disentuh. Pola tab beda dari chip pilihan.
- Tombol Bawah/Atas dan angka rate bertombol di panel tarif memakai
  `Button` outline dan belum disamakan.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
