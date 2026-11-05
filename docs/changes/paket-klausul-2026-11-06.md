# Paket klausul bawaan per type of cover

- **Tanggal:** 2026-11-06
- **Branch:** `feat/paket-klausul` (di atas `feat/kelompok-klausul`)
- **PR:** [#148](https://github.com/agussusanto17/lch-ins/pull/148)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini bagian kedua fitur Tahap 1 nomor 3 dari analisa 26 contoh slip LCH (6
November 2026). Daftar klausul di contoh LCH panjang:

- 40 sampai 62 judul untuk Marine Cargo;
- 62 untuk Machinery Breakdown;
- sekitar 50 untuk Public Liability serta CAR/EAR.

Isinya hampir sama untuk satu type of cover, tapi di sistem setiap klausul
dipilih satu per satu. Bagian pertama, kelompok berjudul dan urutan klausul,
ada di [#147](https://github.com/agussusanto17/lch-ins/pull/147).

## Yang berubah

- **Master Clauses > form clause:** bagian baru "Paket Klausul" dengan tiga
  isian:
  - "Masuk paket klausul bawaan";
  - "Kelompok di slip", dengan saran Extensions, General Conditions, dan
    lainnya;
  - "Urutan".

  Paketnya berlaku untuk type of cover klausul itu, atau semua type of cover
  class-nya bila type of cover kosong. Klausul untuk semua class tidak bisa
  masuk paket.
- **Master Clauses > daftar:** klausul paket bertanda "Paket", beserta
  kelompoknya.
- **Placing slip:**
  - Tombol "Pasang paket klausula (N)" muncul bila ada klausul paket yang
    cocok dengan COB dan type of cover slip tapi belum terpasang. Satu klik
    memasang semuanya, diurutkan menurut urutan paket lalu judul.
  - Di slip tanpa section, tiap klausul langsung masuk kelompok paketnya.
  - Di slip Property dan slip ber-section, tombol ada di tiap kelompok
    section dan hanya memasang klausul yang belum dipilih di kelompok mana
    pun, jadi tidak ada klausul dobel.

## File utama

- `prisma/schema.prisma` dan migrasi `20261106100000_paket_klausul`: kolom
  `clauses.in_package`, `clauses.package_group`, dan `clauses.package_order`.
- `lib/clause-groups.ts`: `packageToInstall` dan `installPackage`.
- `components/underwriting/clause-picker.tsx`: tombol pasang paket.
- `components/underwriting/placing-slip-form.tsx`: klausul yang sudah
  dipilih di kelompok section lain.
- `components/underwriting/clause-form.tsx`,
  `components/underwriting/master-clauses.tsx`,
  `app/(app)/underwriting/master-clauses/[id]/page.tsx`: isian dan tanda paket
  di Master Clauses.
- `lib/server/clauses.ts`: simpan dan rapikan isian paket.
- `app/(app)/underwriting/actions.ts`: data paket di daftar klausul picker.
- `tests/clause-groups.test.ts`: satu tes baru.

## Dampak

- **Database:** migrasi menambah tiga kolom di `clauses`. Belum ada klausul
  yang masuk paket.
- **Master Data, pekerjaan LCH:** paket per type of cover diisi LCH sendiri
  di Master Clauses. Ini sejalan dengan daftar pekerjaan Master Data di
  analisa contoh slip.
- **Slip lama:** tidak berubah. Tombol paket hanya menambah klausul.
- **Env:** tidak ada.
- **Deploy:** merge #143 sampai #147 dulu, lalu PR ini. Setelah itu
  sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus):
  - Isian paket empat klausul Cash In Safe tersimpan. Judul kelompok
    dirapikan, dan urutan 99999 dipotong menjadi 9999.
  - Klausul untuk semua class tetap tidak masuk paket walaupun dicentang.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus, dengan
  empat klausul Cash In Safe ditandai paket. Penandanya sudah dikembalikan
  di database lokal.
  - **Form slip Cash In Safe tanpa klausul:**
    - Tombol tertulis "Pasang paket klausula (4)".
    - Setelah diklik, klausul masuk Extensions (urutan 10, dua klausul
      menurut judul), General Conditions (urutan 20), dan tanpa judul
      (urutan 9999).
    - Tombolnya lalu hilang.
  - **Form Master Clauses:** bagian Paket Klausul menampilkan centang, kelompok
    General Conditions, dan urutan 20.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Paket tidak dipasang otomatis** saat type of cover dipilih, supaya
  klausul yang sudah dipilih tidak tertimpa. Kalau LCH ingin otomatis untuk
  slip baru, cukup panggil `installPackage` saat type of cover diganti dan
  daftar klausulnya masih kosong.
- **Kelompok paket di slip ber-section** belum dipakai, karena judul kelompok
  hanya untuk slip tanpa section (lihat catatan #147).
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
