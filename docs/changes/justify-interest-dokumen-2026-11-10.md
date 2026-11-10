# Perataan Teks Justify dan Hanging Indent pada Interest Insured dan Dokumen Cetak

- **Tanggal:** 2026-11-10
- **Branch:** `fix/justify-interest-dokumen`
- **PR:** #198
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Pada dokumen cetak Placing Slip, Quotation Slip, Cover Note, dan Closing Instruction, rincian objek pertanggungan (**INTEREST INSURED**) pada Section 1 (Material Damage), Section 2 (Business Interruption), dan COB non-property masih menggunakan elemen teks biasa tanpa `text-justify` dan tanpa penanganan baris baru/hanging indent (`sumInsuredRow` dan `objectRow`).

Ketika deskripsi objek pertanggungan berupa paragraf panjang atau berisi sub-butir bertanda (seperti pada dokumen PT. HABCO PRIMATAMA: `A. BUILDINGS\nOn buildings and all improvements...`), tepi kanan teks terlihat bergerigi (*ragged right*) dan tidak rata kanan-kiri (*justified*). Selain itu, teks pada blok Exclusions, lampiran berkas, catatan klaim, kuesioner SPPA, dan badan surat renewal juga belum menerapkan perataan justify yang konsisten.

## Yang berubah

- **Objek Pertanggungan Slip (`doc-blocks.tsx`):**
  - Mengubah `sumInsuredRow` menjadi flex row dengan `div.flex-1.min-w-0.text-justify` yang merender `HangingIndentText`, sehingga paragraf panjang rata kanan-kiri (*text-justify*) dan sub-butir (`A.`, `1.`, `-`) memiliki indentasi gantung yang sejajar. Kolom nominal premi diberi `shrink-0 self-start` agar tetap rapi di kanan atas.
  - Mengubah `objectRow` untuk COB lain dengan pola hanging indent dan justify yang sama.
  - Memperbarui pengantar `slip.interestSection1` dan `slip.interestSection2` agar menggunakan `HangingIndentText` dengan `text-justify`.
- **Pengecualian dan Lampiran (`doc-blocks.tsx`):**
  - Menyelaraskan teks pada `ExclusionsBlock` dengan `flex-1 min-w-0 text-justify`.
  - Menerapkan `text-justify` pada butir-butir `AttachmentList`.
  - Menerapkan `HangingIndentText` dan `text-justify` pada rincian objek di `LocationScheduleAppendix`.
- **Dokumen Surat Renewal (`renewal-documents.tsx`):**
  - Menerapkan `text-justify` pada paragraf pembuka, penjelas, dan penutup surat pemberitahuan perpanjangan polis.
- **Dokumen Lembar Detail Klaim (`claim-documents.tsx`):**
  - Menggunakan `HangingIndentText` dan `text-justify` pada bagian Catatan Tambahan dan catatan riwayat tindak lanjut (follow-up).
- **Formulir KYC/SPPA (`sppa-documents.tsx`):**
  - Menerapkan `text-justify` pada baris nilai isian `KycValue`.

## File utama

- `components/documents/doc-blocks.tsx`: pembaruan `sumInsuredRow`, `objectRow`, `interestSection1/2`, `ExclusionsBlock`, `AttachmentList`, dan `LocationScheduleAppendix`.
- `components/documents/renewal-documents.tsx`: perataan teks justify pada paragraf surat renewal.
- `components/documents/claim-documents.tsx`: integrasi `HangingIndentText` pada catatan klaim dan riwayat follow-up.
- `components/documents/sppa-documents.tsx`: perataan teks justify pada `KycValue`.
- `tests/documents.test.ts`: penambahan pengujian unit untuk parsing huruf kapital (seperti `A. BUILDINGS`), negative case, dan validasi struktur `InterestBlock` & `ExclusionsBlock`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah khusus.

## Verifikasi

- **Unit Test:** `npx tsx --test tests/*.test.ts` (146/146 pengujian lulus 100%).
- **Typecheck:** `npx tsc --noEmit` bersih tanpa error (0 errors).
- **Production Build:** `npm run build` berhasil membuat artefak produksi Turbopack.
- **E2E Visual (`ego-browser`):**
  - Pengujian DOM dan `getClientRects()` pada baris paragraf panjang Interest Insured membuktikan bahwa setiap baris kalimat kini rata tepi kanan (`diffFromRight: 0px`) dan sejajar secara presisi.
