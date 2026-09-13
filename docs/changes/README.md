# Catatan perubahan

Setiap perubahan pada project ini punya satu catatan di folder ini. Catatan
ditulis di branch yang sama dengan perubahannya dan ikut masuk di PR yang sama.
Aturan lengkapnya ada di [AGENTS.md](../../AGENTS.md#catatan-perubahan-docschanges).

## Nama file

`<topik>-<YYYY-MM-DD>.md`, huruf kecil dan kebab-case. Tanggal adalah hari
perubahan dibuat, waktu WIB.

- `implementasi-login-2026-08-13.md`
- `perbaikan-hitung-premi-2026-08-14.md`
- `implementasi-login-2026-08-13-2.md` kalau nama pertama sudah dipakai

Urutkan berdasarkan tanggal di nama file untuk melihat perubahan terbaru.

## Template

Salin blok di bawah ke file baru. Hapus bagian yang memang tidak relevan,
misalnya "Dampak" untuk perubahan yang hanya menyentuh tampilan.

```markdown
# <Judul perubahan>

- **Tanggal:** YYYY-MM-DD
- **Branch:** `feat/...`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** <nama>, atau <nama> dengan <agent>

## Latar belakang

Kenapa perubahan ini perlu. Rujuk PRD, ERD, checklist LCH, issue, atau laporan
bug kalau ada.

## Yang berubah

- Poin-poin perubahan dari sisi perilaku, bukan daftar file.

## File utama

- `path/ke/file.ts`: peran file ini dalam perubahan.

## Dampak

- **Database:** migrasi baru, seed, perubahan data. Tulis "tidak ada" kalau tidak ada.
- **Env:** variabel baru atau yang berubah (nama saja, jangan nilainya).
- **Deploy:** langkah tambahan setelah merge.

## Verifikasi

Perintah yang dijalankan dan hasilnya, misalnya `npx tsc --noEmit`,
`npm run build`, atau langkah uji manual di halaman tertentu.

## Catatan untuk yang melanjutkan

Keputusan penting beserta alasannya, hal yang belum selesai, jebakan yang
ditemukan, dan catatan lama yang terkait.
```
