# Upload file berkas dokumen klaim

- **Tanggal:** 2026-11-05
- **Branch:** `fix/upload-dokumen-klaim`
- **PR:** #124
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

SIT-065 meminta dokumen klaim bisa diunggah. Tab "Berkas Dokumen" di detail
klaim sebelumnya hanya checklist: nama dokumen dan centang diterima. Kolom
`claim_documents.file_path` sudah ada, tapi belum ada cara mengunggah file,
jadi berkas dari tertanggung tidak tersimpan di sistem.

## Yang berubah

- **Detail klaim, tab Berkas Dokumen:**
  - setiap baris punya tombol "Unggah" (berubah jadi "Ganti" setelah ada
    file) untuk pengguna yang boleh mengelola Klaim;
  - baris yang sudah punya file menampilkan tautan "Lihat file" (tab baru);
  - keterangan jenis dan ukuran file yang diterima tampil di bawah daftar.
- **Upload** memakai penyimpanan berkas yang sama dengan dokumen KYC klien
  (`stored_files`): hanya PDF, JPG, PNG, WebP, maksimal 4 MB, jenis dibaca
  dari isi file. File baru menggantikan file lama, dan file lama dihapus.
- **Centang "diterima" tetap manual.** Upload tidak mencentangnya otomatis,
  karena centang itu yang menentukan tanggal dokumen lengkap.
- **Hak akses:** file klaim (purpose `claim_document`) hanya bisa dibuka
  pengguna yang punya akses menu Klaim.
- **Kebersihan data:** menghapus satu berkas dokumen atau satu klaim ikut
  menghapus file yang tersimpan, jadi tidak ada file yatim.
- **Keamanan:** `updateClaimDocumentAction` tidak lagi menerima `filePath`.
  Path file hanya bisa diubah lewat upload, yang memeriksa bahwa file itu
  diunggah oleh pengguna yang sama untuk keperluan klaim.

## File utama

- `components/claims/claim-detail-sheet.tsx`: tombol Unggah/Ganti, tautan
  Lihat file, input file tersembunyi.
- `app/(app)/claims/actions.ts`: `uploadClaimDocumentFileAction`.
- `lib/server/claims.ts`: `attachClaimDocumentFile`, `fileUrl` di
  `ClaimDocumentRecord`, hapus file saat dokumen atau klaim dihapus.
- `lib/server/stored-files.ts`: purpose `claim_document` dipetakan ke menu
  `/claims`.
- `prisma/schema.prisma`: komentar kolom `stored_files.purpose` saja.

## Dampak

- **Database:** tidak ada migrasi. Kolom `claim_documents.file_path` dan
  tabel `stored_files` sudah ada. Nilai baru `claim_document` di
  `stored_files.purpose` (kolom teks bebas).
- **Env:** tidak ada.
- **Deploy:** setelah merge, sinkronkan fork
  (`gh repo sync vourdev/lch-ins -b main`).

## Verifikasi

- Uji di browser (ego-browser, server lokal, DB lokal):
  - unggah PDF ke "Surat Laporan Klaim Tertulis": tombol jadi "Ganti",
    "Lihat file" membuka `/api/files/<id>` (200, `application/pdf`, inline);
  - reload halaman: file masih ada;
  - ganti file: tautan menunjuk file baru, file lama 404, hanya satu baris
    `stored_files` tersisa;
  - file `.txt` ditolak ("Hanya PDF, JPG, PNG, atau WebP yang bisa
    diunggah."), file 5 MB ditolak ("Ukuran file maksimal 4 MB.");
  - audit log mencatat `documentFile` sebelum dan sesudah;
  - akses `/api/files/<id>` tanpa sesi: 401.
- `npx tsx --test tests/*.test.ts`, `npx tsc --noEmit`, dan `npm run build`
  lolos.

## Catatan untuk yang melanjutkan

- Satu berkas dokumen menyimpan satu file. Kalau LCH perlu beberapa file per
  dokumen (misal banyak foto kerusakan), perlu tabel lampiran terpisah.
- Uji 403 untuk role tanpa akses Klaim belum dijalankan di browser karena
  butuh login role lain. Aturannya sama dengan file KYC klien
  (`purposeMenu` + `canAccess` di `app/api/files/[id]/route.ts`).
- Upload softcopy polis (SIT-059, `components/policies/policy-files-sheet.tsx`)
  masih hanya menyimpan blob URL di sesi browser dan hilang setelah reload.
  Pola upload di catatan ini bisa dipakai untuk memperbaikinya.
