# CLAUSES Quotation Slip mengikuti format Placing Slip

- **Tanggal:** 2026-11-06
- **Branch:** `fix/klausula-quotation-seperti-placing`
- **PR:** #163
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

User menandai bagian CLAUSES di Quotation Slip (Motor Vehicle, Mr. Harry
Mulyono). Di sana setiap klausula dicetak lengkap: judul, nama wording form
(misalnya "KL. KBM - 12"), lalu paragraf wording, di tengah dokumen. Placing
Slip hanya mencetak daftar judul di CLAUSES, lalu wording lengkap di lampiran
CLAUSE WORDING setelah tanda tangan. User meminta Quotation tampil seperti
Placing.

Sebelumnya Quotation sengaja dibuat inline
([judul-klausula-capital-each-word-2026-11-03.md](judul-klausula-capital-each-word-2026-11-03.md)).
Permintaan ini menggantikan keputusan itu untuk Quotation Slip.

## Yang berubah

- CLAUSES di Quotation Slip hanya berisi daftar judul klausula dalam format
  Capital Each Word, dikelompokkan per section, sama seperti Placing Slip.
- Wording lengkap pindah ke lampiran CLAUSE WORDING setelah blok tanda tangan,
  dimulai di halaman baru saat dicetak.

## Yang sengaja tidak diubah

- Cover Note dan Closing Instruction tetap mencetak wording inline di CLAUSES.
  User hanya menandai Quotation.

## File utama

- `components/documents/slip-documents.tsx`: `QuotationSlipDocument` memakai
  `ClausesBlock` tanpa `inline` dan menambahkan `ClauseWordingAppendix`.
- `components/documents/doc-blocks.tsx`: komentar `ClauseWordingAppendix`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 83 lolos.
- `npx tsc --noEmit` dan `npm run build` lolos.
- Browser lokal (`/underwriting/quotation/<id>`, DB lokal, slip PAR/EQVET
  dengan 9 klausula di 2 section):
  - CLAUSES berisi judul saja, Section 1 nomor 1–7 dan Section 2 nomor 1–2;
  - lampiran CLAUSE WORDING tampil setelah SECURITY dan tanda tangan, dengan
    judul dan wording lengkap.

## Catatan untuk yang melanjutkan

- Kalau Cover Note atau Closing Instruction juga perlu format ini, cukup ganti
  `<ClausesBlock slip={slip} inline />` dan tambahkan `ClauseWordingAppendix`
  di dokumen itu.
