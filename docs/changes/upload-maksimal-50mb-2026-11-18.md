# Maksimal upload 50 MB di semua modul

- **Tanggal:** 2026-11-18
- **Branch:** `feat/upload-50mb`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Marketing/KYC, Klaim, dan lampiran slip sebelumnya menerima maksimal 4 MB per file dan
mengirim satu file dalam satu Server Action. Berkas Polis sudah memakai upload bertahap,
tapi maksimal 25 MB. User meminta batas 50 MB di semua modul dan di VPS.

## Yang berubah

- Semua jenis berkas punya batas total 50 MiB (50 MB tampilan), termasuk file polis.
- KYC, berkas klaim, lampiran slip, dan berkas polis semuanya memakai transport upload
  bertahap 3 MiB yang sudah dipakai Policy Database. File 50 MiB dikirim dalam 17 request.
- Server tetap memeriksa ukuran total, urutan dan kelengkapan potongan, jenis file dari
  isi berkas, purpose dan pemilik sebelum file ditautkan ke record.
- File staged dibersihkan bila gagal ditautkan; file yang sudah dipakai tidak dihapus.
- Kompresi foto pada KYC, Klaim, dan lampiran slip tetap berjalan sebelum pemeriksaan
  batas. Excel tetap hanya diterima untuk lampiran slip.
- Batas potongan tertunda menjadi 51 per pengguna, cukup untuk sekitar tiga file 50 MiB.
  Ini batas agregat, bukan reservasi atomik per upload.
- Ukuran satu request tetap 3 MiB + multipart. `bodySizeLimit` Next 5 MB dan batas Nginx
  VPS yang terdokumentasi 25 MB tidak dinaikkan. Batas 50 MB berlaku pada total file,
  bukan satu request.

## File utama

- `lib/uploads.ts`: batas, pesan, dan petunjuk ukuran.
- `lib/upload-client.ts`, `app/(app)/uploads/actions.ts`, `lib/server/upload-parts.ts`:
  transport bertahap dan perakitan di server.
- `components/marketing/client-form.tsx`, `components/claims/claim-detail-sheet.tsx`,
  `components/underwriting/slip-attachments.tsx`: KYC, klaim, dan slip memakai transport
  bertahap.
- `app/(app)/marketing/actions.ts`, `app/(app)/claims/actions.ts`,
  `app/(app)/placement/actions.ts`, `lib/server/stored-files.ts`: validasi owner/purpose,
  penautan dan cleanup.
- `components/policies/policy-form.tsx`, `components/policies/policy-files-sheet.tsx`:
  batas Policy Database disamakan ke 50 MiB.
- `tests/policy-files-upload.test.ts`, `tests/file-types.test.ts`: batas, chunking dan
  jenis file.

## Dampak

- **Database:** tidak ada migrasi; tabel `upload_parts` yang ada dipakai untuk potongan.
- **Env:** tidak ada.
- **Deploy:** tidak perlu mengubah Nginx atau limit request. Setelah PR disetujui dan
  dideploy, uji upload mendekati 50 MB dari tiap modul di VPS. VPS memakai config Next
  dalam image dan tetap menerima potongan kecil.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npx eslint` pada file yang berubah: lolos tanpa warning.
- `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 283 test lolos.
- Browser lokal:
  - KYC PDF 50 MiB terunggah ke storage, tautan buka berkas mengembalikan `application/pdf`;
  - KYC 50 MiB + 1 byte ditolak dengan pesan maksimal 50 MB;
  - dokumen klaim dan lampiran slip masing-masing menerima PDF 5 MiB dan tertaut dengan benar.
- Semua data dan file uji lokal dihapus. Hitungan `upload_parts` untuk user uji kembali 0.
- Uji file 50 MiB di VPS menunggu PR disetujui, di-merge, dan dideploy.

## Catatan untuk yang melanjutkan

- Unggahan 50 MiB dipecah menjadi 17 bagian 3 MiB (bagian terakhir lebih kecil).
- Berkas upload parts disimpan sementara di database, kemudian dibaca dan dirakit di
  memori. Awasi kapasitas DB dan memori saat banyak penyelesaian upload berjalan bersamaan.
- `MAX_PENDING_UPLOAD_PARTS` membatasi jumlah potongan tertunda per pengguna; tidak menjamin
  upload baru memperoleh slot khusus.
- Catatan perilaku sebelumnya: `berkas-polis-2026-11-09.md`,
  `kompres-gambar-upload-2026-11-13.md` dan `dockerfile-next-config-2026-11-13.md`.
