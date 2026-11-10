# Tombol "Catat polis dari CI ini" di dokumen Closing Instruction

- **Tanggal:** 2026-11-10
- **Branch:** `feat/catat-polis-dari-ci`
- **PR:** [#210](https://github.com/agussusanto17/lch-ins/pull/210)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Laporan Agus, 10 November 2026: Closing Instruction sudah terbit, tetapi polisnya tidak muncul di Policy Database. Ada dua slip di demo yang mengalami ini: `005/LCH-PLCMT/PS/XI/2026` dan `006/LCH-PLCMT/PS-CIS/XI/2026`.

Hasil penelusuran:

- **006** di-close sebelum deploy pencatatan polis otomatis (#206, lihat `polis-otomatis-dari-ci-2026-11-10.md`). Polisnya memang tidak tercatat, karena fiturnya belum ada saat itu.
- **005** di-close pukul 16.16 WIB, 6 menit setelah deploy Vercel selesai (16.10). Audit tidak mencatat pembuatan polis, dan keterangan di dokumen CI menulis "Belum ada polis". Penyebab pastinya tidak bisa dipastikan tanpa log Vercel. Ada dua dugaan:
  - tab browser masih memuat versi sebelum deploy;
  - pencatatannya gagal, tetapi alasannya hanya dikirim sebagai toast. Setelah CI terbit, halaman langsung pindah ke dokumen CI, dan layout cetak tidak punya Toaster, jadi pesannya tidak terlihat.
- **Uji lokal:** fungsi yang sama berhasil mencatat polis untuk slip yang Closed.

Perbaikan ini memberi jalan untuk mencatat polis slip yang sudah Closed, dan langsung menampilkan alasannya kalau gagal.

## Yang berubah

- **Tombol "Catat polis dari CI ini"** ada di keterangan di atas dokumen Closing Instruction (bagian yang tidak ikut tercetak). Tombol ini tampil kalau:
  - slip berstatus Closed;
  - belum ada polis dari slip itu di Policy Database;
  - user boleh Kelola Policy Database, yaitu Admin, Placement, dan Policy Admin. Role lain tetap melihat keterangannya, tanpa tombol.
- **Server action `recordPoliciesFromClosingAction(slipId)`** di `app/(app)/placement/actions.ts`:
  - memeriksa hak Kelola `/policies`;
  - memanggil `recordPoliciesFromClosing`, dengan aturan yang sama seperti pencatatan otomatis saat CI terbit: satu polis per bagian PAR/EQVET, nomor polis sementara dari nomor CI, dan tipe Renewal kalau slip punya Existing Policy No.;
  - tidak membuat ulang bagian yang sudah punya polis;
  - mengembalikan alasan kalau slip dilewati (open cover, periode kosong) atau pencatatan gagal.
- **Hasil di halaman:**
  - **berhasil:** halaman dimuat ulang, dan keterangan berubah menjadi "Polis tercatat di Policy Database: …";
  - **gagal:** "Polis belum tercatat: <alasan>" tampil di samping tombol.

## File utama

- `app/(app)/placement/actions.ts`: `recordPoliciesFromClosingAction`.
- `app/(print)/placement/closing/[id]/page.tsx`: `canRecordPolicy` dari `currentUser()` dan `canManage(roles, "/policies")`, karena layout cetak tidak punya PermissionProvider.
- `components/documents/slip-documents.tsx`: `LinkedPoliciesNotice` dengan tombol dan pesan hasil.

## Dampak

- **Database:** tidak ada perubahan skema.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi. Setelah deploy, buka dokumen CI slip 005 dan 006, lalu klik "Catat polis dari CI ini" untuk mencatat polisnya.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah, `npx tsx --test tests/*.test.ts` (161 tes), dan `npm run build`: semuanya lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara):
  - **Admin, slip 009** dengan periode dikosongkan sementara: tombol tampil. Setelah diklik, muncul "Polis belum tercatat: Periode slip belum diisi, jadi polis belum dicatat otomatis.", dan tidak ada polis yang dibuat.
  - **Admin, slip 016** (Closed, belum ada polis): setelah tombol diklik, keterangan berubah menjadi "Polis tercatat di Policy Database: 016/LCH-PLCMT/CI-MC/XI/2026", dan tombolnya hilang. Polis itu juga ditemukan lewat pencarian di Policy Database.
  - **Marketing** (Policy Database hanya Lihat), slip 015: keterangan tampil, tombol tidak.
  - Tidak ada error di console browser.
  - **Data uji dibersihkan:** polis uji dan audit-nya, serta sesi sementara, dihapus. Periode slip 009 dikembalikan.

## Catatan untuk yang melanjutkan

- **PR ini dibuat di atas #209** (route `/placement`). Merge #209 dulu.
- **Kalau tombol gagal di demo,** alasannya tampil di halaman. Teks itu yang dipakai untuk menelusuri penyebab di slip 005.
- **Toast "Policy Database" setelah CI terbit tidak terlihat,** karena halaman langsung pindah ke dokumen CI. Keterangan di atas dokumen CI yang menjadi sumber informasi polis.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
