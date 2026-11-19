# Tanda tangan LCH di cetak Placing Slip, Quotation Slip, dan Closing Instruction

- **Tanggal:** 2026-11-19
- **Branch:** `feat/tanda-tangan-dokumen`
- **PR:** #290
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Permintaan Harry lewat Agus (19 November 2026):

- Cetak Placing Slip, Quotation Slip, dan Closing Instruction memuat tanda tangan LCH.
- Tanda tangannya dikelola dari sistem. Saat dokumen dibuat, pengguna memilih tanda tangan siapa.
- Saat ini ada Rusli dan Sharad, default Rusli. Dokumen juga boleh dicetak tanpa tanda tangan.

Acuan tata letaknya adalah CI bertanda tangan dari LCH (PT Siska Raharja, 7 September 2026). Gambar tanda tangan menimpa cap PT. LCH Insurance Brokers, dan nama penanda tangan tidak dicetak.

## Yang berubah

- **Master Data → Tanda Tangan** (`/master-data/signatures`, akses Master Data, yaitu Admin):
  - **Tambah:** nama dan gambar PNG, JPG, atau WebP, maksimal 2 MB. PNG berlatar transparan disarankan.
  - **Edit:** ubah nama atau ganti gambar. Gambar lama ikut dihapus.
  - **Default:** aksi Jadikan default. Tanda tangan pertama otomatis jadi default. Kalau yang default dihapus, urutan berikutnya menjadi default.
  - **Nama unik:** nama tidak boleh kembar; huruf besar kecil dan spasi di ujung diabaikan.
  - **Audit:** setiap perubahan tercatat di Audit Trail dengan entitas "Tanda Tangan Dokumen".
- **Halaman cetak** Placing Slip, Quotation Slip (termasuk Internal LCH), dan Closing Instruction:
  - **Pilihan:** toolbar punya pilihan "Tanda tangan", berisi nama dari Master Data plus "Tanpa tanda tangan". Default terpilih otomatis.
  - **Posisi:** gambar dicetak di kolom "Disiapkan oleh / Prepared by", di atas garis dan nama perusahaan, setinggi 56 px (sekitar 1,5 cm).
  - **Tata letak tetap:** ruang tanda tangan tingginya sama dengan atau tanpa gambar, jadi pemisahan halaman tidak bergeser.
  - **Siap cetak:** tombol cetak menunggu gambar selesai dimuat.
  - **Tidak disimpan:** pilihan tidak tersimpan di slip. Membuka ulang halaman kembali ke default.
  - **Tanpa daftar:** selama Master Data Tanda Tangan masih kosong, toolbar tidak menampilkan pilihan dan dokumen tercetak seperti sebelumnya.
- **Dokumen lain tidak berubah.** Cover Note, Endorsement Slip, Cancellation Slip, dan cetak endorsement polis tetap mencetak blok tanda tangan kosong.
- **Berkas:** stored_files mendapat purpose baru `signature`.
  - Unggah butuh akses Kelola Master Data.
  - Membuka gambar cukup akses Placement atau Master Data. Semua role yang bisa membuka cetak dokumen penutupan punya akses Placement.

## File utama

- `prisma/schema.prisma` dan migrasi `20261119150000_tanda_tangan_dokumen`: tabel `document_signatories` (nama, nama file, `file_path` ke stored_files, default).
- `lib/server/document-signatories.ts`: daftar, tambah, ubah, jadikan default, hapus, beserta audit.
- `lib/document-signatories.ts`: tipe dan aturan bersama (pilihan awal, urutan, nama kembar).
- `lib/uploads.ts`, `lib/server/stored-files.ts`, `app/api/files/[id]/route.ts`: purpose `signature`, batas 2 MB, jenis gambar saja, menu pembaca tambahan.
- `app/(app)/master-data/actions.ts`, `app/(app)/master-data/signatures/page.tsx`, `components/master-data/signatures-tab.tsx`: halaman Master Data.
- `components/documents/signature.tsx`: pilihan di toolbar, context, dan ruang tanda tangan.
- `components/documents/document-shell.tsx`, `components/documents/doc-blocks.tsx` (`SignatureGrid`), `components/documents/slip-documents.tsx` (blok CI), dan empat halaman cetak di `app/(print)/placement/`.
- `components/layout/nav-items.ts`, `components/layout/app-topbar.tsx`, `components/audit/audit-fields.ts`: menu, breadcrumb, dan label audit.
- `tests/tanda-tangan-dokumen.test.ts` (baru).

## Dampak

- **Database:** migrasi `20261119150000_tanda_tangan_dokumen` membuat tabel `document_signatories`. Migrasi tidak mengisi data awal.
- **Env:** tidak ada.
- **Deploy:** setelah deploy, Admin menambahkan Rusli (default) lalu Sharad di Master Data → Tanda Tangan. Ini dilakukan sekali di demo Vercel dan sekali di VPS, karena database keduanya terpisah. Gambarnya `rusli-sign.png` dan `sharad-sign.png` dari folder dokumen Agus.
  - Gambar sengaja tidak dimasukkan ke migrasi atau repo. Tanda tangan dan cap perusahaan tidak boleh tersimpan di riwayat git dan bundle aplikasi.
  - Di VPS, isi berkas wajib lewat object storage. Trigger `trg_enforce_strict_object_storage` menolak bytea, jadi migrasi SQL berisi gambar akan gagal di sana.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 352 lolos.
  - 4 test baru: pilihan awal, urutan, nama kembar, dan batas jenis serta ukuran gambar.
- **Browser lokal**, sebagai Admin:
  - Rusli dan Sharad ditambahkan dari `rusli-sign.png` dan `sharad-sign.png`. Rusli otomatis default.
  - Uji tambah "Uji Hapus" sebagai default: Rusli lepas default. Saat "Uji Hapus" dihapus, Rusli kembali default dan berkas gambarnya ikut terhapus.
  - Edit Sharad menjadi "rusli" ditolak: "Tanda tangan atas nama rusli sudah ada."
  - Ganti gambar Sharad: berkas lama terhapus, tidak ada potongan unggahan tersisa.
  - Audit Trail mencatat setiap tambah, ubah default, dan hapus.
- **Cetak slip 010/LCH-PLCMT/PS-PAR/XI/2026:**
  - Placing Slip, Quotation Slip, Quotation Slip Internal, dan Closing Instruction menampilkan pilihan dengan Rusli terpilih. Cover Note tidak menampilkan pilihan.
  - Mengganti ke Sharad mengganti gambar.
  - "Tanpa tanda tangan" menghapus gambar, dan tinggi ruangnya tetap 56 px.
  - PDF dari headless Chrome: CI dengan Rusli dan Placing Slip dengan Sharad mencetak gambar di kolom Prepared by. Jumlah halaman sama dengan versi tanpa tanda tangan (3 halaman).
- **Hak akses**, sesi Marketing:
  - gambar tanda tangan dan cetak Placing Slip terbuka (200);
  - Master Data Tanda Tangan tertutup (redirect).
- Sesi uji dihapus sesudahnya.

## Catatan untuk yang melanjutkan

- **Dokumen lain menyusul dengan mudah.** Endorsement Slip, Cancellation Slip, dan cetak endorsement polis memakai `SignatureGrid` yang sama. Supaya ikut punya pilihan tanda tangan, cukup kirim `signatories` dari halaman cetaknya ke dokumen dan `DocumentShell`.
- **Nama penanda tangan tidak dicetak**, mengikuti contoh CI LCH. Nama di Master Data hanya label pilihan.
- **Pilihan tidak disimpan per slip.** Kalau nanti LCH ingin tahu siapa yang menandatangani dokumen tertentu, perlu kolom di slip atau log cetak.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
