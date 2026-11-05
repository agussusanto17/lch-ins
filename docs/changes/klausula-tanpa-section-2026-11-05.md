# Klausula tanpa section di slip Property

- **Tanggal:** 2026-11-05
- **Branch:** `feat/klausula-tanpa-section`
- **PR:** [#118](https://github.com/agussusanto17/lch-ins/pull/118)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Klausula slip Property baru punya dua kelompok, Section 1 (Material Damage)
dan Section 2 (Business Interruption). Harry minta tambahan klausula tanpa
section, jadi totalnya tiga kelompok (Request & Temuan REQ-033, 5 November
2026). CI LCH (Grand Mercure dan Siska Raharja) memang mencetak daftar klausula
umum dulu tanpa judul, baru "Section 1 – Material Damage" dan "Section 2 –
Business Interruption".

## Yang berubah

- **Form placing slip Property** (juga Draft Quotation), kartu Deductible &
  Clauses: ada picker **Clauses** di atas Clauses Section 1, dengan keterangan
  "Klausula untuk seluruh polis, tanpa section". Picker ini sama seperti
  picker section: cari dari master, wording bisa diedit per slip, dan ikut
  filter type of cover.
- **Satu klausula hanya boleh di satu kelompok.** Kalau klausula yang sama
  dipilih di dua kelompok (tanpa section, Section 1, atau Section 2), form
  memberi peringatan, dan simpan maupun release ditolak. Sebelumnya aturan ini
  hanya untuk Section 1 dan Section 2.
- **Ringkasan kartu** ikut menghitung klausula tanpa section.
- **Dokumen** (keempatnya, termasuk lampiran CLAUSE WORDING Placing Slip):
  klausula tanpa section dicetak paling atas tanpa judul, lalu Section 1 dan
  Section 2 dengan judulnya. Penomoran tetap menyambung seperti sebelumnya.
- **Data:** disimpan di `slip_clauses` dengan `section` 0, hanya untuk slip
  Property, seperti Section 2. Tidak ada perubahan skema.
- **Duplikat slip** ikut menyalin klausula tanpa section.

## File utama

- `lib/data/types.ts`: `clauseIdsGeneral`, `clauseOverridesGeneral`,
  `clauseCopiesGeneral`.
- `lib/validation.ts`: `validateClauseUniquenessAcrossSections` untuk tiga
  kelompok.
- `lib/server/placing-slips.ts`: muat section 0 dan simpan lewat
  `insertSlipClauses`.
- `app/(app)/underwriting/actions.ts`: skema simpan dan duplikat slip.
- `components/underwriting/placing-slip-form.tsx`: picker Clauses.
- `components/documents/doc-blocks.tsx`: `clauseGroups`.

## Dampak

- **Database:** tidak ada migrasi. Kolom `slip_clauses.section` (SmallInt)
  sudah ada sejak #101; nilai 0 baru dipakai sekarang.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal** (skrip dengan fungsi asli):
  - Slip Property dengan dua klausula tanpa section (satu wording-nya diedit),
    satu di Section 1, dan satu di Section 2 tersimpan sebagai section 0, 1,
    dan 2, lalu dimuat lagi utuh beserta wording yang diedit.
  - Simpan dengan klausula yang sama di tanpa section dan Section 1 ditolak
    server. Slip Marine Cargo tidak menyimpan klausula tanpa section.
  - Slip uji dihapus.
- **Validasi:** klausula ganda antara tanpa section dan Section 1, atau tanpa
  section dan Section 2, terdeteksi. Tiga kelompok berbeda lolos.
- **Dokumen:** CLAUSES dan CLAUSE WORDING mencetak klausula tanpa section dulu
  tanpa judul, lalu Section 1 dan Section 2.
- **Browser lokal** (halaman uji sementara, dihapus sebelum commit):
  - Tiga picker tampil berurutan: Clauses, Clauses Section 1, Clauses
    Section 2.
  - Memilih klausula di tanpa section menaikkan ringkasan kartu.
  - Memilih klausula yang sama di Section 2 memunculkan peringatan.
  - Tidak ada error console.
- `npx tsc --noEmit`, `npx eslint` pada file yang diubah,
  `npx tsx --test tests/access.test.ts tests/documents.test.ts`, dan
  `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Branch ini dibangun di atas
  [#117](https://github.com/agussusanto17/lch-ins/pull/117) (type of cover
  Earthquake), supaya picker baru ikut filter type of cover kedua. Merge #117
  dulu.
- CI LCH memulai nomor klausula dari 1 lagi di setiap kelompok. Dokumen aplikasi
  masih menyambung nomornya dari wording form lintas kelompok, seperti sejak
  #101.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
