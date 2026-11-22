# Tanda data produksi dobel di report

- **Tanggal:** 2026-11-22
- **Branch:** `feat/flag-dobel-report`
- **PR:** #307
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 22 November 2026: "di report jika data produksi ada yang dobel tetap tercatat dobel tapi dikasih tanda seperti flag gitu bahwa ini ada yg dobel jadi user bisa cek."

Data produksi bisa tercatat dua kali, misalnya polis sementara yang otomatis tercatat dari CI lalu diinput lagi manual dengan nomor polis asuransi. Report tidak boleh menghapus salah satunya. User yang memutuskan.

## Yang berubah

- **Aturan dobel** (`lib/production-duplicates.ts`):
  - **No. polis sama** dipakai lebih dari satu data. Spasi, titik, dan huruf besar/kecil tidak membedakan nomor. Nomor polis di database unik, jadi aturan ini menangkap nomor yang hanya beda penulisan.
  - **Isi sama dengan nomor polis berbeda:** tipe, tertanggung, COB, asuransi leader, tanggal mulai dan berakhir, mata uang, dan premi sama.
  - **Tidak dianggap sama:**
    - bagian PAR dan EQVET satu slip;
    - perubahan di bawah polis induk berbeda;
    - data berpremi 0 (polis induk MOP tanpa premi deposit).
- **Rekap Produksi (Excel):**
  - kolom baru **Cek Dobel** di ujung sheet Rekap Produksi dan Per Polis, misalnya "DOBEL? isi sama dengan 45020126000123";
  - baris bertanda berwarna oranye;
  - datanya tetap ditulis dan ikut dijumlah;
  - sheet Keterangan menjelaskan aturannya.
- **Report Operational, tab Polis:**
  - tanda **"Dobel?"** di samping nomor polis, keterangannya muncul saat kursor diarahkan;
  - catatan jumlah polis bertanda di atas tabel;
  - export tab Polis mendapat kolom Cek Dobel.

## Asumsi

- **Dicek hanya di dalam periode report.** Data dobel dengan tanggal mulai di luar periode tidak terlihat.
- **Tanda berarti "perlu dicek",** bukan pasti dobel. Dua pengiriman atau endorsement dengan isi persis sama bisa saja sah.

## File utama

- `lib/production-duplicates.ts` (baru).
- **Rekap Produksi:** `lib/production-recap.ts` (kolom Cek Dobel, warna baris, catatan) dan `lib/server/production-recap.ts` (bagian slip PAR/EQVET).
- **Report Operational:** `components/reports/report-view.tsx`.
- **Tes:** `tests/production-duplicates.test.ts` (baru) dan `tests/production-recap.test.ts`.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Report:** Rekap Produksi bertambah satu kolom di ujung, jadi 49 kolom contoh LCH tetap di posisinya.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 417 lolos. Tes baru:
  - no. polis sama;
  - isi sama (polis CI dan input manual, nama dengan titik);
  - PAR/EQVET, polis induk berbeda, asuransi berbeda, dan premi 0 tidak bertanda;
  - kolom dan warna di workbook.
- **Browser lokal:** polis MV/2026/JKT/0451 disalin sementara dengan nomor DUP-TEST/0451, lalu salinannya dihapus.
  - Report Operational tab Polis: kedua polis bertanda "Dobel?" dan catatan "2 polis kemungkinan tercatat dobel".
  - Sebelum aturan premi 0, dua polis induk MOP uji ikut bertanda. Karena itu data berpremi 0 dan asuransi berbeda dikecualikan.
  - Rekap Produksi Agustus 2026 (ditangkap tanpa diunduh): kedua baris tetap ada, kolom Cek Dobel terisi, dan baris berwarna oranye di sheet Rekap Produksi dan Per Polis.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
