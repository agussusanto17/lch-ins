# Type of cover Hull War Risks (HWR) di Marine Hull

- **Tanggal:** 2026-11-09
- **Branch:** `feat/toc-hull-war-risks`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Dua contoh slip LCH memakai cover War untuk kapal:
  - CI War Eng Lee (contoh 11), bernomor `014/LCH-PLCMT/CI-HWR/VIII/2026`;
  - Section C Patria (contoh 16).
- Type of cover itu belum ada di master. Pertanyaan nomor 2 ke Harry
  menanyakan apakah boleh ditambahkan. Harry menyetujui (9 November 2026).
- Vessel schedule Eng Lee dan Patria masih belum dikirim. Fitur daftar kapal
  tetap menunggu lampiran itu.

## Yang berubah

- **Type of cover baru** di COB 04 Marine Hull:
  - kode 0404, karena kode itu masih kosong di daftar COB dan TOC LCH;
  - nama Hull War Risks;
  - singkatan HWR, jadi nomor dokumen menjadi `.../CI-HWR/...` seperti contoh
    LCH.
- **Label detail bawaan:** Existing Policy No., Vessels, Trading Limits. Ini
  mengikuti jawaban Harry 6 November 2026:
  - Existing Policy No. untuk semua type of cover;
  - Vessels dan Trading Limits untuk Hull.
- **Nama sengaja tanpa "Marine Hull"**, supaya klausul H&M dan War tidak
  tertukar. Klausul diikat ke nama type of cover.
- **LCH bisa mengubah** kode, nama, singkatan, dan label di Master Data.

## File utama

- `prisma/migrations/20261109160000_toc_hull_war_risks/migration.sql`.
- `prisma/seed-data/cob-toc.csv` dan `COVER_ABBREVIATIONS` di
  `prisma/seed.ts`, untuk database baru.

## Dampak

- **Database:**
  - Satu baris baru di `cover_types`. Tidak ada perubahan skema.
  - Migrasi dilewati bila kode 0404 sudah dipakai, atau bila nama Hull War
    Risks sudah ada di Marine Hull. Jadi type of cover yang sudah ditambahkan
    LCH sendiri tidak didobelkan.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan otomatis saat build, di Vercel dan VPS.

## Verifikasi

- `npx tsc --noEmit`, eslint `prisma/seed.ts`, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 118 lolos.
- **Database lokal:** 0404 Hull War Risks HWR masuk dengan tiga label detail.
- **Guard migrasi** (dalam transaksi yang di-rollback):
  - dijalankan ulang: tidak menambah baris;
  - nama Hull War Risks sudah ada dengan kode lain: tidak menambah baris.
- **Database sementara dari nol** (dibuat lalu dihapus):
  - 67 migrasi berhasil;
  - seed berhasil dan membuat 0404 HWR.
- **Uji browser lokal** dengan sesi login sementara:
  - Hull War Risks muncul di pilihan Type of Cover slip Marine Hull;
  - setelah dipilih, Detail Tambahan berisi Existing Policy No., Vessels,
    dan Trading Limits;
  - Master Data menampilkan `0404 — Hull War Risks PS-HWR`.

## Catatan untuk yang melanjutkan

- Klausul War dari contoh 11 dan 16 belum ada di master. Rencananya ikut impor
  judul klausul (pertanyaan nomor 4).
- Contoh 16 menggabungkan H&M, Increased Value, dan War dalam satu CI.
  - Section B Increased Value juga belum punya type of cover.
  - Nilai per kapal per section belum bisa dihitung terpisah.
  - Keduanya menunggu vessel schedule dari LCH.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
