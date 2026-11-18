# Detail klaim: co-insurance per asuransi dan centang dokumen terkunci

- **Tanggal:** 2026-11-18
- **Branch:** `feat/detail-klaim-coinsurance-checklist`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (luring, 17 November 2026):
  - **Poin 14:** co-insurance ditampilkan di detail klaim, member juga, bukan hanya leader. Informasi fee tidak perlu tampil. Yang tampil adalah share dari estimasi kerugian.
  - **Poin 15:** saat dokumen klaim di-upload, checkbox otomatis tercentang dan tidak bisa di-uncheck, tapi file tetap bisa diganti dan dilihat.
- Sebelumnya detail klaim dan cetakannya hanya menyebut asuransi leader. Upload file sudah mencentang dokumen, tetapi centangnya masih bisa dilepas.

## Yang berubah

- **Co-insurance (poin 14):**
  - data klaim membawa semua asuransi polis (`Claim.insurers`: nama, share, leader);
  - kalau polis dipegang dua asuransi atau lebih, baris Asuransi di bagian Polis terkait diganti daftar co-insurance. Isinya nama asuransi, Leader/Member, share, dan bagian estimasi kerugian;
  - bagian dihitung dari estimasi kerugian × share. Urutannya leader dulu, lalu share terbesar, dan asuransi terakhir menampung selisih pembulatan, sama seperti ringkasan penutupan;
  - cetakan Lembar Detail Klaim menulis "Penanggung (co-insurance)" dengan baris yang sama, supaya cetakan tetap memuat semua isian detail;
  - polis dengan satu asuransi tampil seperti sebelumnya.
- **Centang dokumen (poin 15):**
  - checkbox dokumen yang sudah punya file dikunci dan diberi keterangan "Sudah ada file, jadi tetap diterima. Ganti file bila perlu.";
  - tombol Ganti dan link Lihat file tetap ada;
  - server ikut menolak pelepasan centang dokumen yang punya file (`toggleClaimDocument`), jadi aturan ini tidak bergantung pada tampilan;
  - dokumen tanpa file, misalnya yang diterima dalam bentuk fisik, tetap bisa dicentang dan dilepas manual.
- Aturannya ada di `lib/claim-detail.ts` (`claimInsurerPortions`, `isCoInsurance`, `documentReceiptLocked`) dan dipakai bersama oleh tampilan, cetakan, dan server.

## File utama

- `lib/claim-detail.ts` (baru)
- `lib/data/types.ts` (`ClaimInsurerShare`, `Claim.insurers`)
- `lib/server/claims.ts`
- `components/claims/claim-detail-sheet.tsx`
- `components/documents/claim-documents.tsx`
- `tests/claim-detail.test.ts` (baru)

## Dampak

- **Database:** tidak ada migrasi. Data asuransi sudah ikut dimuat bersama klaim (`policy.insurers`).
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Perilaku baru:** centang dokumen yang sudah punya file tidak bisa dilepas lagi, baik dari layar maupun lewat server action.

## Verifikasi

- `npx tsc --noEmit` dan eslint file yang berubah: lolos.
- `npx tsx --test tests/claim-detail.test.ts`: 4 tes lolos. Tes memeriksa:
  - urutan leader;
  - pembulatan 33,33 / 33,33 / 33,34;
  - syarat co-insurance;
  - syarat kunci centang.
- **Browser lokal** (port 3002, SIT Admin), klaim CLM-LCH002/MV/XI/2026 dengan estimasi kerugian IDR 15.000.000 pada polis 018/LCH-PLCMT/CI-MV/XI/2026:
  - Polis terkait menampilkan PT Asuransi Astra Buana (Leader, 60,00%) IDR 9.000.000 dan PT Asuransi Sinar Mas (Member, 40,00%) IDR 6.000.000;
  - cetakan detail klaim menampilkan dua baris yang sama;
  - di tab Berkas Dokumen, Salinan SIM Pengemudi dan Foto Kerusakan Fisik Kendaraan (sudah ada file) tercentang dan terkunci, sedangkan dokumen tanpa file tetap bisa dicentang.
- **Server:** `toggleClaimDocument(…, false)` pada Foto Kerusakan Fisik Kendaraan ditolak dengan pesan di atas. Dokumen tidak berubah dan tidak ada audit baru.

## Catatan untuk yang melanjutkan

- Bagian per asuransi memakai estimasi kerugian. Kalau nanti dibutuhkan bagian dari jumlah dibayar (misalnya untuk Partial Settle, MoM poin 9), `claimInsurerPortions` bisa dipakai dengan nilai lain.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
