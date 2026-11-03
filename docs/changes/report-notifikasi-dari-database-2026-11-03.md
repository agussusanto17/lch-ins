# Report dan notifikasi topbar dari database

- **Tanggal:** 2026-11-03
- **Branch:** `fix/report-notifikasi-dari-database`
- **PR:** #83
- **Dikerjakan oleh:** ZoD3V dengan Claude

## Latar belakang

Sebelumnya, halaman Report (`/reports`), popover notifikasi topbar (`NotificationPopover`), dan menu pencarian cepat Ctrl+K (`CommandMenu`) masih membaca data contoh dari store sisi klien (`useCollection`), bukan data riil database. Akibatnya:
1. Angka pada Report tidak mencerminkan data riil database produksi.
2. Notifikasi lonceng menampilkan polis kedaluwarsa dan klaim contoh masa prototipe.
3. Ctrl+K menyarankan Placing Slip contoh alih-alih data slip riil pengguna.

## Yang berubah

- **Server-driven Report:** `app/(app)/reports/page.tsx` diubah menjadi Server Component asinkron yang memuat `listPolicies()` dan `listClaims()` secara paralel, lalu meneruskannya sebagai props ke `ReportView`.
- **Store Hydration Tanpa Kedip:** `ReportView` mengonsumsi props data server melalui `useCollection(key, initial)` dan menghidrasinya secara reaktif.
- **Layanan Topbar RBAC:** Dibuat layanan server baru `lib/server/topbar.ts` (`getTopbarData`) yang membaca data ringkas polis mendekati jatuh tempo, klaim outstanding, slip draft, dan slip terbaru sesuai izin role pengguna (`canAccess`). Modul yang tidak diizinkan tidak dikueri dan datanya tidak dikirim ke browser.
- **Decoupled Topbar Component:** `NotificationPopover` dan `CommandMenu` tidak lagi mengimpor atau membaca koleksi store browser, melainkan menerima data siap saji via props dari `AppTopbar`.
- **Revalidasi Layout:** Mutasi server actions di modul Underwriting, Policies, dan Claims memanggil `revalidatePath("/", "layout")` dan `revalidatePath("/reports")` agar data topbar dan laporan langsung terbarukan setelah perubahan data.

## File utama

- `lib/topbar-types.ts`: Antarmuka tipe data ringkas topbar yang aman dibagi antara server dan client.
- `lib/server/topbar.ts`: Pengambilan data topbar berorientasi hak akses (RBAC) via Prisma.
- `app/(app)/layout.tsx`: Memuat data topbar di Server Component layout dan meneruskannya ke `AppTopbar`.
- `components/layout/app-topbar.tsx`: Meneruskan data topbar ke notifikasi dan command menu.
- `components/layout/notification-popover.tsx`: Menampilkan notifikasi berbasis props database riil.
- `components/layout/command-menu.tsx`: Menampilkan hasil pencarian slip cepat berbasis props data database riil.
- `app/(app)/reports/page.tsx`: Pengambilan data polis dan klaim server-side.
- `components/reports/report-view.tsx`: Menerima props polis dan klaim dari server.
- `app/(app)/underwriting/actions.ts`: Menambahkan revalidasi layout topbar.
- `app/(app)/policies/actions.ts`: Menambahkan revalidasi layout topbar dan reports.
- `app/(app)/claims/actions.ts`: Menambahkan revalidasi layout topbar dan reports.

## Dampak

- **Database:** Tidak ada migrasi atau perubahan skema.
- **Env:** Tidak ada variabel baru.
- **Deploy:** Standar Next.js deploy.

## Verifikasi

- `npx tsc --noEmit` lolos tanpa error.
- Verifikasi E2E via browser lokal dev server:
  - Halaman `/reports` menampilkan agregasi polis dan klaim database riil.
  - Lonceng notifikasi menampilkan item sesuai hak akses role.
  - Shortcut Ctrl+K menampilkan daftar slip riil.

## Catatan untuk yang melanjutkan

- Pengambilan data topbar dibatasi maksimal 5 polis, 4 klaim, 3 draft slip, dan 6 slip terbaru agar respons layout tetap instan.
- LocalStorage tetap digunakan untuk menyimpan id notifikasi yang sudah ditandai telah dibaca oleh pengguna.
