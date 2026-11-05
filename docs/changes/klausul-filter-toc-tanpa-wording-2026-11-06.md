# Klausul: filter type of cover persis dan klausul tanpa wording

- **Tanggal:** 2026-11-06
- **Branch:** `fix/klausul-filter-toc-tanpa-wording`
- **PR:** [#140](https://github.com/agussusanto17/lch-ins/pull/140)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dua temuan dari analisa 26 contoh slip LCH (6 November 2026), keduanya masuk
Tahap 1:

1. **Filter klausul di placing slip mencocokkan potongan nama type of cover**
   dua arah. Akibatnya klausul "Marine Hull" ikut muncul di slip "Marine Hull
   Single Voyage", dan klausul "Marine Cargo" muncul di "Marine Cargo Open
   Cover" serta "Marine Cargo Stock Throughput". Sekarang belum terasa, karena
   klausul per type of cover baru ada untuk CIS, CIT, FG, dan PSAGBI. Masalah
   ini akan muncul begitu LCH mengisi klausul Marine Cargo dan Marine Hull.
2. **Master Data menolak klausul tanpa wording.** Padahal sekitar 40 klausul
   di contoh CI marine hull hanya berupa judul, dan banyak CI liability serta
   cargo hanya mencetak judul klausul.

## Yang berubah

- **Filter klausul:** klausul khusus type of cover hanya muncul bila nama
  type of cover slip sama persis.
  - Slip lama yang type of cover-nya di luar master tetap dicocokkan dengan
    potongan nama seperti sebelumnya. Contohnya slip lokal "Marine Cargo —
    Institute Cargo Clauses (A)".
  - Aturan Earthquake (PSAGBI di slip PAR + EQVET) dan pengecualian klausul
    Cargo di Cash In Transit tidak berubah.
- **Master Data > Clauses:** wording boleh dikosongkan. Judul tetap wajib.
  Keterangan di isian wording menjelaskannya.
- **Dokumen:** klausul tanpa wording dicetak judulnya saja, tanpa blok
  wording kosong. Ini berlaku di CLAUSES (inline) dan lampiran CLAUSE WORDING.

## File utama

- `lib/clause-filter.ts`: pencocokan nama persis, cadangan potongan nama untuk
  slip lama.
- `components/underwriting/clause-picker.tsx`: meneruskan daftar type of cover
  master ke filter.
- `lib/server/clauses.ts`, `components/underwriting/clause-form.tsx`: wording
  opsional.
- `components/documents/doc-blocks.tsx`: cetakan klausul tanpa wording.
- `tests/clause-filter.test.ts`: dua tes baru.

## Dampak

- **Database:** tidak ada migrasi. Klausul tanpa wording disimpan dengan
  wording kosong.
- **Slip yang sudah ada:** daftar klausul yang bisa dipilih hanya berubah di
  type of cover yang namanya mirip. Saat ini belum ada klausul per type of
  cover di pasangan tersebut. Klausul yang sudah dipilih di slip tidak
  berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal:** pasangan type of cover yang selama ini saling bocor
  adalah Marine Cargo dengan Open Cover dan Stock Throughput, Marine Hull
  dengan Single Voyage, dan dua TOC SIT. Klausul per type of cover saat ini
  hanya untuk CIS, CIT, FG, dan PSAGBI.
- **Script uji ke fungsi server** (sudah dihapus): klausul dengan wording
  `<p></p>` tersimpan dengan wording kosong, dan judul kosong tetap ditolak.
- **Tes baru:**
  - klausul Marine Hull tidak muncul di slip Single Voyage, dan sebaliknya;
  - slip lama di luar master tetap cocok sebagian;
  - Marine Cargo tidak bocor ke Open Cover.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (47 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- Pencocokan masih memakai nama, bukan id type of cover, karena slip
  menyimpan nama type of cover. Mengganti nama type of cover di Master Data
  membuat klausulnya tidak cocok dengan slip lama yang memakai nama lama.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
