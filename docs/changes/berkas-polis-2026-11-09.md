# Berkas polis: Polis, Premium Note, Commission Note, sampai 25 MB

- **Tanggal:** 2026-11-09
- **Branch:** `feat/berkas-polis`
- **PR:** [#195](https://github.com/agussusanto17/lch-ins/pull/195)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Permintaan 9 November 2026 untuk bagian Softcopy Polis di form polis:
  - isinya tiga berkas: **Polis**, **Premium Note**, dan **Commission Note**;
  - batas 4 MB per berkas masih kurang dan perlu dinaikkan.
- Batas 4 MB sengaja dipasang di bawah batas request Vercel: body request
  di atas 4,5 MB ditolak dengan `413 FUNCTION_PAYLOAD_TOO_LARGE`. Menaikkan
  angkanya saja akan membuat upload besar gagal di demo.
- Response di Vercel juga dibatasi 4,5 MB, kecuali response yang dikirim
  sebagai stream.

## Yang berubah

- **Tiga jenis berkas polis.**
  - `policy_files.kind` (enum `PolicyFileKind`: `Policy`, `PremiumNote`,
    `CommissionNote`).
  - Versi dihitung per jenis. Berkas yang sudah ada menjadi jenis Polis.
- **Form polis**, bagian **Berkas Polis**:
  - tiga baris pemilih file: Polis, Premium Note, Commission Note;
  - tiap baris menampilkan versi terakhir yang tersimpan;
  - saat Simpan, berkas yang dipilih diunggah satu per satu dengan
    persentase di toast;
  - berkas yang gagal tidak membatalkan polis, dan bisa diunggah ulang dari
    menu Berkas polis.
- **Sheet Berkas Polis** (dulu Softcopy Polis): tiga bagian dengan riwayat
  versi dan tombol upload masing-masing.
- **Daftar polis:**
  - menu aksi "Softcopy (N versi)" menjadi "Berkas polis";
  - kolom Softcopy menjadi **Berkas**, berisi jumlah jenis yang sudah ada,
    misalnya 2/3. Rinciannya muncul saat di-hover.
- **Batas berkas polis 25 MB.** Berkas KYC, klaim, dan lampiran slip tetap
  4 MB.
- **Upload per potongan** (berlaku untuk berkas polis):
  - browser mengirim potongan 3 MB (`uploadFilePartAction`) ke tabel
    sementara `upload_parts`;
  - server menggabungkannya menjadi satu `stored_files`
    (`completeFileUploadAction`), dengan pemeriksaan jenis dan ukuran yang
    sama seperti sebelumnya;
  - berkas itu lalu ditautkan ke polis (`attachPolicyFileAction`).
  - Alurnya sama di Vercel dan VPS. Di VPS, hasil gabungan tetap masuk object
    storage.
  - Potongan dihapus setelah digabung, berhasil atau tidak.
  - Sisa unggahan yang tidak selesai dibersihkan setelah sehari.
  - Satu pengguna maksimal punya 30 potongan tertunda (sekitar 3 berkas
    25 MB).
- **Unduhan dari database dikirim sebagai stream** per 1 MB, supaya berkas
  di atas 4,5 MB tetap bisa dibuka di demo Vercel.
- **Audit:** upload berkas polis mencatat jenis berkasnya ("Jenis berkas
  polis").

## File utama

- `prisma/schema.prisma` dan migrasi `20261109210000_berkas_polis_unggah_besar`.
- `lib/uploads.ts`: batas per pemakaian, ukuran potongan, `joinUploadParts`.
- `lib/server/upload-parts.ts`, `app/(app)/uploads/actions.ts`,
  `lib/upload-client.ts`: upload per potongan.
- `lib/server/stored-files.ts`: `saveUploadedBytes`.
- `lib/policy-files.ts`: jenis berkas dan versi terakhir.
- `lib/server/policies.ts` dan `app/(app)/policies/actions.ts`
  (`attachPolicyFileAction` menggantikan `uploadPolicyFileAction`).
- `components/policies/policy-form.tsx`, `policy-files-sheet.tsx`,
  `policy-database.tsx`.
- `app/api/files/[id]/route.ts`: unduhan stream.
- `tests/policy-files-upload.test.ts`.

## Dampak

- **Database:**
  - enum baru `PolicyFileKind`;
  - kolom `policy_files.kind` (bawaan `Policy`); unique key menjadi
    (policy_id, kind, version);
  - tabel baru `upload_parts`.
- **Penyimpanan:** berkas polis bisa sampai 25 MB. Di demo Vercel isinya
  masuk database (bytea), di VPS masuk object storage.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan otomatis saat build, di Vercel dan VPS.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 144 lolos, termasuk 4 test baru
  (penggabungan potongan, batas per pemakaian, versi per jenis).
- **Uji browser lokal** (Playwright dengan Chrome, sesi login sementara),
  polis SIT/RNW/2026/001 dengan PDF sintetis:
  - form Edit polis mengunggah Polis 40 KB, Premium Note 10 MB, dan
    Commission Note 60 KB dalam 8,8 detik, tanpa error;
  - database berisi tiga baris v1 dengan jenis dan ukuran yang benar, dan
    `upload_parts` kosong lagi;
  - Premium Note 10 MB dibuka lewat `/api/files/<id>`: HTTP 200, 10.486.444
    byte, isinya sama dengan file asli;
  - kolom Berkas berubah dari Upload menjadi 3/3 dengan rincian versi;
  - sheet menampilkan tiga bagian; versi baru Polis tersimpan sebagai v2,
    dan Commission Note v2 juga;
  - file 26 MB ditolak sebelum dikirim: "Ukuran file maksimal 25 MB.";
  - audit mencatat jenis berkas "Commission Note";
  - tampilan form di layar 390 px rapi;
  - tanpa error halaman.
- **Uji fungsi server langsung:** potongan ke-31 yang tertunda ditolak;
  potongan ketiga berkas KYC ditolak karena batas 4 MB; unggahan yang tidak
  lengkap ditolak dan potongannya dihapus.
- Berkas uji dan sesi sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- Berkas KYC, dokumen klaim, dan lampiran slip masih 4 MB lewat satu
  request. Kalau perlu lebih besar, pakai `uploadInParts` dari
  `lib/upload-client.ts`, lalu naikkan batasnya di `maxUploadBytes`.
- Upload per potongan berjalan berurutan. Di koneksi 10 Mbps, berkas 25 MB
  butuh sekitar 20 detik.
- Test case SIT yang menyebut "Softcopy" polis perlu menyesuaikan nama dan
  tiga jenis berkas.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
