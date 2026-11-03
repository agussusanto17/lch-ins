# Tombol Save di editor wording klausula slip

- **Tanggal:** 2026-11-03
- **Branch:** `fix/tombol-save-edit-klausula`
- **PR:** [#89](https://github.com/agussusanto17/lch-ins/pull/89)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Di form Placing Slip, setiap klausula terpilih punya tombol **Edit wording**
untuk membuka editor judul dan wording khusus slip itu. Saat editor terbuka,
tombol yang sama berlabel **Tutup**. Harry minta labelnya diganti menjadi
**Save** (Request & Temuan REQ-009).

## Yang berubah

- Saat editor wording terbuka, tombolnya berlabel **Save** dengan ikon centang.
  Sebelumnya **Tutup** dengan ikon pensil, sama dengan tombol Edit wording.
- Perilakunya tetap: hasil edit sudah masuk ke slip saat diketik, dan Save
  menutup editor. Penyimpanan ke database tetap lewat **Simpan Draft**, dan
  peringatan perubahan yang belum disimpan tetap muncul kalau halaman ditutup.

## File utama

- `components/underwriting/clause-picker.tsx`: tombol Edit wording / Save di
  daftar klausula terpilih.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.
- Belum dicek di browser karena butuh login. Langkah ujinya: buka slip Draft,
  pilih satu klausula, klik Edit wording. Tombolnya berubah menjadi Save dengan
  ikon centang, dan Save menutup editor tanpa membuang hasil edit.

## Catatan untuk yang melanjutkan

- Label "Save" mengikuti permintaan Harry, walaupun tombol lain di form ini
  berbahasa Indonesia (Simpan Draft, Batal).
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
