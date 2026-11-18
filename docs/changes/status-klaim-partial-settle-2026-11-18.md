# Status klaim Partial Settle dan kunci klaim Settled

- **Tanggal:** 2026-11-18
- **Branch:** `feat/status-klaim-partial-settle`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- MoM review Phase 1 (17 November 2026), poin 9:
  - tambah status Partial Settle untuk klaim yang baru diselesaikan sebagian;
  - Settled bersifat final dan terkunci;
  - Closed masih fleksibel dan bisa diubah.
- Ketentuan di MoM: hanya Admin yang bisa membuka kunci klaim Settled bila ada salah input, dan setiap pembukaan tercatat di Audit Trail.
- Sebelumnya status klaim hanya Outstanding, Settled, Closed, dan Rejected, dan klaim dengan status apa pun masih bisa diubah.

## Yang berubah

- **Status Partial Settle** (lookup sistem `claim_status`, kode `partial_settle`).
  - Urutan status: Outstanding, Partial Settle, Settled, Closed, Rejected.
  - Partial Settle dihitung sebagai klaim berjalan (`OPEN_CLAIM_STATUSES`), sehingga ikut di:
    - kartu "Klaim Berjalan (Outstanding, Partial Settle)" di daftar klaim;
    - Klaim Terbuka dan outstanding di Dashboard;
    - notifikasi "Klaim Berjalan" di topbar.
  - Badge-nya berwarna biru (info).
- **Klaim Settled terkunci** (`isClaimLocked`), di server dan di tampilan.
  - **Server** menolak perubahan data klaim, perubahan status, hapus klaim, centang/upload/ubah/tambah/hapus dokumen, serta tambah/hapus tindak lanjut, dengan pesan "Klaim Settled terkunci …".
  - **Detail klaim** menampilkan banner kunci. Tombol Edit, upload, centang dokumen, tambah dokumen, dan tambah atau hapus tindak lanjut tidak tampil atau nonaktif.
  - **Daftar klaim:** aksi Edit dan Hapus diganti "Terkunci (Settled)".
  - **Form klaim:** saat status Settled dipilih, ada keterangan bahwa klaim akan terkunci. Partial Settle juga punya keterangan.
- **Buka kunci oleh Admin.** Tombol "Buka kunci" di banner hanya tampil untuk role Admin. Dialognya meminta:
  - status setelah dibuka (Outstanding, Partial Settle, Closed, atau Rejected);
  - alasan, wajib diisi.
  - Server action menolak role selain Admin.
  - Audit Trail mencatat perubahan status dan "Alasan buka kunci klaim Settled".
  - Setelah data diperbaiki, status diubah ke Settled lagi untuk mengunci.
- **Klaim Closed** tetap bisa diubah, termasuk dibuka kembali lewat perubahan status.

## File utama

- `lib/claim-detail.ts` (`isClaimLocked`, `CLAIM_LOCKED_MESSAGE`), `lib/data/types.ts`, `lib/data/reference.ts`, `lib/form-options.ts`.
- `lib/server/claims.ts`: `assertClaimUnlocked`, `unlockSettledClaim`. `app/(app)/claims/actions.ts`: `unlockSettledClaimAction`.
- `components/claims/claim-detail-sheet.tsx`, `components/claims/claims-view.tsx`, `components/claims/claim-form.tsx`.
- `components/shared/status-badge.tsx`, `lib/server/topbar.ts`, `components/layout/notification-popover.tsx`, `components/audit/audit-fields.ts`, `prisma/seed.ts`.
- `prisma/migrations/20261118230000_status_klaim_partial_settle/migration.sql`.
- `tests/claim-status.test.ts`.

## Dampak

- **Database:** migrasi `20261118230000_status_klaim_partial_settle`:
  - menambah lookup `claim_status` `partial_settle`, dengan sort order 1;
  - menggeser sort order settled, closed, dan rejected masing-masing +1.
  - Klaim yang sudah ada tidak berubah. Klaim Settled langsung terkunci setelah deploy.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: lolos, termasuk 3 test baru: urutan status, klaim berjalan, dan hanya Settled yang terkunci.
- **Browser lokal** (SIT Admin, klaim CLM/2026/07/0028 yang Settled):
  - banner kunci tampil dengan tombol Buka kunci, dan tombol Edit hilang;
  - di tab dokumen, centang nonaktif dan tidak ada upload atau tambah berkas;
  - buka kunci ke Partial Settle dengan alasan berhasil:
    - kontrol aktif lagi;
    - kartu Klaim Berjalan naik dari 6 ke 7;
    - Audit Trail mencatat Status dan "Alasan buka kunci klaim Settled".
  - Data klaim dan audit dikembalikan setelah uji.

## Catatan untuk yang melanjutkan

- **Pemeriksaan Admin** memakai role `admin`, sama seperti `requireAdmin`.
- **Statistik klaim per status** (poin 17) menunggu template dari Team LCH. Partial Settle sudah tersedia sebagai status.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
