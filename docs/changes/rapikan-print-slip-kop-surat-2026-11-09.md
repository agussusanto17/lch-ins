# Rapikan Justify Teks Cetak Slip dan Kop Surat Printout

- **Tanggal:** 2026-11-09
- **Branch:** `fix/rapikan-print-slip-kop-surat`
- **PR:** #181
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Hasil cetak dokumen penutupan (Placing Slip, Quotation Slip, Cover Note, Closing Instruction) memiliki perataan teks yang belum rapi (masih *ragged right* / rata kiri pada klausula, coverage, deduktibel, dan tabel info) dan kop surat (header & footer) yang belum presisi:
1. Logo header tergeser ke margin kiri luar karena `-ml-4` (-16px) sehingga tidak lurus dengan batas kiri teks isi dokumen (18mm).
2. Spacing tfoot spacer cetak (`.print-footer-spacer`) sebesar 22mm lebih pendek dari tinggi aktual footer bar navy (~22.5mm - 24mm), mengakibatkan baris teks terakhir di halaman terpotong atau bertabrakan dengan footer navy.
3. Klausula, uraian pertanggungan, dan catatan belum menggunakan perataan `text-justify`.

## Yang berubah

- **Perataan teks justify dokumen slip:**
  - Ditambahkan `text-justify` pada nilai sel dan daftar bernomor `InfoTable`.
  - Ditambahkan `text-justify` pada teks `CoverageBlock`.
  - Ditambahkan `text-justify` pada intro, rincian deduktibel, dan kondisi khusus di `DeductibleBlock`.
  - Ditambahkan `text-justify` pada butir pengecualian di `ExclusionsBlock`.
  - Ditambahkan `text-justify` pada klausula inline dan lampiran klausula (`ClauseWordingAppendix`).
  - Ditambahkan `text-align: justify`, `text-justify: inter-word`, dan `hyphens: auto` pada komponen rich text `.rte-content` dan `.rte-prose`.
  - Ditambahkan `text-justify` pada Subjectivity, Remarks, dan Instruction di `slip-documents.tsx`.
- **Kerapian kop surat (header & footer) saat dicetak:**
  - Menghilangkan `-ml-4` dari `LchLogo` di `components/documents/letterhead.tsx` sehingga logo sejajar sempurna dengan margin kiri 18mm dokumen dan padding 18mm footer navy.
  - Memperlebar `.print-footer-spacer` dari 22mm menjadi 28mm di `app/globals.css`. Ini memberikan ruang bernapas bersih (~5.5mm) di atas footer navy di setiap halaman dokumen A4 berhalaman ganda, mencegah teks tertimpa atau terpotong footer.

## File utama

- `components/documents/letterhead.tsx`: perataan logo `LchLogo` sejajar margin 18mm.
- `app/globals.css`: penyesuaian spacer footer cetak 28mm dan aturan justify pada `.rte-prose`.
- `components/documents/doc-blocks.tsx`: penambahan class justify pada tabel info, coverage, klausula, deduktibel, dan eksklusi.
- `components/documents/slip-documents.tsx`: penambahan class justify pada subjectivity, remarks, dan closing instruction.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada.

## Verifikasi

- **Pengujian Unit:** `npx tsx --test tests/*.test.ts` (118 test lulus).
- **Typecheck:** `npx tsc --noEmit` lolos tanpa error.
- **Build Produksi:** `npm run build` sukses.
- **Verifikasi Visual Browser (A4 CDP Print to PDF):**
  - Generated PDF dan render ke PNG 5 halaman via native PDFKit Swift.
  - Halaman 1-5 terverifikasi: logo lurus pada margin 18mm, klausula dan uraian rata kanan-kiri (justified), dan bagian bawah setiap halaman memiliki ruang bersih di atas footer navy tanpa overlap.

## Catatan untuk yang melanjutkan

- Spacer header tetap 32mm karena logo setinggi ~14.8mm pada top: 10mm menyisakan margin bersih ~7.2mm di atas konten halaman.
- Spacer footer 28mm ideal untuk tinggi footer navy (~22.5mm) dan memberikan ruang pengaman terhadap variasi font metrik printer.
