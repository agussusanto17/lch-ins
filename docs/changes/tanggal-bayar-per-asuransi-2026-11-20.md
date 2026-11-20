# Tanggal bayar klaim per asuransi

- **Tanggal:** 2026-11-20
- **Branch:** `feat/tanggal-bayar-per-asuransi`
- **PR:** #295
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus, 20 November 2026, dengan contoh klaim polis co-insurance 50013026001304 (8 asuransi): "Untuk polis co-insurance tambahkan kolom input tanggal bayar klaim masing-masing asuransi, untuk melihat review seberapa cepat asuransinya bayar klaim".

Sebelumnya klaim hanya punya Tanggal LOD ke Asuransi dan batas bayar 30 hari (catatan `tanggal-lod-klaim-2026-11-19.md`). Tidak ada tanggal asuransi membayar, jadi kecepatan bayar tidak bisa dilihat. Pada co-insurance, tiap asuransi membayar bagiannya sendiri-sendiri.

## Yang berubah

- **Form klaim, bagian Status & Penanganan Dokumen:** di bawah Tanggal LOD ada tanggal bayar per asuransi polis.
  - **Co-insurance:** satu isian per asuransi, berlabel nama, Leader/Member, dan share. Urutannya leader dulu, lalu share terbesar.
  - **Polis satu asuransi:** satu isian Tanggal Bayar Asuransi. Ini sengaja ikut dibuat supaya review kecepatan bayar mencakup semua klaim, bukan hanya co-insurance.
  - **Keterangan di bawah isian:** kecepatan bayar, misalnya "26 hari sejak LOD" atau "39 hari sejak LOD, lewat 9 hari dari batas bayar".
  - **Validasi:** tanggal bayar tidak boleh mendahului tanggal kejadian. Form dan server sama-sama mengecek.
  - **Ganti polis di form** mengosongkan tanggal bayar.
- **Detail klaim:**
  - **Daftar co-insurance:** tiap asuransi menampilkan "Dibayar {tanggal} · N hari sejak LOD". Yang lewat batas berwarna kuning.
  - **Asuransi yang belum membayar:** tertulis "Belum dibayar". Bila batas bayarnya sudah lewat dan klaim masih berjalan, ada tanda merah "Lewat N hari".
  - **Timeline** mendapat langkah terakhir "Dibayar asuransi". Co-insurance dianggap lunas setelah semua asuransi membayar, pada tanggal bayar terakhir. Sebelum lunas tertulis "1 dari 2 asuransi sudah membayar".
  - **Tanda "Lewat N hari" di tanggal LOD** tidak muncul lagi bila semua asuransi sudah membayar, walau statusnya belum diubah (`lodDaysOverdue`).
- **Cetak detail klaim:**
  - tanggal bayar tercetak di baris tiap asuransi co-insurance;
  - baris baru "Dibayar Asuransi" di bagian Status & Kronologi.
- **Audit Trail:** perubahan tanggal bayar tercatat sebagai "Tanggal bayar per asuransi", satu baris per asuransi.
- **Report Statistik Klaim:**
  - **Sheet Ringkasan, tabel baru "Kecepatan bayar per asuransi"**, dihitung per asuransi termasuk anggota co-insurance. Kolomnya:
    - klaim dibayar;
    - rata-rata hari sejak lapor;
    - dibayar dengan tanggal LOD;
    - rata-rata hari sejak LOD;
    - tercepat dan terlama;
    - dibayar lewat 30 hari;
    - belum dibayar padahal batasnya lewat.
  - **Sheet Daftar Klaim, kolom baru "Paid Date per Insurer / Tanggal Bayar per Asuransi"** sesudah Batas Bayar Asuransi. Kolom Status Klaim dan sesudahnya bergeser satu kolom.

## File utama

- `prisma/schema.prisma` dan migrasi `20261120120000_tanggal_bayar_klaim_per_asuransi`: tabel `claim_insurer_payments`, satu baris per klaim per asuransi yang sudah membayar.
- `lib/server/claims.ts`:
  - `saveInsurerPaidDates` menyimpan tanggal saat klaim dibuat atau diubah;
  - `insurerShares` membaca tanggal bayar per asuransi untuk record klaim dan pilihan polis form.
- `lib/claim-detail.ts`: `payingInsurers`, `claimPaymentProgress`, `paymentSpeed`, `paymentSpeedText`, dan `lodDaysOverdue` yang memperhitungkan pembayaran.
- `lib/claim-statistics.ts` dan `lib/server/claim-statistics.ts`: `insurerPaymentSpeed`, tabel Ringkasan, dan kolom Daftar Klaim.
- `components/claims/claim-form.tsx`, `components/claims/claim-detail-sheet.tsx`, dan `components/documents/claim-documents.tsx`: tampilan.
- `app/(app)/claims/actions.ts`, `lib/data/types.ts`, dan `components/audit/audit-fields.ts`.
- `tests/tanggal-bayar-per-asuransi.test.ts` (baru). `tests/claim-statistics.test.ts` dan `tests/tanggal-lod-klaim.test.ts` disesuaikan dengan kolom baru.

## Dampak

- **Database:** migrasi `20261120120000_tanggal_bayar_klaim_per_asuransi` menambah tabel `claim_insurer_payments`.
  - Kolomnya `claim_id`, `insurer_id`, dan `paid_date`, unik per klaim dan asuransi.
  - Baris ikut terhapus bila klaimnya dihapus.
  - Data lama tidak berubah. Klaim lama belum punya tanggal bayar sampai diisi.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 375 lolos, termasuk 5 test baru:
  - kecepatan bayar dan batas 30 hari;
  - co-insurance lunas setelah semua asuransi membayar;
  - `lodDaysOverdue` dengan pembayaran sebagian dan penuh;
  - tabel kecepatan bayar per asuransi;
  - kolom Daftar Klaim dan catatan bila belum ada pembayaran.
- **Browser lokal**, klaim uji di polis co-insurance PAR (Astra Buana 60% leader, Sinar Mas 40%), LOD 10 Oktober 2026:
  - **Form:** isian per asuransi muncul setelah polis dipilih. Tanggal bayar sebelum tanggal kejadian ditolak.
  - **Simpan Astra 5 November, Sinar Mas kosong:** detail menampilkan "Dibayar 05 Nov 2026 · 26 hari sejak LOD", Sinar Mas "Belum dibayar" dengan "Lewat 11 hari", dan timeline "1 dari 2 asuransi sudah membayar".
  - **Edit Sinar Mas 18 November:** detail menampilkan "39 hari sejak LOD, lewat 9 hari dari batas bayar". Timeline "Dibayar asuransi 18 Nov 2026", dan tanda lewat batas di LOD hilang.
  - **Audit Trail:** sebelum dan sesudah tanggal bayar per asuransi.
  - **Cetak detail klaim:** tanggal bayar per asuransi dan baris Dibayar Asuransi.
  - **Statistik Klaim dari data lokal:** Astra 26 hari dan Sinar Mas 39 hari sejak LOD, 1 dibayar lewat 30 hari.
- Klaim uji, audit-nya, counter nomor klaim PAR, dan sesi uji dihapus sesudahnya.

## Catatan untuk yang melanjutkan

- **Tanggal LOD satu per klaim.** Kecepatan bayar tiap asuransi dihitung dari tanggal yang sama. Kalau LOD ke tiap asuransi co-insurance dikirim di tanggal berbeda, perlu tanggal LOD per asuransi.
- **Nilai yang dibayar per asuransi** masih dihitung dari share (`claimInsurerPortions`), belum dicatat per asuransi. Pembayaran parsial satu asuransi, misalnya dicicil, belum bisa dicatat.
- **Status klaim tidak berubah otomatis** walau semua asuransi sudah membayar. Settled tetap dipilih manual karena mengunci klaim.
- **Asuransi yang dihapus dari polis:** tanggal bayarnya ikut terhapus saat klaim disimpan berikutnya. Sampai klaim disimpan, tanggal itu tidak tampil karena tampilan mengikuti asuransi polis.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
