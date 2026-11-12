# Audit trail mencatat rincian isi placing slip

- **Tanggal:** 2026-11-13
- **Branch:** `fix/audit-rincian-slip`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Temuan uji PR #240 (13 November 2026):** audit "Ubah" placing slip hanya mencatat nama tertanggung, status, tanggal dokumen, brokerage, PPN, dan additional fee per asuransi. Perubahan rate dan premi, sum insured, deductible, klausul, special conditions, dan isi slip lain tercatat dengan `changes` kosong, jadi Audit Trail hanya menulis "Tidak ada rincian perubahan".
- Banner slip Released dan Quoted di form (PR #232) menyebut setiap perubahan tercatat di Audit Trail, jadi celah ini terlihat oleh LCH.

## Yang berubah

- **Audit "Ubah" placing slip** sekarang juga mencatat ringkasan isi slip sebelum dan sesudah. Hanya isian yang teksnya berubah yang tercatat:
  - **Total nilai pertanggungan** dan **Total premi**, dengan mata uang slip, misalnya "IDR 4.500.000.000" menjadi "IDR 5.000.000.000".
  - **Deductible**, disusun seperti blok DEDUCTIBLE & CONDITIONS di dokumen: judul lokasi, kendaraan, atau objek ("Location 2") bila deductible berbeda per unit, lalu judul section, lalu satu butir per teks.
  - **Special Conditions**.
  - **Klausul**: judul klausul per kelompok seperti CLAUSES di dokumen, yaitu tanpa section, Section 1, dan Section 2, atau judul kelompok seperti "Extensions".
  - **Tanggal mulai** dan **Tanggal berakhir** periode asuransi.
- **Simpan tanpa perubahan isi** tetap tercatat "Ubah" tanpa rincian, tanpa perubahan palsu.
- **Additional fee per asuransi** diurutkan menurut share terbesar, lalu nama asuransi. Share yang sama tidak lagi bisa terbaca berubah hanya karena urutan baris panel.
- **Tidak berubah:**
  - Rate per cover tidak dirinci; perubahan rate terlihat dari Total premi.
  - Wording klausul yang diedit tanpa mengubah judulnya tidak tercatat.
  - Baris audit lama tidak berubah.

## File utama

- `lib/slip-audit.ts` (baru): `slipAuditSummary`, `deductiblesText` (memakai `deductibleGroups`), dan `clausesText`.
- `lib/server/placing-slips.ts`:
  - `updatePlacingSlip` membaca isi slip lengkap sebelum revisi, menyusun isi sesudah revisi dari input seperti yang disimpan, lalu mencatat ringkasan keduanya.
  - `SLIP_RECORD_INCLUDE` menggantikan tiga salinan include record slip (daftar, detail, dan isi sebelum revisi) beserta tipe manualnya.
  - `insertSlipClauses` mengembalikan judul klausul yang disimpan.
- `components/audit/audit-fields.ts`: label isian baru.
- `tests/slip-audit.test.ts`: 9 tes baru.

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Rincian baru berlaku untuk perubahan setelah deploy.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (237 tes, 9 baru), dan `npm run build`: lolos, kecuali 3 tes margin cetak 18 mm di `tests/documents.test.ts`. Ketiganya sudah gagal di `main` sejak #236, tidak terkait perubahan ini.
- **Uji browser lokal** (build `next start`, sesi admin sementara, draft salinan slip 010/LCH-PLCMT/PS-PAR/XI/2026 dua lokasi):
  - Simpan dengan perubahan di luar ringkasan (keterangan periode): audit "Ubah" tanpa rincian.
  - Isi deductible FLEXAS dan FWTWD, nyalakan saklar per lokasi dengan FLEXAS lokasi 2 berbeda, isi special conditions dua baris, pilih tiga klausul (tanpa section, Section 1, Section 2), dan ubah sum insured lokasi 1 dari IDR 3.000.000.000 ke IDR 3.500.000.000.
  - Dialog Audit Trail menampilkan Rincian Perubahan (5): Klausul, Deductible dengan "Location 1" dan "Location 2", Total premi IDR 10.800.000 menjadi IDR 12.000.000, Total nilai pertanggungan IDR 4.500.000.000 menjadi IDR 5.000.000.000, dan Special Conditions.
  - Simpan lagi dengan perubahan di luar ringkasan: tanpa rincian.
  - Tidak ada error console atau server.
- **Sapuan kesetaraan** (skrip sementara, tidak di-commit): 27 slip lokal dari semua COB diduplikasi lalu disimpan ulang tanpa perubahan lewat `updatePlacingSlip`. Tidak ada isian yang tercatat.
- Slip salinan, sesi sementara, dan baris audit uji dihapus setelah uji.

## Catatan untuk yang melanjutkan

- **Ringkasan sesudah** dibentuk dari input seperti yang disimpan: objek tanpa data beserta baris rate miliknya tidak ikut, dan judul klausul diambil dari yang ditulis `insertSlipClauses`. Isian baru di ringkasan harus dibentuk dengan cara yang sama di kedua sisi. Kalau tidak, setiap simpan tercatat sebagai perubahan.
- **Urutan isian** di dialog audit mengikuti urutan kunci JSONB di database, bukan urutan di kode.
- **Uji di database lokal:** timestamp yang ditulis Prisma terbaca 7 jam lebih awal di psql (zona waktu sesi Asia/Jakarta), sedangkan aplikasi menampilkannya benar. Saring baris uji per `entity_id`, bukan per waktu.
- **graphify:** aturan Wajib nomor 4 belum dijalankan. graphify belum terpasang di mesin ini; paket `graphifyy` butuh Python 3.10 ke atas, sedangkan Python sistem 3.9 dan uv atau pipx belum ada.
