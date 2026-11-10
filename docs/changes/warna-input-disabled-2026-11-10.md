# Warna isian disabled disamakan dengan dropdown Klien

- **Tanggal:** 2026-11-10
- **Branch:** `fix/warna-input-disabled`
- **PR:** [#214](https://github.com/agussusanto17/lch-ins/pull/214)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Masukan Agus, 10 November 2026, dari form Policy Database yang terkunci dari slip: latar text input yang disabled sedikit berbeda dari dropdown yang disabled, sehingga kontrasnya dengan latar putih kurang. Menurut Agus, warna dropdown Klien sudah pas.

Ada dua penyebab:

- **Input, Textarea, NumberInput, dan trigger Select** yang disabled memakai `opacity-50` untuk seluruh elemen, sehingga latarnya ikut memudar. Dropdown Klien adalah combobox: hanya teks dan ikonnya yang memudar, latarnya tetap `bg-input/50`.
- **NumberInput** punya gaya `read-only:bg-muted/60`. Selector `:read-only` juga cocok dengan input yang disabled, jadi kolom angka (Premium, Total Sum Insured, Brokerage, Additional Fee) tampil paling pucat.

## Yang berubah

- **Input, Textarea, NumberInput, dan SelectTrigger yang disabled:**
  - latar tetap `bg-input/50`;
  - teks memudar menjadi `text-foreground/50`;
  - placeholder memakai `muted-foreground/50`;
  - ikon panah Select memudar.

  Hasilnya sama dengan dropdown Klien.
- **NumberInput:** latar read-only (`bg-muted/60`) hanya berlaku kalau inputnya tidak disabled (`read-only:not-disabled:`). Kolom hitungan yang memang read-only tetap tampil seperti sebelumnya.
- **Berlaku di semua form** yang memakai komponen ini, misalnya form polis yang terkunci dari slip dan form slip yang terkunci.

## File utama

- `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/number-input.tsx`, `components/ui/select.tsx`

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara, tanpa menyimpan). Form Edit Polis `SIT/PA/2026/001` terkunci dari slip 012, dan gaya kolom disabled diukur dengan `getComputedStyle`:
  - Klien, Nama Tertanggung, Asuransi (Leader), Premium, dan Risk Location semuanya berlatar `bg-input/50`, opacity 1, dan teks 50%.
  - Sebelumnya, Premium berlatar `bg-muted/60`, dan kolom selain Klien ber-opacity 0,5.
  - Tidak ada error di console.

## Catatan untuk yang melanjutkan

- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
