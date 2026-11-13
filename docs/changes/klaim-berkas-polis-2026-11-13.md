# Berkas polis tampil saat polis dipilih di form klaim

- **Tanggal:** 2026-11-13
- **Branch:** `feat/klaim-berkas-polis`
- **PR:** [#250](https://github.com/agussusanto17/lch-ins/pull/250)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Permintaan Agus, 13 November 2026:** di form Catat Klaim Baru, berkas polis langsung tampil saat polis dipilih, walau klaim belum disimpan. Polis dan endorsement-nya muncul, masing-masing dengan link untuk melihat PDF.
- **Sebelumnya** panel info polis di form hanya menampilkan status premi dan deductible. Link berkas polis baru muncul di detail klaim sesudah disimpan, dan hanya berkas polis yang dipilih.

## Yang berubah

- **Panel info polis di form klaim** punya bagian Berkas polis, di bawah Status premi. Isinya polis induk beserta endorsement dan pembatalannya:
  - urutannya polis induk, endorsement menurut urutan ke-n, lalu pembatalan;
  - polis atau endorsement yang dipilih bertanda Dipilih;
  - tiap baris membuka versi terakhir berkas Polis di tab baru ("Lihat PDF", atau "Lihat berkas" untuk berkas selain PDF), atau menulis Belum diunggah.
- Daftar keluarga polis yang sama tampil baik yang dipilih polis induk maupun endorsement-nya. Renewal tidak ikut karena polisnya berdiri sendiri.
- **Detail klaim:** baris Berkas polis memakai daftar yang sama, menggantikan satu tautan polis yang dipilih saja.
- `lib/claim-policy-files.ts`: `policyFamilyFiles` (urutan dan label) dan `policyFileLinkText`.
- `lib/server/claims.ts`: `ClaimPolicyInfo.policyFiles` menggantikan `policyFile`. Tipe polis dibaca dari kode lookup, jadi tetap benar walau namanya diganti di Master Data.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (3 tes baru), dan `npm run build`: lolos, kecuali 3 tes margin cetak 18 mm di `tests/documents.test.ts` yang sudah gagal di main sejak #236.
- **Uji browser lokal** (build `next start`, sesi admin sementara, DB lokal):
  - **Form Catat Klaim Baru:** memilih SIT/RNW/2026/001-END1 menampilkan Berkas polis dengan dua baris, yaitu Polis SIT/RNW/2026/001 "Lihat PDF (versi 2)" dan Endorsement ke-1 SIT/RNW/2026/001-END1 bertanda Dipilih dengan keterangan Belum diunggah. Tautannya membuka `polis-uji-v2.pdf` (200, application/pdf). Klaim tidak disimpan.
  - **Detail klaim CLM-LCH001/PA/XI/2026:** Polis SIT/PA/2026/001 (Dipilih, "Lihat PDF") dan Endorsement ke-1 (Belum diunggah).
  - Tidak ada error console.

## Catatan untuk yang melanjutkan

- Yang ditampilkan hanya berkas jenis Polis. Premium Note, Commission Note, dan Slip tetap dibuka dari menu Berkas polis di Policy Database.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
