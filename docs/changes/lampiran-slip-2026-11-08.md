# Lampiran file di placing slip

- **Tanggal:** 2026-11-08
- **Branch:** `feat/lampiran-slip`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini Tahap 3 nomor 19 dari analisa 26 contoh slip LCH (6 November 2026).
Beberapa CI LCH merujuk dokumen terlampir yang tidak bisa disimpan di sistem:

- vessel schedule Eng Lee (H&M dan War) dan Patria (contoh 10, 11, 16);
- jadwal unit Equipment All Risks Habco Primatama (14);
- klausul hasil scan container open cover Salam Pacific (17).

Pertanyaan konfirmasi untuk Harry no. 3 (8 November 2026) menanyakan apakah
isi lampiran harus ikut tercetak. Sambil menunggu jawabannya, PR ini memakai
asumsi yang aman: isinya disimpan dan dikirim terpisah bersama PDF slip, dan
yang tercetak hanya daftarnya.

## Yang berubah

- **Form placing slip, bagian baru Lampiran** untuk semua COB, ditempatkan
  sebelum Rate & Premium.
  - Unggah file dengan keterangan opsional, misalnya "Vessel Schedule".
  - Daftar lampiran menampilkan keterangan, nama file, ukuran, dan tanggal.
  - PDF dan gambar punya tombol **Buka**, Excel punya tombol **Unduh**.
  - Hapus lampiran lewat dialog konfirmasi.
  - Lampiran tersimpan langsung saat diunggah, terpisah dari Simpan Draft,
    jadi form tidak berubah menjadi "belum disimpan".
- **Kapan lampiran bisa diubah:**
  - Slip baru: lampiran bisa ditambah setelah draft disimpan.
  - Slip Closed dan Cancelled: terkunci, sama seperti isian slip lainnya.
  - Maksimal 20 lampiran per slip.
- **Jenis file:** PDF, JPG, PNG, WebP, dan **Excel (.xlsx)**, maksimal 4 MB.
  - Excel hanya diterima untuk lampiran slip, karena vessel schedule dan
    daftar unit LCH biasanya berupa workbook.
  - Jenis file dibaca dari isinya. Workbook dikenali dari isi xlsx-nya, jadi
    dokumen Word atau ZIP lain ditolak.
  - Excel selalu diunduh, tidak dibuka di tab browser.
- **Cetakan keempat dokumen slip:** blok **ATTACHMENTS** setelah tanda tangan
  berisi daftar bernomor. Yang tercetak adalah keterangannya, atau nama file
  bila keterangan kosong.
- **Hak akses:** berkas lampiran dibuka dengan hak akses menu Placement.
- **Audit dan pembersihan:**
  - Tambah dan hapus lampiran tercatat di Audit Trail slip.
  - Hapus lampiran dan hapus slip draft ikut menghapus isi berkasnya.
  - Kalau penautan gagal, misalnya slip sudah Closed, berkas yang terlanjur
    diunggah dihapus lagi.
- **Duplikat slip tidak menyalin lampiran.**

## File utama

- `prisma/schema.prisma` dan migrasi `20261108100000_lampiran_slip`: tabel
  `slip_files`.
- `lib/server/slip-files.ts`: unggah, tautkan, hapus, dan audit lampiran.
- `lib/file-types.ts`: pendeteksian jenis file dari isinya, dipindah dari
  `stored-files.ts` dan ditambah Excel.
- `lib/server/stored-files.ts`: purpose `slip_attachment`, dan jenis yang
  diterima per purpose.
- `app/api/files/[id]/route.ts`: Excel dikirim sebagai unduhan.
- `lib/uploads.ts`: pemeriksaan lampiran di browser.
- `app/(app)/underwriting/actions.ts`: `uploadSlipAttachmentAction` dan
  `deleteSlipAttachmentAction`.
- `components/underwriting/slip-attachments.tsx` dan `placing-slip-form.tsx`:
  bagian Lampiran.
- `components/documents/doc-blocks.tsx` dan `slip-documents.tsx`: blok
  ATTACHMENTS.
- `lib/server/placing-slips.ts`: lampiran di detail slip, dan hapus berkas
  saat slip dihapus.
- `tests/file-types.test.ts`.

## Dampak

- **Database:** tabel baru `slip_files`. Data lama tidak berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork. Isi berkas
  tersimpan di database (`stored_files`), sama seperti softcopy polis.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 102 lolos, termasuk dua test baru:
  - jenis file dari isinya: PDF, gambar, dan workbook buatan exceljs dikenali;
    ZIP Word dan teks ditolak;
  - pemeriksaan di browser: Excel tanpa jenis MIME diterima lewat
    ekstensinya.
- `npm run build`: lolos.
- **Uji server lokal** dengan skrip sementara:
  - PDF dan Excel tersimpan dengan jenis yang benar, dan file Word ditolak.
  - Detail slip memuat lampiran.
  - Hapus lampiran ikut menghapus isi berkasnya.
  - Slip Closed menolak lampiran tanpa meninggalkan berkas.
  - Hapus slip draft ikut menghapus berkasnya.
- **Uji browser** dengan sesi login lokal sementara:
  - Unggah Excel dengan keterangan "Daftar Unit" berhasil.
  - Buka PDF mengembalikan 200 (inline), unduh Excel mengembalikan 200
    (attachment).
  - Tombol simpan tetap "Tersimpan".
  - Cetakan Placing Slip mencetak "ATTACHMENTS: 1. Vessel Schedule, 2. Daftar
    Unit".
  - Hapus lewat dialog berhasil.
- Data uji lokal sudah dihapus: 0 slip, 0 lampiran, 0 berkas.

## Catatan untuk yang melanjutkan

- Kalau Harry meminta isi lampiran ikut tercetak, gambar bisa dicetak di
  halaman lampiran. PDF dan Excel tidak bisa digabung lewat cetak browser,
  jadi isinya tetap dikirim terpisah.
- Lampiran belum ikut ke polis. Kalau polis perlu membawa vessel schedule,
  salin saat polis dibuat dari slip.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
