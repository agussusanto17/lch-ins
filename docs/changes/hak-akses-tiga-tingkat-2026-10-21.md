# Hak akses tiga tingkat sesuai Sheet Hak Akses LCH

- **Tanggal:** 2026-10-21
- **Branch:** `feat/hak-akses-tiga-tingkat`
- **PR:** #23
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Matriks hak akses di `lib/access.ts` sebelumnya adalah tebakan, ditulis saat
modul autentikasi dikerjakan karena LCH belum mengisi sheetnya. LCH mengisi
sheet itu pada 21 Oktober 2026 dan isinya berbeda jauh.

Dua hal yang meleset. Pertama, tebakan itu terlalu ketat: pola jawaban LCH
ternyata "Lihat hampir di semua menu, Kelola hanya di bidang sendiri", jadi
Marketing juga melihat Underwriting, Klaim, dan menu Finance, sementara yang
benar-benar tertutup hanya Jurnal, Laporan keuangan, dan Pengguna.

Kedua, dan ini yang lebih penting, matriks LCH punya **tiga tingkat**
sedangkan kode hanya mengenal dua. `canAccess` cuma memutuskan menu tampil atau
tidak, sehingga begitu sebuah role boleh melihat satu halaman, dia juga bisa
mengubah isinya. Marketing yang seharusnya hanya melihat Underwriting bisa
membuat dan mengubah placing slip.

## Yang berubah

- **`ACCESS_MATRIX` menggantikan `ACCESS_BY_ROLE`.** Isinya 14 menu dikali 6
  role, disalin apa adanya dari sheet LCH. Barisnya ditulis sebagai array
  berurutan, bukan objek, supaya bisa dibandingkan sebaris demi sebaris dengan
  file aslinya.
- **Pencocokan memakai prefix terpanjang.** Master Clauses berada di bawah
  Underwriting tetapi tingkatnya bisa berbeda: Finance mendapat Lihat di
  Underwriting dan Tidak di Master Clauses.
- **`accessLevel`, `canAccess`, dan `canManage`.** Pengguna yang memegang lebih
  dari satu role mendapat tingkat yang paling longgar di antara role-rolenya.
- **`requireManage` di `lib/server/session.ts`** dan dipakai di seluruh Server
  Action yang mengubah data: 9 di Marketing, 24 di Master Data, dan 3 di Master
  Clauses. Halaman tetap memakai `requireAccess`, karena halaman memang boleh
  dibuka oleh role bertingkat Lihat.
- **Path yang belum terdaftar di matriks hanya terbuka untuk Admin**, supaya
  halaman baru tidak otomatis bisa dibuka semua orang.
- Dua menu yang dihapus LCH dari usulan awal, Audit Trail dan Pengaturan,
  dibatasi Admin sampai ada keputusan.

## File utama

- `lib/access.ts`: matriks dan ketiga fungsi pembacanya.
- `lib/server/session.ts`: `requireManage`.
- `app/(app)/marketing/actions.ts`, `app/(app)/master-data/actions.ts`,
  `app/(app)/underwriting/master-clauses/actions.ts`: memakai `requireManage`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos.

Matriksnya dicetak ulang lewat script sementara dan dibandingkan baris per baris
dengan sheet LCH, cocok seluruhnya. Tiga kasus yang rawan ikut diperiksa:
Finance mendapat Tidak di Master Clauses tetapi Lihat di `/underwriting/edit/...`,
gabungan role Marketing dan Placement menghasilkan Kelola di Underwriting tetapi
tetap Tidak di Pengguna, dan path yang belum terdaftar hanya terbuka untuk Admin.

Diuji juga di browser dengan akun role Marketing. Halaman `/underwriting`
terbuka, yang sebelumnya ditolak. Sidebar menampilkan sebelas menu sesuai sheet,
tanpa Jurnal, Laporan keuangan, dan Pengguna. Percobaan menyimpan clause baru
memanggil `saveClauseAction`, terlihat di log dev server, tetapi tidak ada baris
yang masuk ke tabel `clauses`.

## Catatan untuk yang melanjutkan

**Sisi tampilan belum dikerjakan.** Server sudah menolak, tetapi tombol Tambah,
Ubah, Hapus, dan Simpan masih tampil untuk role yang hanya berhak Lihat. Jadi
datanya aman, tetapi penggunanya baru tahu setelah menekan tombol dan menerima
pesan gagal. Langkah berikutnya mengalirkan `canManage` dari server ke komponen
halaman lalu mematikan kontrol itu. Mulai dari Marketing dan Master Clauses,
karena di situ aksinya sudah ada.

**Rencana role gabungan dibatalkan.** Sempat diputuskan membuat satu role
"Marketing & Teknik" supaya tidak perlu tabel penghubung. Ternyata Adi sudah
lebih dulu menambahkan kolom `roles` bertipe array di tabel `users`, yang lebih
sederhana daripada tabel penghubung dan sudah mendukung banyak role per orang.
Jadi role gabungan tidak dibuat, dan Harry serta Aziz cukup diberi dua role.
Catatan di PRD soal role gabungan perlu disesuaikan.
