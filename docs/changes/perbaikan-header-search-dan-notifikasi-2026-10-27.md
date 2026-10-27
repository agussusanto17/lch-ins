# Perbaikan Search Bar Header & Fitur Popover Notifikasi Operasional

- **Tanggal:** 2026-10-27
- **Branch:** `fix/header-search-and-notification`
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

1. Saat pengguna mengklik search bar ("Cari apa saja... ⌘K") di header aplikasi, muncul error fallback `"Aplikasi gagal dimuat. Muat ulang halaman. Bila masih gagal, hubungi tim IT."`. Berdasarkan investigasi runtime di browser, penyebab akar adalah komponen `CommandDialog` di `components/ui/command.tsx` langsung merender anak-anaknya di dalam `DialogContent` tanpa pembungkus `<Command>` dari library `cmdk`. Akibatnya, komponen anak (`CommandInput`, `CommandList`, `CommandItem`) gagal mengakses context `useCommandState` dan melempar `Uncaught TypeError: Cannot read properties of undefined (reading 'subscribe')`.
2. Ikon lonceng notifikasi di header topbar sebelumnya merupakan tombol statis tanpa penangan klik atau aksi apa pun, sehingga tidak memberikan umpan balik saat ditekan pengguna.

## Yang berubah

- **Perbaikan Command Palette (`components/ui/command.tsx`)**:
  - Membungkus isi dialog di dalam `<Command>` di dalam `DialogContent` sehingga context cmdk aktif secara penuh.
  - Memindahkan `DialogHeader` (berisi `DialogTitle` dan `DialogDescription` aksesibilitas) ke dalam `DialogContent`.
- **Pengamanan Akses Menu Pencarian (`components/layout/command-menu.tsx`)**:
  - Mengintegrasikan `usePermission()` pada command palette agar menu aksi cepat (seperti "Buat Placing Slip baru", "Tambah klien baru", "Input klaim baru") dan daftar halaman hanya tampil bila pengguna memiliki hak akses kelola/akses yang sesuai.
- **Implementasi Popover Notifikasi Operasional (`components/layout/notification-popover.tsx`)**:
  - Menghubungkan ikon lonceng dengan popover interaktif (`Popover` dari Base UI).
  - Mengagregasi notifikasi operasional riil dari sistem:
    - Polis mendekati jatuh tempo (status Expiring) yang butuh renewal notice.
    - Klaim asuransi berstatus Outstanding yang butuh tindak lanjut.
    - Placing slip berstatus Draft yang siap ditinjau.
  - Menyediakan tombol "Tandai dibaca" untuk membersihkan badge indikator merah dan menyimpan status baca di `localStorage`.
  - Item notifikasi dapat diklik langsung untuk menuju ke halaman terkait (`/marketing/renewal`, `/claims`, `/underwriting`).

## File utama

- `components/ui/command.tsx`: pembungkusan `<Command>` pada `CommandDialog`.
- `components/layout/command-menu.tsx`: integrasi izin RBAC pada command palette.
- `components/layout/notification-popover.tsx`: komponen popover notifikasi operasional.
- `components/layout/app-topbar.tsx`: pemasangan `NotificationPopover` menggantikan tombol statis.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah khusus.

## Verifikasi

- `npx tsc --noEmit`: 0 error (lolos).
- `npm run build`: build Turbopack berhasil tanpa error.
- Pengujian E2E Browser (`ego-browser`):
  - Mengklik tombol search bar membuka palette pencarian tanpa melempar error apa pun.
  - Mengetik "klien" menyaring opsi dengan benar, tombol Escape menutup dialog.
  - Mengklik tombol notifikasi membuka popover dengan daftar notifikasi dan tombol "Tandai dibaca".
  - Mengklik "Tandai dibaca" membersihkan badge unread.
