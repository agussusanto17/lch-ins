# Format CLAUSE WORDINGS, Hanging Indent, dan Text Justify

- **Tanggal:** 2026-11-10
- **Branch:** `fix/clause-wordings-formatting`
- **PR:** # (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Pada dokumen cetak Placing Slip (dan dokumen turunannya), bagian lampiran klausula sebelumnya memakai judul "CLAUSE WORDING" (singular). Selain itu:
1. Penomoran klausula (`1.`, `2.`) belum menerapkan *hanging indentation* yang konsisten: teks isi wording deskriptif klausula ter-reset ke batas margin kiri di bawah nomor urut alih-alih sejajar dengan awal baris judul klausula.
2. Penyelarasan teks (*text alignment*) belum seragam antara judul dan paragraf deskriptif: judul klausula dan kode klausula idealnya rata kiri alami (*natural left alignment*), sedangkan paragraf deskriptif panjang klausula harus rata kanan-kiri (*justified*) dengan `text-justify: inter-word` agar dokumen formal asuransi tampak rapi dan profesional.
3. Inkonsistensi tipografi antara editor Rich Text (TipTap) dan tampilan pratinjau dokumen / cetak PDF.

## Yang berubah

- **Penamaan Standar `CLAUSE WORDINGS`:**
  - Mengubah judul bagian lampiran klausula di dokumen cetak dari `CLAUSE WORDING` menjadi `CLAUSE WORDINGS` (`components/documents/doc-blocks.tsx`).
- **Hanging Indent pada Lampiran Klausula:**
  - Merefaktor struktur Flexbox penomoran lampiran klausula (`ClauseWordingAppendix`). Nomor urut klausula ditempatkan di kontainer penanda (`<span className="shrink-0 select-none font-semibold text-left">{i + 1}.</span>`), sementara judul klausula (`<p className="font-semibold text-left">`) dan isi HTML wording (`<div className="rte-prose">`) ditempatkan bersama-sama di dalam kolom pembungkus fleksibel (`<div className="flex-1 min-w-0">`).
  - Dengan struktur ini, baris teks yang membungkus (*wrapped lines*), baris deductible, dan paragraf-paragraf lanjutan konsisten masuk sejajar (*hanging indent*) relatif terhadap nomor klausula.
- **Penyelarasan Teks Proporsional (Left Title & Justified Paragraphs):**
  - Pada `app/globals.css`, aturan tipografi `.rte-content` (editor TipTap) dan `.rte-prose` (tampilan dokumen cetak/layar) disinkronkan:
    - Judul sub-bagian (`h2`, `h3`) menggunakan `text-align: left`.
    - Paragraf deskriptif (`p`) dan daftar butir (`li`) menggunakan `text-align: justify; text-justify: inter-word;`.
  - Pada daftar ringkasan klausula pra-tanda tangan (`ClausesBlock`), judul klausula menggunakan rata kiri alami (`text-left`) dengan tetap mempertahankan hanging indent terhadap nomor urut.
- **Konsistensi Visual Antara Editor dan Cetak:**
  - Aturan CSS diterapkan simetris pada `.rte-content` dan `.rte-prose` sehingga pengetikan di TipTap, penyimpanan ulang, pratinjau slip, maupun cetak PDF menghasilkan format visual yang persis identik tanpa memodifikasi data teks sumber klausula.

## File utama

- `app/globals.css`: penambahan `text-align: left` untuk judul `h2`/`h3` dan `text-align: justify; text-justify: inter-word;` untuk `p` dan `li` pada `.rte-content` dan `.rte-prose`.
- `components/documents/doc-blocks.tsx`: penamaan `CLAUSE WORDINGS`, penerapan kolom pembungkus `flex-1 min-w-0` untuk hanging indent pada `ClauseWordingAppendix`, serta `text-left` pada judul `ClausesBlock`.
- `tests/documents.test.ts`: pengujian unit otomatis untuk validasi heading `CLAUSE WORDINGS`, struktur hanging indent `flex-1 min-w-0`, serta aturan CSS text alignment rata kiri untuk heading dan justify untuk paragraf.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada.

## Verifikasi

- **Unit Test:** `npx tsx --test tests/*.test.ts` (149/149 pengujian lulus 100%).
- **Typecheck:** `npx tsc --noEmit` bersih tanpa error (0 errors).
- **Production Build:** `npm run build` berhasil membuat artefak produksi Turbopack.
- **E2E Visual & Metrik Geometri (`ego-browser` & CDP):**
  - Pengujian DOM layout dan media print emulasi CDP pada Placing Slip memvalidasi koordinat horizontal:
    - Nomor urut klausula (`numX`): 244px (screen) / 68px (print).
    - Judul klausula (`titleX`): 261px (screen) / 85px (print).
    - Teks paragraf deskriptif (`wordingX`): 263px (screen) / 87px (print).
  - Teks paragraf deskriptif terbukti sejajar dengan judul klausula dan tidak terlempar ke bawah nomor urut (*hanging indent* terverifikasi).
  - Paragraf deskriptif menampilkan properti `text-align: justify` sedangkan judul klausula menampilkan `text-align: left`.

## Catatan untuk yang melanjutkan

- Data HTML wording di database tidak disentuh/dimodifikasi. Transformasi murni dilakukan pada lapisan rendering CSS dan layout DOM React.
- Bila ada komponen baru di masa mendatang yang merender rich text klausula, gunakan kelas `.rte-prose` agar otomatis mewarisi perilaku typography yang sudah dibakukan ini.
