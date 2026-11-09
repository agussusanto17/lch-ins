# Klausul Closing Instruction dan Cover Note: judul saja, wording di lampiran

- **Tanggal:** 2026-11-09
- **Branch:** `fix/klausul-ci-cover-note-judul`
- **PR:** belum dibuka
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Jawaban Harry atas pertanyaan konfirmasi no. 6 (9 November 2026):

> clause wording beserta judul klausula tercetak di halaman selanjutnya setelah
> tandatangan. pada bagian atas sebelum tanda tangan bagian clauses tertera
> hanya judul klausula saja. berlaku untuk placing, quotation, closing dan
> draft cover note.

Sebelumnya hanya Placing Slip dan Quotation Slip (#163) yang mencetak judul di
CLAUSES dan wording di lampiran CLAUSE WORDING. Closing Instruction dan Draft
Cover Note masih mencetak wording lengkap langsung di CLAUSES. #163 sengaja
tidak mengubah keduanya karena saat itu user hanya menandai Quotation.

## Yang berubah

- **Closing Instruction dan Draft Cover Note:**
  - CLAUSES sebelum tanda tangan hanya berisi judul klausula, sama dengan
    Placing Slip dan Quotation Slip.
  - Judul dan wording lengkap dicetak di lampiran CLAUSE WORDING setelah
    tanda tangan, mulai di halaman baru saat dicetak.
- **`ClausesBlock`:** mode `inline` dihapus karena tidak dipakai lagi, jadi
  keempat dokumen memakai susunan yang sama.
- **Test:** `tests/documents.test.ts` menyesuaikan pemeriksaan daftar
  CLAUSES. Judul tetap tidak tebal, wording tidak dicetak di daftar, dan judul
  di lampiran tetap tebal.

## File utama

- `components/documents/doc-blocks.tsx`: `ClausesBlock`.
- `components/documents/slip-documents.tsx`: `CoverNoteDocument` dan
  `ClosingInstructionDocument`.
- `tests/documents.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.
- **SIT:** SIT-087 mengharapkan Cover Note dan Closing Instruction mencetak
  wording di CLAUSES, jadi perlu ditulis ulang mengikuti aturan ini.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 118 lolos.
- `npm run build`: lolos.
- **Uji browser lokal** dengan sesi login sementara, slip
  009/LCH-PLCMT/PS-TS/XI/2026 berisi dua klausula:
  - Keempat dokumen mencetak CLAUSES "1. Alteration And Repair Clause, 2.
    Adjustment Premium Clause (30%)" tanpa wording.
  - Lampiran CLAUSE WORDING ada setelah tanda tangan, lengkap dengan wording.
  - PDF Cover Note dan Closing Instruction: CLAUSES di halaman 1, tanda tangan
    di halaman 2, dan CLAUSE WORDING mulai di halaman 3.

## Catatan untuk yang melanjutkan

- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
