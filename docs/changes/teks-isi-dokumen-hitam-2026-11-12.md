# Isi dokumen slip tidak abu-abu

- **Tanggal:** 2026-11-12
- **Branch:** `fix/teks-isi-dokumen-hitam`
- **PR:** [#234](https://github.com/agussusanto17/lch-ins/pull/234)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Catatan Harry, 12 November 2026:** isi SUBJECTIVITY di cetakan slip berwarna abu-abu, padahal seharusnya hitam seperti isi dokumen lainnya.
- Penyebabnya kelas `text-muted-foreground` pada teks isian bebas di dokumen. Selain SUBJECTIVITY, kelas yang sama dipakai di:
  - REMARKS di Draft Cover Note;
  - INSTRUCTION di Closing Instruction;
  - Special Conditions di blok coverage;
  - uraian Interest Insured Section 1 dan Section 2 (Property);
  - isi wording di lampiran CLAUSE WORDINGS.
- Semuanya teks yang diketik user dan tercetak sebagai isi dokumen, jadi diubah sekaligus supaya Harry tidak menemukannya satu per satu.

## Yang berubah

- Keenam blok di atas memakai warna teks normal dokumen. Ukuran, perataan kiri-kanan, dan hanging indent tidak berubah.
- Teks pendukung tetap abu-abu: label "Authorized Signatory", judul kolom tabel, baris periode di bawah nama tertanggung, baris diskon, dan keterangan di atas dokumen yang tidak ikut tercetak.

## File utama

- `components/documents/slip-documents.tsx`: SUBJECTIVITY, REMARKS, dan INSTRUCTION.
- `components/documents/doc-blocks.tsx`: uraian Interest Section 1 dan 2, Special Conditions, dan wording di CLAUSE WORDINGS.
- `tests/documents.test.ts`: string kelas lampiran klausul disesuaikan, dan tes baru memastikan blok isian bebas tidak memakai `text-muted-foreground`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (219 tes), dan `npm run build`: lolos.
- **Uji browser lokal** (build `next start`, sesi admin sementara): warna teks SUBJECTIVITY di Quotation Slip dan INSTRUCTION di Closing Instruction sama dengan warna teks isi dokumen lainnya, diukur dengan `getComputedStyle`.

## Catatan untuk yang melanjutkan

- Untuk isi dokumen baru, pakai warna teks normal. Warna abu-abu (`text-muted-foreground`) hanya untuk label dan keterangan pendukung.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
