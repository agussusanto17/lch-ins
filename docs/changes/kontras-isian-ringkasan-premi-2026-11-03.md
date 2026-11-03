# Kontras isian Discount, Admin Cost, dan Stamp Duty di ringkasan premi

- **Tanggal:** 2026-11-03
- **Branch:** `fix/kontras-isian-ringkasan-premi`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Di form placing slip, kotak ringkasan premi (Total Premium sampai Total
Payable) berlatar abu-abu (`bg-muted/50`). Tiga isiannya, Discount, Admin
Cost, dan Stamp Duty, dipaksa putih (`bg-background`) tanpa garis tepi, jadi
batas isian hampir tidak terlihat (Request & Temuan REQ-013).

Diukur dengan contrast checker antislop-human, isian putih di kotak itu hanya
1,04:1 terhadap latarnya. Aturan non-text contrast (WCAG 1.4.11) meminta batas
komponen interaktif minimal 3:1. Mengembalikan gaya isian standar
(`bg-input/50`) juga tidak cukup: 1,07:1 di kotak abu.

## Yang berubah

- Ketiga isian di kotak ringkasan premi diberi garis tepi
  `border-muted-foreground/80`, tetap berlatar putih. Kontras garis:
  - mode terang: 3,32:1 terhadap kotak abu dan 3,47:1 terhadap isi isian;
  - mode gelap: 4,09:1 dan 4,56:1.

  Satu tingkat lebih tipis (`/70`) hanya 2,81:1 di mode terang.
- Garis saat fokus (`focus-visible:border-ring`) dan saat isian tidak valid
  (`aria-invalid:border-destructive`) tetap berlaku, karena varian itu tidak
  ikut tertimpa.
- Kelasnya disimpan di konstanta `PANEL_INPUT` beserta alasannya.

## File utama

- `components/underwriting/placing-slip-form.tsx`: `PANEL_INPUT` dan tiga
  isian di kotak ringkasan premi.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Kontras dihitung dari token warna di `app/globals.css` dengan
  `contrast-check.py` milik antislop-human. Garis 80% dihitung di atas latar
  isian sendiri, karena latar elemen ikut tergambar di bawah garis tepi.
- Hasil `cn()` di `NumberInput` dicek: `border-transparent` tergantikan oleh
  `border-muted-foreground/80`, dan varian fokus serta invalid tetap ada.
- CSS hasil build memuat `.border-muted-foreground\/80` beserta versi
  `color-mix(in oklab, var(--muted-foreground) 80%, transparent)`.
- Kotak ringkasan premi dirender dengan komponen `Field` dan `NumberInput` asli
  serta CSS hasil build, sebelum dan sesudah, di mode terang dan gelap, lalu
  dicek visual.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Isian standar di seluruh aplikasi (pil `bg-input/50` tanpa garis di atas
  kartu putih) juga hanya 1,09:1 terhadap latarnya. Perubahan ini sengaja
  terbatas pada kotak ringkasan premi; menyeragamkan garis tepi di komponen
  `Input` dan `NumberInput` adalah keputusan desain terpisah.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
