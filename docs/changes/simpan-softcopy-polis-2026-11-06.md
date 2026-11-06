# Softcopy polis tersimpan di server

- **Tanggal:** 2026-11-06
- **Branch:** `fix/simpan-softcopy-polis`
- **PR:** #151
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

SIT-059 (minggu 4) gagal. Upload softcopy polis dari sheet Softcopy dan dari
form Edit Polis hanya membuat blob URL di memori browser. Tidak ada yang
ditulis ke `policy_files` maupun `stored_files`, jadi versi baru hilang setelah
reload, dan pengguna lain tidak pernah melihatnya. PRD A-17 meminta setiap
upload menambah versi baru, dengan versi lama tetap tersimpan.

## Yang berubah

- Upload softcopy dari sheet Softcopy menyimpan isi berkas di `stored_files`
  (purpose baru `policy_file`). Polis mendapat baris `policy_files` dengan
  versi berikutnya. Versi lama tidak diganti.
- Form Tambah/Edit Polis memakai jalur yang sama setelah polis tersimpan. Kalau
  upload gagal, polis tetap tersimpan dan muncul toast error, lalu pengguna
  bisa mengulang dari sheet Softcopy.
- Berkas dibuka lewat `/api/files/<id>`. Hak aksesnya ikut menu Polis
  (`/policies`).
- Upload memakai aturan yang sama dengan berkas KYC dan dokumen klaim: hanya
  PDF, JPG, PNG, atau WebP, maksimal 4 MB. Petunjuknya tampil di bawah tombol
  upload, dan tombol menampilkan "Mengunggah..." selama proses.
- Setiap upload tercatat di audit log polis sebagai Ubah, dengan field "Versi
  softcopy" dan "Softcopy polis".
- Hapus polis ikut menghapus isi berkas softcopy-nya di `stored_files`.
- Softcopy dari data contoh (nama file saja, tanpa isi) tetap tampil dengan
  label "contoh".
- Penggabungan softcopy sesi browser ke data server dihapus dari Database Polis
  karena tidak dipakai lagi.

## File utama

- `lib/server/policies.ts`: `addPolicyFile` (kunci baris polis dengan
  `FOR UPDATE` supaya nomor versi tidak bentrok), `url` di `toPolicyRecord`,
  dan pembersihan berkas di `deletePolicy`.
- `app/(app)/policies/actions.ts`: server action `uploadPolicyFileAction`.
- `lib/server/stored-files.ts`: purpose `policy_file` dipetakan ke menu
  `/policies`.
- `components/policies/policy-files-sheet.tsx`,
  `components/policies/policy-form.tsx`: upload ke server, validasi tipe dan
  ukuran.
- `components/policies/policy-database.tsx`: data polis langsung dari server.
- `components/audit/audit-fields.ts`: label audit.

## Dampak

- **Database:** tidak ada migrasi. `stored_files.purpose` adalah teks, jadi
  nilai `policy_file` cukup ditambah di kode. `schema.prisma` hanya berubah di
  komentar kolom.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 79 lolos.
- `npx tsc --noEmit` dan `npm run build` lolos.
- Uji di browser (DB lokal, user Teknik):
  - CAR/2026/JKT/0019, yang punya v1 contoh: upload `polis-v1.pdf` menjadi v2,
    lalu `polis-v2.pdf` menjadi v3. Setelah reload, v3, v2, dan v1 masih ada,
    dan kolom Softcopy menampilkan "v3";
  - kedua link `/api/files/...` mengembalikan 200 `application/pdf`;
  - `salah.txt` ditolak dengan pesan "Hanya PDF, JPG, PNG, atau WebP yang bisa
    diunggah.";
  - audit log berisi dua baris Ubah, versi softcopy 1→2 dan 2→3;
  - Edit Polis MV/2026/JKT/0451, pilih file lalu Simpan: v2 tersimpan dengan
    path `stored_files/...`;
  - hapus MV/2026/JKT/0451: baris `stored_files` milik softcopy-nya ikut
    terhapus.

  DB lokal dikembalikan ke kondisi sebelum uji.

## Catatan untuk yang melanjutkan

- Isi berkas disimpan sebelum ditautkan ke polis, sama seperti dokumen klaim
  (PR #124). Kalau penautan gagal, misalnya polis sudah dihapus orang lain,
  baris `stored_files` itu tertinggal tanpa pemilik. Pembersihan berkas yatim
  belum ada untuk semua purpose.
- Belum ada fitur hapus satu versi softcopy. PRD hanya meminta riwayat versi.
- SIT-053 (kop surat Cover Note) tidak diubah di branch ini. User memutuskan
  kop tetap dipakai sesuai PR #88, dan test case di spreadsheet sudah
  disesuaikan.
