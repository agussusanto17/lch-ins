# UI Polis Tersambung ke PostgreSQL

- **Tanggal:** 2026-10-22
- **Branch:** `feat/policies-ui-postgres`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Lanjutan [migrasi-polis-postgres-2026-10-22.md](migrasi-polis-postgres-2026-10-22.md).
Lapisan server polis sudah ada, tapi halaman `/policies` masih membaca mock
store di browser, jadi data hilang saat refresh. Waktu UI disambungkan,
ternyata lapisan server dari PR #28 belum pernah dijalankan ke database sungguhan
dan beberapa kali gagal.

Acuan: PRD v1.9 (hak akses per menu, isian LCH 21 Oktober 2026) dan ERD bagian
"Polis dan klaim" di Notion.

## Yang berubah

- Bug lapisan server PR #28 yang diperbaiki di `lib/server/policies.ts`:
  - Panel insurer menulis `positionId: "leader"` dan `insurerId: "ins-001"`,
    yang bukan UUID. Sekarang keduanya di-resolve dari lookup `security_role`
    dan tabel `insurers` berdasarkan nama.
  - Role panel `"Member"` tidak ada di master. Diganti `"As Member"` sesuai
    lookup.
  - Tipe polis di-resolve dari kode lookup `policy_type`, tidak lagi dari
    label tampilan.
  - Type of cover hilang setiap simpan, karena label form seperti
    "PAR + EQVET" tidak punya padanan di `cover_types`.
- Kolom baru `policies.type_of_cover` (teks) menyimpan label pilihan form.
  `cover_type_id` tetap diisi bila labelnya cocok dengan master.
- Pemetaan COB: "GENERAL ACCIDENT" di master dipetakan ke "Personal Accident"
  di UI. Surety Bond dan Terrorism belum ada di master, jadi simpan polis
  dengan COB itu ditolak dengan pesan jelas, tidak diam-diam diganti COB lain.
- `/policies` dirender dari server (`listPolicies`). Data server juga disalin ke
  store sesi lewat `store.replace`, karena dashboard, renewal notice, dan klaim
  masih membaca store.
- Simpan dan hapus polis lewat Server Actions (`app/(app)/policies/actions.ts`)
  dengan Zod dan `requireManage("/policies")`.
- Pilihan klien di form polis diambil dari `listClientOptions()`, yang hanya
  mengirim id dan nama. Data KYC tidak ikut terkirim ke halaman polis. Slip
  lama yang masih memakai id klien mock dicocokkan lewat nama.
- `requireManage` dipanggil di dalam `try`, dengan `unstable_rethrow` di
  `catch`. Sebelumnya fungsi ini melempar error di luar `try`, sehingga role
  yang hanya punya akses Lihat mendapat crash, bukan pesan "Akses ditolak".
  Redirect dari `requireAccess` tetap diteruskan.
- `lib/format.ts`: alias "general accident" ditambahkan.
- `components/underwriting/rate-tables.tsx`: `min-w-[620px]` diganti
  `min-w-155` supaya lint Tailwind lolos.
- `scripts/check-policies.ts`: uji create, update, panel insurer, dan delete ke
  database. Datanya dibersihkan lagi di akhir uji.

## File utama

- `lib/server/policies.ts`: resolusi UUID master, kolom `typeOfCover`.
- `app/(app)/policies/actions.ts`: Server Actions polis.
- `app/(app)/policies/page.tsx`: memuat polis dan opsi klien di server.
- `components/policies/policy-database.tsx`, `policy-form.tsx`: memanggil
  action dan menyinkronkan store sesi.
- `lib/server/clients.ts`: `listClientOptions`.
- `lib/store.ts`: `store.replace`.
- `prisma/migrations/20261022150000_policy_type_of_cover/`.

## Dampak

- **Database:** migrasi baru `20261022150000_policy_type_of_cover` (kolom
  nullable, aman untuk data lama). Produksi juga masih menunggu
  `20261022120000_policy_client_optional` (PR #28) dan
  `20261022140000_slip_type_of_cover` (PR #30). Jalankan `npm run db:deploy`
  ke database produksi sebelum atau bersamaan dengan merge, karena build Vercel
  tidak menjalankan migrasi.
- **Env:** tidak ada.
- **Deploy:** setelah merge, `gh repo sync vourdev/lch-ins -b main`.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint`, dan `npm run build` lolos.
- `scripts/check-policies.ts` menghasilkan ALL PASSED.
- E2E dengan ego-browser di build produksi lokal, sebagai admin:
  - tabel menampilkan 14 polis dari database;
  - polis baru dibuat lewat form, termasuk klien dari slip mock yang
    ter-resolve ke klien database, type of cover "PAR + EQVET", dan leader 100%;
  - premi diedit, dan nilainya tersimpan;
  - polis induk yang masih punya turunan menampilkan "Hapus (masih dipakai)"
    dalam keadaan nonaktif;
  - hapus lewat UI berhasil. Barisnya hilang dari database dan audit log
    mencatat Create, Update, Delete.
- RBAC role Lihat baru diverifikasi lewat kode, belum lewat UI. Akun uji
  non-admin di database tidak bisa login dengan sandi uji yang dikenal, dan
  sandi itu sengaja tidak direset.

## Catatan untuk yang melanjutkan

- Softcopy polis belum diunggah ke storage. File baru hanya disimpan sebagai
  object URL di tab browser, jadi hilang setelah refresh. `policy_files.file_path`
  di ERD belum dipakai.
- UI belum menyembunyikan tombol tambah, edit, dan hapus untuk role yang hanya
  punya akses Lihat. Server menolak aksinya, tapi tombolnya tetap tampil. Gap ini
  ada di semua modul.
- Action master data belum memanggil `unstable_rethrow`, sehingga redirect dari
  `requireManage` ikut tertelan. Belum diubah di PR ini.
- Pilihan type of cover dan daftar insurer di form masih dari konstanta
  `lib/data`. PRD meminta semua dropdown diambil dari master data.
- Klaim mock masih menunjuk polis mock (`p-001`). Setelah store diganti data
  database, tautan klaim mock ke polisnya putus. Ini selesai saat UI klaim
  disambungkan ke database.
- ERD juga mendefinisikan `endorsement_seq`, `cob_ojk_class_id`,
  `placement_location_id`, dan `grouping_insured` di `policies`. Kolom-kolom
  itu belum ada di `prisma/schema.prisma` maupun di form.
