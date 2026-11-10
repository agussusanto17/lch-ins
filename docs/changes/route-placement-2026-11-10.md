# Route menu Placement: /underwriting menjadi /placement

- **Tanggal:** 2026-11-10
- **Branch:** `feat/route-placement`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Permintaan Agus, 10 November 2026: alamat menu Placement diganti dari `https://lch-ins.vercel.app/underwriting` menjadi `https://lch-ins.vercel.app/placement`, supaya sama dengan nama menunya.

## Yang berubah

- **Folder route:**
  - `app/(app)/underwriting` menjadi `app/(app)/placement`.
  - `app/(print)/underwriting` menjadi `app/(print)/placement`.
  - Semua halaman ikut pindah: daftar, buat, edit, quotation, closing, Master Clauses, dan dokumen PS/QS/CN/CI.
- **Semua tautan dan pemeriksaan akses** memakai `/placement`:
  - menu sidebar, command menu, breadcrumb, notifikasi, Akses Cepat Dashboard;
  - tombol di form slip dan Policy Database;
  - `revalidatePath`;
  - `requireManage` dan `canManage`;
  - baris `ACCESS_MATRIX` (`/placement`, `/placement/master-clauses`);
  - menu akses berkas lampiran slip (`stored-files`).
- **Alamat lama dialihkan** di `next.config.ts`: `/underwriting` dan `/underwriting/:path*` diteruskan ke `/placement/:path*` (redirect permanen). Bookmark dan tautan lama, misalnya di naskah demo, tetap jalan.
- **Folder komponen `components/underwriting` tidak diubah**, karena itu nama internal, bukan alamat.

## File utama

- `app/(app)/placement/**`, `app/(print)/placement/**` (dipindah dengan `git mv`).
- `next.config.ts`: pengalihan alamat lama.
- `lib/access.ts`, `lib/server/stored-files.ts`, `lib/server/topbar.ts`.
- `components/layout/*`, `components/underwriting/*`, `components/documents/slip-documents.tsx`, `components/dashboard/dashboard-view.tsx`, `components/marketing/*`.
- `app/(app)/marketing/actions.ts`, `app/(app)/master-data/actions.ts`, `app/not-found.tsx`.
- `tests/access.test.ts`, `tests/closing-instruction.test.ts`.

## Dampak

- **Database:** tidak ada. Tidak ada kolom yang menyimpan alamat halaman.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi. Setelah deploy, alamat lama otomatis dialihkan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint app components lib tests next.config.ts --quiet`, `npx tsx --test tests/*.test.ts` (161 tes), dan `npm run build` dari `.next` kosong: lolos. Build menampilkan route `/placement/*`.
- **Uji browser lokal** (Playwright dan Chrome, sesi sementara):
  - **Admin:**
    - `/underwriting`, `/underwriting/edit/<id>`, `/underwriting/closing/<id>`, dan `/underwriting/master-clauses` dialihkan ke `/placement/…` dan halamannya terbuka.
    - Halaman Placement tidak punya tautan ke `/underwriting`.
  - **Marketing:** daftar dan dokumen terbuka. Halaman edit dialihkan ke daftar (hanya Lihat), dan Master Clauses tetap tertutup (khusus Admin), sama seperti sebelumnya.
- Tidak ada error di console browser.

## Catatan untuk yang melanjutkan

- Catatan perubahan lama di `docs/changes/` tetap menulis `/underwriting`, karena itu riwayat.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
