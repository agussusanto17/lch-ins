# Renewal tanpa polis sebelumnya di sistem, dan label polis rujukan

- **Tanggal:** 2026-11-09
- **Branch:** `fix/polis-sebelumnya-renewal`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Form polis meminta **Polis Induk** untuk Renewal, Endorsement, dan
  Cancellation. Isian itu wajib dan hanya bisa dipilih dari polis yang sudah
  ada di sistem.
- Pertanyaan Agus (9 November 2026):
  - apa bedanya Polis Induk dengan No. Polis;
  - sistem ini baru berjalan tahun ini, jadi polis tahun lalu bisa belum ada.
- Akibatnya, renewal polis lama LCH tidak bisa disimpan sebelum polis tahun
  lalunya diinput dulu.
- Label "Polis Induk" juga membingungkan. Di asuransi, istilah itu biasanya
  berarti master policy.

## Yang berubah

- **Label sesuai tipe polis:**
  - Renewal: **Polis Sebelumnya**;
  - Endorsement: **Polis yang Di-endorse**;
  - Cancellation: **Polis yang Dibatalkan**.
- **Renewal:**
  - Polis sebelumnya boleh dipilih dari sistem, seperti sebelumnya. Data dan
    periode barunya tersalin dari polis itu.
  - Kalau belum ada di sistem, isi **No. Polis Sebelumnya** sebagai teks. Data
    polis diisi manual.
  - Salah satu dari keduanya wajib. Pesannya: "Pilih polis sebelumnya, atau
    isi nomornya bila belum ada di sistem".
  - Isian nomor hilang begitu polis dipilih dari sistem, dan nomor yang sudah
    diketik dikosongkan.
- **Endorsement dan Cancellation** tetap wajib memilih polisnya dari sistem,
  karena isinya mengubah data polis itu.
- **Server** memeriksa aturan yang sama. Sebelumnya hanya form yang memeriksa.
- **Daftar polis:**
  - keterangan di bawah no. polis menjadi "renewal dari …", "endorsement …",
    atau "pembatalan …", menggantikan "induk …";
  - renewal dengan nomor ketikan juga ditampilkan;
  - kolom ekspor menjadi "Polis Sebelumnya / Induk".
- **Pesan error polis rujukan** hilang begitu tipe, polis rujukan, atau nomor
  polis sebelumnya diubah, supaya tidak tertinggal pesan untuk tipe lain.

## File utama

- `lib/policy-parent.ts`: label, syarat, nilai yang disimpan, dan keterangan
  daftar. Dipakai form, server action, dan daftar polis.
- `components/policies/policy-form.tsx` dan
  `components/policies/policy-database.tsx`.
- `app/(app)/policies/actions.ts` dan `lib/server/policies.ts`.
- `prisma/schema.prisma` dan migrasi `20261109200000_no_polis_sebelumnya`.
- `tests/policy-parent.test.ts`.

## Dampak

- **Database:** kolom baru `policies.previous_policy_no` (teks, boleh kosong).
  Hanya terisi untuk renewal tanpa polis sebelumnya di sistem.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan otomatis saat build, di Vercel dan VPS.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 126 lolos, termasuk 4 test baru.
- **Uji browser lokal** (Playwright, sesi login sementara):
  - Renewal: label Polis Sebelumnya dan isian No. Polis Sebelumnya tampil.
  - Renewal tanpa keduanya ditolak dengan pesan di atas, dan tidak ada yang
    tersimpan.
  - Renewal dengan nomor `PAR/2025/JKT/UJI-01` tersimpan dengan
    `parent_policy_id` kosong. Daftar menampilkan "renewal dari
    PAR/2025/JKT/UJI-01".
  - Endorsement: label Polis yang Di-endorse, tanpa isian nomor. Tanpa polis,
    ditolak dengan "Polis yang Di-endorse wajib dipilih".
  - Memilih polis sebelumnya menyembunyikan isian nomor, dan pesan lama
    hilang.
  - Tanpa error halaman.
- Polis uji dan sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- **Endorsement atau pembatalan untuk polis lama yang belum ada di sistem**
  tetap butuh polis itu diinput dulu, sebagai tipe Baru atau Renewal dengan
  nomor polis sebelumnya.
- **Nomor polis yang sama untuk renewal** masih ditolak ("No. polis sudah
  terdaftar"), karena `policy_no` unik. Kalau ada asuransi yang memakai nomor
  sama saat renewal, perlu dibahas.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
