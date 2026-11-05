# Wording form tidak dicetak di CLAUSES

- **Tanggal:** 2026-11-05
- **Branch:** `fix/wording-form-tidak-di-clauses`
- **PR:** [#120](https://github.com/agussusanto17/lch-ins/pull/120)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Bagian CLAUSES di dokumen slip mencetak wording form sebagai butir pertama
("1. Munich–Re Wording … As Attached", "2. Indonesian Earthquake Standard
Policy As Attached"). Harry minta wording form tidak muncul di CLAUSES
(Request & Temuan REQ-034, 5 November 2026). Wording form sudah tercetak di
baris Wording Form di bagian atas dokumen.

## Yang berubah

- **CLAUSES** (keempat dokumen slip) hanya berisi klausula, dan nomornya mulai
  dari 1.
- **Baris Wording Form** di bagian atas dokumen: dua wording form atau lebih
  dicetak satu baris per wording dengan tanda hubung, seperti "Wording" di CI
  LCH dan baris Type of Cover. Sebelumnya digabung dengan titik koma.

## File utama

- `components/documents/doc-blocks.tsx`: `ClausesBlock` dan `DetailTable`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- `ClausesBlock` dirender (daftar dan inline) untuk slip Property dengan dua
  wording form, satu klausula tanpa section, dan satu klausula Section 1:
  tidak ada wording form dan "As Attached", dan nomor klausula mulai dari 1.
- `DetailTable` mencetak dua wording form di dua baris bertanda hubung. Satu
  wording form tercetak tanpa tanda hubung.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah,
  `npx tsx --test tests/access.test.ts tests/documents.test.ts`, dan
  `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Penomoran klausula masih menyambung lintas kelompok (tanpa section, Section
  1, Section 2). CI LCH memulai dari 1 lagi di setiap kelompok; belum
  diputuskan.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
