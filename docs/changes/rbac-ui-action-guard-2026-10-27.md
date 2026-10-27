# Proteksi Aksi Antarmuka (UI Action Guard) Berbasis Peran RBAC

- **Tanggal:** 2026-10-27
- **Branch:** `feat/rbac-ui-action-guard`
- **PR:** # (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Claude Code

## Latar belakang

Berdasarkan dokumen Analisis & Evaluasi Role-Based Access Control (RBAC) tanggal 24 Oktober 2026 dan matriks hak akses resmi LCH (`lib/access.ts`), terdapat sejumlah menu di mana peran tertentu memiliki hak akses baca-saja (`lihat`), misalnya:
- Marketing pada Menu Master Clauses (`/underwriting/master-clauses`), Underwriting (`/underwriting`), Policy Database (`/policies`), Master Data (`/master-data`), dan Klaim (`/claims`).
- Klaim pada Marketing (`/marketing`), Underwriting (`/underwriting`), Policy Database (`/policies`), dan Master Data (`/master-data`).
- Finance dan Accounting pada Underwriting (`/underwriting`), Policy Database (`/policies`), dan Master Data (`/master-data`).

Sebelumnya, proteksi hanya aktif pada level middleware dan server action: tombol mutasi (tambah, ubah, hapus, dan toggle status) masih muncul di UI, dan ketika ditekan baru memunculkan toast error penolakan server action. Kebutuhan operasional LCH menghendaki agar antarmuka bersih: elemen aksi mutasi disembunyikan total di tahap UI ketika peran pengguna berstatus `lihat`, formulir detail dibuka dalam mode read-only (input non-aktif, tombol simpan tidak tampil), dan navigasi URL langsung ke rute pembuatan/pengubahan dialihkan secara otomatis.

## Yang berubah

1. **Permission Provider & Hook Client (`components/auth/permission-provider.tsx`):**
   - Membuat context provider `PermissionProvider` yang menerima daftar peran pengguna (`user.roles`) dari layout server `app/(app)/layout.tsx`.
   - Menyediakan hook `usePermission()` dengan utilitas `canManage(path)`, `canAccess(path)`, dan `accessLevel(path)` berbasis `lib/access.ts` untuk pengecekan cepat di seluruh komponen klien.

2. **Proteksi Master Clauses (`/underwriting/master-clauses`):**
   - Menyembunyikan tombol "+ Tambah Clause" di header halaman jika pengguna tidak memiliki izin kelola.
   - Mengubah aksi baris tabel dari pensil (Edit) menjadi ikon mata (Lihat detail) saat berstatus `lihat`.
   - Mengubah form klausa (`ClauseForm`) dan editor teks (`RichTextEditor`) menjadi read-only jika pengguna hanya memiliki hak `lihat`, serta menyembunyikan tombol simpan.
   - Mengalihkan navigasi URL langsung `/underwriting/master-clauses/new` kembali ke `/underwriting/master-clauses`.

3. **Proteksi Underwriting Slip & Quotation (`/underwriting`):**
   - Menyembunyikan tombol "Buat Placing Slip" di header halaman bagi pengguna berstatus `lihat`.
   - Menyaring aksi baris pada daftar placing slip (`SlipTable`) sehingga aksi mutatif ("Edit slip", "Draft quotation", "Duplikat slip", "Hapus slip", "Batalkan slip") disembunyikan dan hanya menyisakan aksi inspeksi dokumen ("Lihat slip", "Softcopy wording", "Lihat wording").
   - Memproteksi rute server `/underwriting/new`, `/underwriting/edit/[id]`, dan `/underwriting/quotation/edit/[id]` dengan pengalihan otomatis ke `/underwriting` jika tidak memiliki izin kelola.

4. **Proteksi Modul Marketing (`/marketing` & detail klien):**
   - Menyembunyikan tombol "Tambah Klien" di header modul dan tombol "Buat SPPA" di tab SPPA jika bukan pemegang akses `kelola` Marketing.
   - Menyembunyikan aksi baris mutasi klien (Edit, Nonaktifkan, Hapus) dan mutasi SPPA (Edit, Ubah Status, Hapus) pada tabel.
   - Pada halaman detail klien (`/marketing/clients/[id]`), tombol "Edit KYC" hanya muncul bagi pengelola Marketing, tombol "Buat Placing Slip" hanya muncul bagi pengelola Underwriting, dan tautan nomor slip diarahkan ke pratinjau dokumen jika tidak berhak mengubah slip.

5. **Proteksi Master Data (`/master-data`):**
   - Menyembunyikan tombol "Tambah Merek/Tipe", "Tambah COB", "Tambah Sub-Cover", "Tambah Klasifikasi OJK", "Tambah Asuransi/Adjuster", "Tambah Rekening Bank", dan "Tambah Pilihan Baru" pada semua tab Master Data.
   - Menyembunyikan kolom "Aksi", tombol edit, tombol hapus, dan sakelar status (`Switch`) di semua tabel bagi pengguna baca-saja.

6. **Proteksi Policy Database (`/policies`):**
   - Menyembunyikan tombol "Tambah Polis" di header jika pengguna tidak berhak mengelola polis.
   - Menyaring aksi baris sehingga opsi "Edit polis", "Buat renewal", "Buat endorsement", dan "Hapus polis" disembunyikan, menyisakan opsi inspeksi berkas softcopy.
   - Menyembunyikan kontrol form upload versi softcopy baru pada lembar `PolicyFilesSheet`.

7. **Proteksi Klaim (`/claims`):**
   - Menyembunyikan tombol "Catat Klaim Baru" pada header dan menyaring aksi baris tabel hanya menyisakan tombol "Detail".
   - Pada lembar detail klaim (`ClaimDetailSheet`), menyembunyikan tombol "Edit Klaim", menonaktifkan centang kelengkapan dokumen, serta menyembunyikan form dan tombol hapus dokumen maupun catatan follow-up.

## File utama

- `components/auth/permission-provider.tsx`: Context provider dan hook `usePermission()` untuk pengecekan hak akses di client components.
- `app/(app)/layout.tsx`: Pemasangan `PermissionProvider` membungkus seluruh konten aplikasi dengan peran user aktif.
- `components/underwriting/master-clauses.tsx`, `clause-form.tsx`, `rich-text-editor.tsx`: Penyembunyian tombol tambah, penyesuaian ikon aksi ke mata, dan mode formulir baca-saja.
- `app/(app)/underwriting/page.tsx`, `slip-table.tsx`, `new/page.tsx`, `edit/[id]/page.tsx`, `quotation/edit/[id]/page.tsx`: Penyembunyian tombol buat slip, penyaringan aksi baris, dan proteksi rute langsung.
- `components/marketing/marketing-tabs.tsx`, `client-table.tsx`, `sppa-table.tsx`, `client-detail.tsx`: Penyembunyian tombol tambah dan aksi mutasi klien/SPPA.
- `components/master-data/vehicles-tab.tsx`, `cob-cover-tab.tsx`, `cob-ojk-classes-tab.tsx`, `insurers-adjusters-tab.tsx`, `finance-docs-tab.tsx`, `lookup-values-tab.tsx`: Penyembunyian tombol tambah, kolom aksi, tombol edit/hapus, dan toggle switch status.
- `components/policies/policy-database.tsx`, `policy-files-sheet.tsx`: Penyembunyian tombol tambah polis, mutasi baris, dan form upload softcopy.
- `components/claims/claims-view.tsx`, `claim-detail-sheet.tsx`: Penyembunyian tombol catat klaim dan kontrol mutasi detail klaim.

## Dampak

- **Database:** tidak ada perubahan skema atau migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

1. `npx tsc --noEmit`: Lolos tanpa error diagnostik.
2. `npm run build`: Lolos produksi Turbopack Next.js (semua 24 segmen rute terkompilasi sukses).
3. Pengujian browser end-to-end (`ego-browser`):
   - **Peran Marketing (`marketing@lch.example`):**
     - `/underwriting/master-clauses`: tombol "+ Tambah Clause" tersembunyi (`false`), aksi edit pensil tersembunyi (`0`), aksi lihat mata aktif (`20`).
     - Navigasi rute langsung `/underwriting/master-clauses/new` dialihkan ke `/underwriting/master-clauses`.
     - `/underwriting`: tombol "Buat Placing Slip" tersembunyi (`false`).
     - Navigasi rute langsung `/underwriting/new` dialihkan ke `/underwriting`.
     - `/master-data`: tombol "Tambah COB" tersembunyi (`false`), sakelar status tersembunyi (`0`), tombol edit tersembunyi (`0`).
     - `/policies`: tombol "Tambah Polis" tersembunyi (`false`).
     - `/claims`: tombol "Catat Klaim Baru" tersembunyi (`false`).
     - `/marketing`: tombol "Tambah Klien" tampil (`true`) karena peran Marketing memiliki hak kelola penuh di modulnya.
   - **Peran Placement / Teknik (`teknik@lch.example`):**
     - `/underwriting/master-clauses`: tombol "+ Tambah Clause" tampil (`true`), aksi edit pensil aktif (`20`).
     - `/underwriting`: tombol "Buat Placing Slip" tampil (`true`).
     - Navigasi rute langsung `/underwriting/new` terbuka normal tanpa pengalihan.
     - `/master-data`: tombol "Tambah COB" tampil (`true`), sakelar status aktif (`9`), tombol edit aktif (`9`).

## Catatan untuk yang melanjutkan

- Pengecekan izin UI selalu mengacu pada `lib/access.ts` yang selaras dengan dokumen evaluasi RBAC LCH.
- Jika di kemudian hari LCH meminta perubahan izin menu tertentu di `ACCESS_MATRIX` (misalnya memberikan akses kelola sebagian), seluruh UI akan langsung otomatis menyesuaikan berkat sentralisasi `usePermission()`.
