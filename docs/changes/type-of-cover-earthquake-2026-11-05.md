# Type of Cover kedua (Earthquake) di slip Property

- **Tanggal:** 2026-11-05
- **Branch:** `feat/type-of-cover-earthquake`
- **PR:** [#117](https://github.com/agussusanto17/lch-ins/pull/117)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Slip Property PAR + EQVET hanya punya satu isian Type of Cover. Harry
memilih satu type of cover gabungan, "PROPERTY ALL RISKS AND/OR BUSINESS
INTERRUPTION + EARTHQUAKE, VOLCANIC ERUPTION AND TSUNAMI INSURANCE.", dan
minta dua isian: Property All Risk, lalu Earthquake di bawahnya (Request &
Temuan REQ-032, 5 November 2026).

CI LCH untuk PAR + EQVET (Siska Raharja,
`011/LCH-PLCMT/CI-PAREQ/VIII/2026`) menulis dua type of insurance, satu baris
per cover, masing-masing diawali tanda hubung. Kode cover nomornya PAREQ.

## Yang berubah

- **Form placing slip Property** (juga Draft Quotation): di bawah Type of
  Cover ada isian **Type of Cover Earthquake**.
  - Pilihannya sama dengan daftar type of cover Property di master data,
    ditambah "Tanpa Earthquake" untuk mengosongkan.
  - Tidak wajib. COB lain tidak punya isian ini, dan pindah COB
    mengosongkannya.
- **Dokumen** (keempatnya): kalau ada dua type of cover, baris Type of Cover
  mencetak keduanya di baris terpisah seperti CI LCH:
  "- PROPERTY ALL RISKS …" lalu "- EARTHQUAKE …". Slip dengan satu type of
  cover tercetak seperti sebelumnya.
- **Nomor slip:** token {COVER} menggabungkan singkatan kedua type of cover
  sesuai urutan isian, misalnya PAR + EQ menjadi `PS-PAREQ`. Type of cover
  kedua tanpa singkatan tidak menambah apa pun. Ini mengisi rencana di
  `cover_types.priority` ("slip dengan lebih dari satu type of cover"), tapi
  urutannya mengikuti isian, bukan kolom prioritas.
- **Polis dari slip:** polis EQVET dari slip PAR + EQVET memakai type of cover
  kedua. Kalau isian kedua kosong, tetap memakai type of cover pertama seperti
  sebelumnya.
- **Klausula dan deductible:**
  - Picker klausula menampilkan klausula khusus type of cover yang cocok dengan
    salah satu dari dua type of cover.
  - Pilihan deductible dari master mencakup pilihan khusus kedua type of
    cover.
- **Audit trail:** perubahan type of cover kedua tercatat dengan label "Type of
  Cover Earthquake".

## File utama

- `prisma/schema.prisma` dan
  `prisma/migrations/20261105140000_type_of_cover_kedua/`.
- `lib/server/placing-slips.ts`: simpan dan muat `typeOfCover2`, nomor slip.
- `components/underwriting/slip-model.ts`: `joinCoverCodes`.
- `components/underwriting/placing-slip-form.tsx`: isian kedua.
- `components/underwriting/clause-picker.tsx`, `lib/form-options.ts`: filter
  klausula dan pilihan deductible.
- `components/documents/doc-blocks.tsx`: `DetailTable`.
- `components/policies/policy-form.tsx`: type of cover polis EQVET.

## Dampak

- **Database:** migrasi `20261105140000_type_of_cover_kedua` menambah kolom
  `placing_slips.cover_type_2_id` (FK ke `cover_types`) dan `type_of_cover_2`.
  Tidak ada data yang diubah. Jalan otomatis saat build di Vercel dan VPS.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal** (skrip dengan fungsi asli):
  - Slip Property dengan Property All Risk dan PSAGBI tersimpan dan dimuat
    lagi, `cover_type_id` dan `cover_type_2_id` terisi dari master.
  - Dengan singkatan sementara EQ di PSAGBI, coverCode slip PAREQ dan nomor
    hasil release `001/LCH-PLCMT/PS-PAREQ/XI/2026`. Tanpa Earthquake,
    coverCode PAR.
  - Update menambah lalu mengosongkan Earthquake.
  - Slip Marine Cargo tidak menyimpan type of cover kedua.
  - Slip uji dihapus dan singkatan dikembalikan.
- **Dokumen:** `DetailTable` mencetak "- Property All Risk" dan "- PSAGBI" di
  dua baris. Satu type of cover tercetak tanpa tanda hubung.
- **Picker klausula:** klausula khusus PSAGBI tersembunyi dengan satu type of
  cover, dan tampil setelah Earthquake diisi.
- **Pilihan deductible:** khusus PAR, khusus PSAGBI, dan pilihan umum muncul
  bersama.
- **Browser lokal** (halaman uji sementara, dihapus sebelum commit): isian Type
  of Cover Earthquake tampil di bawah Type of Cover. Memilih PSAGBI lalu
  "Tanpa Earthquake" berjalan, dan tidak ada error aplikasi di console.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah,
  `npx tsx --test tests/access.test.ts tests/documents.test.ts`, dan
  `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Agar nomor slip PAR + EQVET menjadi PAREQ seperti CI LCH, type of cover
  Earthquake di master perlu bersingkatan EQ. Di daftar COB dan TOC LCH,
  PSAGBI bersingkatan EQVET, yang akan menghasilkan PAREQVET.
- PR ini dan [#115](https://github.com/agussusanto17/lch-ins/pull/115)
  sama-sama mengubah form slip, `doc-blocks.tsx`, dan `placing-slips.ts`, di
  bagian yang berbeda.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
