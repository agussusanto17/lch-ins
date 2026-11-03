# Hapus data contoh dari store dan tabel

- **Tanggal:** 2026-11-03
- **Branch:** `fix/hapus-data-contoh-store`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Di produksi, tabel Placement sempat menampilkan 8 slip saat halaman di-refresh,
lalu berganti menjadi 2 slip dari database. Penyebabnya, store sesi di browser
(`lib/store.ts`) masih diisi data contoh dari `lib/data` sejak masa prototipe.
Render server memakai data contoh itu, dan data database baru masuk setelah
halaman tampil.

Data contoh yang sama juga dipakai tanpa terlihat di beberapa tempat lain:
pemilih slip di form polis, pemilih klien di form SPPA, guard hapus klien dan
polis, serta perkiraan nomor slip di dialog release.

## Yang berubah

- Store sesi mulai kosong. `useCollection(key, initial)` memakai daftar dari
  server sampai koleksi dihidrasi, jadi render server, render pertama di
  browser, dan render setelah hidrasi sama. Tabel Placement, Database Klien, dan
  SPPA tidak berkedip lagi.
- Tabel dihidrasi walaupun daftar dari server kosong. Dulu daftar kosong
  dilewati sehingga data contoh tetap tampil.
- Form polis memilih slip dari database (slip berstatus Quoted atau Closed),
  bukan dari store.
- Tombol hapus polis memakai jumlah klaim dari database. Tombol hapus klien
  memakai `isUsedInDocuments` dari database. Server tetap menolak penghapusan
  yang tidak boleh.
- Form SPPA memilih klien dari daftar database yang dikirim halaman.
- Dialog release slip menampilkan perkiraan nomor dari counter database
  (`number_counters`) lewat server action baru `previewSlipNumberAction`.
  Counter tidak dinaikkan. Nomor resmi tetap dibuat saat release.
- Halaman edit dan cetak slip tidak lagi jatuh ke slip contoh kalau id tidak
  ditemukan. Pencarian slip berdasarkan id contoh (`s-001`) di server juga
  dihapus, karena bisa mencocokkan slip asli yang kebetulan bernomor sama.
- Seed otomatis data contoh ke tabel kosong (`seedInitial*IfEmpty`) tidak
  berjalan di produksi.

## File utama

- `lib/store.ts`: store mulai kosong, `useCollection` menerima daftar awal.
- `lib/server/mock-seed.ts`: guard `shouldSeedMockData()` untuk seed contoh.
- `server/services/number-generator.ts`: `previewDocumentNumber` yang hanya
  membaca counter.
- `app/(app)/underwriting/actions.ts`: `previewSlipNumberAction`.
- `lib/server/claims.ts`: `countClaimsByPolicy` untuk guard hapus polis.
- `app/(app)/policies/page.tsx`, `components/policies/*`: slip dan jumlah klaim
  dari server.
- `components/marketing/*`: tabel klien dan SPPA, pemilih klien SPPA.
- `components/underwriting/slip-table.tsx`, `placing-slip-form.tsx`,
  `slip-model.ts`: tabel slip dan dialog release.

## Dampak

- **Database:** tidak ada migrasi. Di produksi, tabel kosong tidak lagi diisi
  data contoh secara otomatis. Dev lokal tetap seperti sebelumnya.
- **Env:** tidak ada.
- **Deploy:** sinkronkan fork setelah merge (`gh repo sync vourdev/lch-ins -b main`).

## Verifikasi

- `npx tsc --noEmit`: lolos.
- `npm run build`: lolos.
- Grep: tidak ada lagi import `SLIPS`, `CLIENTS`, `SPPA`, `POLICIES`, `CLAIMS`,
  atau `slipById` di luar `lib/data` selain seed server yang dijaga guard.

## Catatan untuk yang melanjutkan

- Lonceng notifikasi, Ctrl+K, dan halaman Report masih membaca store. Setelah
  perubahan ini isinya tidak lagi data contoh, tetapi juga belum berisi data
  database (kosong, atau hanya data yang sudah dimuat di tab itu). Perbaikannya
  di PR lanjutan `fix/report-notifikasi-dari-database`.
- Perkiraan nomor di dialog release bisa berbeda dari nomor resmi kalau ada
  slip lain yang di-release lebih dulu. Teks dialog menyebutnya "perkiraan".
- Di halaman detail klien, form SPPA hanya menawarkan klien itu sendiri.
