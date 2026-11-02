# Status notifikasi dibaca tanpa hydration mismatch

- **Tanggal:** 2026-11-02
- **Branch:** `fix/notifikasi-dibaca-hydration`
- **PR:** #73
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Repo `agussusanto17/lch-ins` tertinggal satu commit dari fork
`vourdev/lch-ins`: `ea4f99f` (31 Oktober), yang langsung di-commit ke `main`
fork. Commit itu memperbaiki error ESLint di popover notifikasi dengan membaca
ID notifikasi yang sudah dibaca dari `localStorage` lewat lazy initializer
`useState`.

Cara itu menimbulkan masalah baru. Di server `localStorage` tidak ada, jadi
server merender semua notifikasi sebagai belum dibaca, sedangkan render pertama
di browser sudah memakai isi `localStorage`. Untuk user yang pernah membaca
notifikasi, titik merah di lonceng dan `aria-label` jumlah belum dibaca
berbeda antara server dan browser, sehingga React melaporkan hydration
mismatch.

Perubahan ini membawa perbaikan ESLint itu ke repo utama dengan cara yang
aman, supaya kedua repo kembali sama.

## Yang berubah

- Status dibaca dibaca dari `localStorage` lewat `useSyncExternalStore`.
  Snapshot server `null`, jadi markup hasil hydration sama dengan server, lalu
  status dari `localStorage` langsung menyusul.
- Menandai notifikasi dibaca (satu per satu atau semua) menulis ke
  `localStorage` lalu memberi tahu komponen, tanpa `useEffect` dan tanpa
  `setState` di dalam effect, sehingga ESLint tetap bersih.
- Status dibaca ikut berubah kalau tab lain mengubahnya (event `storage`).

## File utama

- `components/layout/notification-popover.tsx`: baca dan tulis status dibaca.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** setelah merge, `gh repo sync vourdev/lch-ins -b main`. Fork
  sudah berisi `ea4f99f`, jadi sinkronisasi membuat merge commit seperti
  biasa; isi file mengikuti versi baru ini.

## Verifikasi

- `npx eslint components/layout/notification-popover.tsx`: tidak ada masalah.
- `npx tsc --noEmit`: hanya 4 error lama di `lib/server/stored-files.ts`
  karena Prisma client lokal belum di-generate ulang.
- Belum diuji di browser karena dev server lokal sedang tidak berjalan. Yang
  perlu dicek: tandai notifikasi dibaca, reload, lalu pastikan titik merah
  sesuai dan konsol tidak menampilkan hydration error.

## Catatan untuk yang melanjutkan

- Kalau penulisan ke `localStorage` gagal (storage diblokir), status dibaca
  tidak tersimpan dan notifikasi tetap tampil belum dibaca. Sebelumnya status
  itu bertahan selama halaman terbuka.
- Pola yang sama sudah dipakai di `hooks/use-mobile.ts` dan
  `components/documents/printed-at.tsx`.
