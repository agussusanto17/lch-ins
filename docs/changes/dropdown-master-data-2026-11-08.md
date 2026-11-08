# Dropdown status dan tipe dari Master Data

- **Tanggal:** 2026-11-08
- **Branch:** `feat/dropdown-master-data`
- **PR:** [#169](https://github.com/agussusanto17/lch-ins/pull/169)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Agus meminta semua dropdown di form diambil dari Master Data, tanpa pilihan
  hardcode (11 September 2026).
- PR #54 sudah memindahkan sebagian besar dropdown. SIT-021 (31 Oktober 2026)
  masih mencatat batasan: nilai baru untuk status klien, tipe klien, status dan
  tahapan klaim, serta tipe polis belum muncul di form karena pilihannya masih
  di kode.
- Ini nomor 4 dari urutan kerja Phase 1, setelah #166, #167, dan #168.

## Yang berubah

- **Dua jenis daftar.**
  - **Daftar bebas: status klien dan tahapan klaim.**
    - Pilihan di form adalah nilai aktif di Master Data, urut seperti master.
    - Nilai baru dari LCH langsung muncul dan tersimpan, misalnya tahapan
      "Survey Lapangan".
    - Nilai yang sudah tersimpan tetap tampil walaupun sudah dinonaktifkan.
  - **Daftar tetap: status klaim, tipe polis, dan tipe klien.**
    - Nilainya dipakai logika. Klaim Outstanding dihitung sebagai klaim
      terbuka, Endorsement mengubah daftar peserta, dan tipe klien menentukan
      isian KYC.
    - Nama dan urutan diambil dari Master Data.
    - Nilai baru dan penonaktifan dikerjakan developer, sama seperti COB.
- **Logika membaca kode master, bukan nama.**
  - Status klaim, tipe polis, dan tipe klien dicocokkan lewat kodenya, misalnya
    `settled`, `new`, dan `individual`.
  - Nama yang diganti di Master Data tidak merusak hitungan, filter, atau
    penyimpanan.
- **Master Data, Nilai Pilihan Dropdown, untuk daftar tetap:**
  - tombol "Tambah Pilihan Baru" tidak tampil, diganti catatan kunci;
  - menu baris menjadi "Nonaktifkan (lewat developer)" dan tidak bisa diklik;
  - di dialog edit, kode dan switch aktif dikunci;
  - server ikut menolak tambah, aktifkan, dan nonaktifkan, dan saat edit tidak
    mengubah kode maupun status aktifnya.
- **Badge memakai nama master:**
  - status klaim di tabel klaim, detail klaim, dan tabel klaim di detail klien;
  - tipe polis di Policy Database.
  - Contoh: kode `closed` bernama "Close" di database lokal, jadi badge dan
    dropdown menulis "Close".
  - Warna badge tetap mengikuti status sistem.
- **Tab Policy Database** memakai nama tipe dari master. Tipe yang nonaktif
  tetap punya tab selama masih ada polisnya.
- **Urutan tipe klien** di form klien sekarang ikut master: Perorangan lalu
  Korporasi. Sebelumnya Korporasi dulu. Urutan bisa diubah di Master Data.
- **Filter tahapan klaim** menerima tahapan apa pun dari master. Sebelumnya
  tahapan di luar daftar kode di-reset ke "Semua".
- **Seed** (`npm run db:seed`, tidak jalan saat deploy) hanya menonaktifkan
  baris sistem yang sudah dihapus dari daftar seed. Sebelumnya nilai tambahan
  LCH di grup sistem, misalnya tahapan klaim baru, ikut dinonaktifkan setiap
  kali seed dijalankan.

## File utama

- `lib/form-options.ts`:
  - daftar lookup sistem dan daftar tetap;
  - peta kode `CLAIM_STATUS_CODES`, `POLICY_TYPE_CODES`, dan
    `CLIENT_TYPE_CODES`;
  - `fixedLookupItems`, `fixedLookupLabel`, `dynamicLookupItems`, dan
    `systemValueFromRow`.
- `lib/server/form-options.ts`: memuat lookup sistem yang aktif.
- `lib/server/claims.ts`, `lib/server/clients.ts`, dan
  `lib/server/policies.ts`: membaca dan menyimpan lewat kode.
- `lib/server/master-data.ts` dan
  `components/master-data/lookup-values-tab.tsx`: kunci daftar tetap.
- `prisma/seed.ts`: penonaktifan hanya untuk baris sistem.
- Form dan tabel:
  - `claim-form.tsx`, `claims-view.tsx`, dan `claim-detail-sheet.tsx`;
  - `client-form.tsx`, `client-table.tsx`, dan `client-detail.tsx`;
  - `policy-form.tsx` dan `policy-database.tsx`;
  - `status-badge.tsx`, dengan prop `label` baru.
- `app/(app)/claims/actions.ts` dan `lib/claim-filter.ts`: tahapan klaim bebas.
- `lib/data/types.ts`: `ClaimStage` dan `ClientStatus` menjadi string.
- `tests/master-lookups.test.ts` (baru) dan `tests/claim-filter.test.ts`.

## Dampak

- **Database:** tidak ada migrasi dan tidak ada data yang diubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos. Satu warning `exhaustive-deps` di
  `claims-view.tsx` sudah ada di `main`.
- `npx tsx --test tests/*.test.ts`: 110 lolos. Ada empat test baru, dan satu
  test filter diperbarui untuk tahapan dari master.
- `npm run build`: lolos.
- **Uji server lokal** dengan skrip sementara:
  - Nama diganti: Baru menjadi Polis Baru, Perorangan menjadi Individu, dan
    Settled menjadi Settle. Logika tetap benar.
  - Tahapan klaim baru "Survey Lapangan" dan status klien baru "Blacklist"
    tersimpan.
  - Daftar tetap menolak tambah dan nonaktifkan. Edit nama tetap jalan, dan
    status aktifnya tidak berubah.
- **Uji browser lokal** dengan sesi login sementara: 19 cek lulus. Nama master
  diganti sementara selama uji.
  - Master Data, Status Klaim:
    - catatan kunci tampil, tanpa tombol tambah;
    - menu nonaktifkan terkunci;
    - kode dan switch aktif di dialog edit terkunci.
  - Master Data, Tahapan Klaim: tombol tambah ada dan nilai bisa dinonaktifkan.
  - Klaim:
    - badge di tabel dan detail memakai nama master;
    - pilihan status Outstanding, Settle (uji), Close, dan Rejected, tanpa
      status lama yang nonaktif;
    - pilihan tahapan dari master.
  - Policy Database: tab, badge, dan pilihan Tipe Polis memakai nama master.
  - Klien:
    - tipe klien di form dari master;
    - badge klaim di detail klien memakai nama master.
- Seed tidak dijalankan di database lokal supaya urutan dan data uji lokal
  tidak ter-reset. Perubahannya satu syarat `isSystem: true` di query
  penonaktifan.
- Data uji lokal sudah dihapus, termasuk sesi sementara, dan nama master sudah
  dikembalikan.

## Catatan untuk yang melanjutkan

- **SIT-021:** catatan batasannya perlu diperbarui di sheet. Status klien dan
  tahapan klaim sekarang bebas. Untuk tiga daftar tetap, yang diambil dari
  Master Data hanya nama dan urutannya.
- **Status klaim lama yang nonaktif** (Open, Tunggu Dokumen, Paid, dan
  lainnya) masih tampil di daftar Status Klaim Master Data. Ini sisa sebelum
  status dan tahapan dipisah, dan tidak dipakai form.
- **Seed menimpa urutan baris seed** setiap kali dijalankan. Labelnya tidak
  ditimpa. Kalau LCH mengubah urutan lalu seed dijalankan ulang, urutannya
  kembali ke urutan seed.
- **Status klien yang tidak ditemukan di master** jatuh ke Active. Ini perilaku
  lama.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
