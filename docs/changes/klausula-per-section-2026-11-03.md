# Klausula slip Property dipilih per section

- **Tanggal:** 2026-11-03
- **Branch:** `feat/klausula-per-section`
- **PR:** [#101](https://github.com/agussusanto17/lch-ins/pull/101)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Interest Insured slip Property sudah dibagi Section 1 (Material Damage) dan
Section 2 (Business Interruption). Diminta klausula juga punya menu Section 1
dan Section 2 (Request & Temuan REQ-019, 3 November 2026).

## Yang berubah

- **Form placing slip dan Draft Quotation, kartu Deductible & Clauses:** slip
  Property punya dua menu klausula, "Clauses Section 1 — Material Damage" dan
  "Clauses Section 2 — Business Interruption". Klausula yang berlaku untuk
  kedua section dipilih di keduanya, dan wording-nya bisa diedit per section.
  COB lain tetap satu menu "Clauses".
- **Ringkasan kartu** menghitung klausula kedua section.
- **Blok CLAUSES di keempat dokumen** (Placing Slip, Quotation Slip, Cover
  Note, Closing Instruction): klausula slip Property dicetak di bawah judul
  "Section 1 — Material Damage" dan "Section 2 — Business Interruption", sama
  dengan INTEREST INSURED. Nomor menyambung dari wording form dan lintas
  section. Section tanpa klausula tidak dicetak. Lampiran CLAUSE WORDING di
  Placing Slip memakai pengelompokan yang sama. COB lain tidak berubah.
- **Judul section** dicetak di dalam butir klausula pertamanya, jadi tidak
  tertinggal sendirian di bawah halaman.
- **Data:** tabel `slip_clauses` mendapat kolom `section` (1 atau 2, default
  1). Kunci unik menjadi (slip, section, klausula), supaya satu klausula bisa
  dipakai di kedua section. Section 2 hanya disimpan untuk slip Property; slip
  yang COB-nya diganti dari Property tidak menyimpan klausula Section 2.
- **Duplikat slip** ikut menyalin klausula Section 2.
- **Picker klausula:** dua picker di halaman yang sama memakai satu permintaan
  daftar klausula selama permintaan itu berjalan. Daftar ini membawa wording
  semua klausula aktif, ukurannya ratusan KB. Id input judul klausula dibuat
  unik per picker.

## File utama

- `prisma/schema.prisma` dan
  `prisma/migrations/20261103233000_klausula_per_section/migration.sql`.
- `lib/data/types.ts`: `clauseIdsSection2`, `clauseOverridesSection2`,
  `clauseCopiesSection2`.
- `lib/server/placing-slips.ts`: klausula dimuat per section, disimpan lewat
  `insertSlipClauses`.
- `app/(app)/underwriting/actions.ts`: skema simpan dan duplikat slip.
- `components/underwriting/placing-slip-form.tsx`: dua menu klausula.
- `components/underwriting/clause-picker.tsx`: permintaan bersama dan id unik.
- `components/documents/doc-blocks.tsx`: `ClausesBlock` dan
  `ClauseWordingAppendix`.

## Dampak

- **Database:** migrasi baru. Jalan otomatis saat build (`prisma migrate
  deploy`) di Vercel dan VPS. Klausula yang sudah ada masuk Section 1.
- **Dokumen lama:** print slip Property yang sudah ada sekarang mencetak judul
  "Section 1 — Material Damage" di atas klausulanya. Klausula yang seharusnya
  di Section 2 perlu dipindah lewat form.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Skrip simpan dan muat ke database lokal (`lch_dev`), slip uji dihapus
  sesudahnya:
  - klausula C di kedua section dengan wording berbeda tersimpan sebagai dua
    baris, override masing-masing terpisah;
  - urutan baru dan perpindahan klausula ke Section 2 terbaca kembali sesuai
    urutan;
  - setelah COB diganti Motor Vehicle, Section 2 kosong;
  - 64 baris klausula lama ada di Section 1 setelah migrasi.
- Blok dokumen dirender dengan CSS hasil build: Property mencetak wording form
  nomor 1, Section 1 nomor 2 sampai 4, Section 2 nomor 5 sampai 6. Motor
  Vehicle tanpa judul section. Slip tanpa klausula tidak mencetak blok.
- Form dirender dengan komponen asli: dua menu dengan daftar terpilih
  masing-masing.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Master klausula Property tidak punya cover type (kelompok PAR dan EQVET),
  jadi kedua menu menampilkan semua klausula Property.
- Deductible diisi per cover sejak 29 Oktober 2026
  ([deductible-per-cover-2026-10-29.md](deductible-per-cover-2026-10-29.md)),
  bukan per section. Contoh print yang dikirim bersama permintaan ini masih
  memakai deductible per section dari prototipe awal.
- Nomor di lampiran CLAUSE WORDING mulai dari 1 tanpa wording form, berbeda
  dengan daftar CLAUSES. Ini perilaku lama dan tidak diubah.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
