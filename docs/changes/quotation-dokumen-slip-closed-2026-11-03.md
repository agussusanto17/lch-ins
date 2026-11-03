# Dokumen Quotation dari slip Closed bisa dibuka lagi

- **Tanggal:** 2026-11-03
- **Branch:** `fix/quotation-dokumen-slip-closed`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

PR #86 ([simpan-draft-quotation-database-2026-11-03.md](simpan-draft-quotation-database-2026-11-03.md))
membuat tombol **Quotation Slip** dan **Draft Cover Note** di halaman Quotation
menyimpan slip ke database dulu, baru membuka dokumennya. Untuk slip berstatus
Closed atau Cancelled, server menolak penyimpanan itu ("Placing Slip berstatus
Closed tidak dapat diubah"), jadi dokumennya tidak pernah terbuka dan user hanya
melihat toast "Gagal menyimpan quotation". Kedua tombol tetap aktif untuk slip
seperti itu, karena hanya dinonaktifkan saat panel belum valid, slip masih
Draft, atau penyimpanan sedang berjalan.

Bug ini ditemukan saat review PR #86 dan sudah tayang di demo sejak PR itu
di-merge.

## Yang berubah

- Untuk slip Closed atau Cancelled, tombol Quotation Slip dan Draft Cover Note
  langsung membuka dokumennya tanpa menyimpan. Isian di halaman itu sudah
  dinonaktifkan untuk slip yang terkunci, jadi tidak ada perubahan yang hilang.
- Slip Released dan Quoted tidak berubah: tetap disimpan dulu, lalu dokumennya
  dibuka.

## File utama

- `components/underwriting/quotation-draft-form.tsx`: `openDoc`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.
- Belum diuji klik di browser karena butuh login. Langkah ujinya: buka halaman
  Quotation (`/underwriting/quotation/edit/<id>`) untuk slip berstatus Closed,
  lalu klik Quotation Slip dan Draft Cover Note. Keduanya harus terbuka tanpa
  toast gagal simpan.

## Catatan untuk yang melanjutkan

- Status Quoted dan Closed dari halaman Quotation masih ditulis lewat
  `savePlacingSlipAction`, yang menyimpan `status` dari client apa adanya.
  Syarat panel (total share 100%, ada leader) hanya dicek di client. Usulan
  validasi transisi status di server ada di review PR #86 dan belum dikerjakan
  di sini.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
