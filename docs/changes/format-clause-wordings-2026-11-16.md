# Format Clause Wordings: nomor menggantung, rata kiri

- **Tanggal:** 2026-11-16
- **Branch:** `fix/format-clause-wordings`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Masalah ini dilaporkan dari Closing Instruction 006/LCH-PLCMT/CI-BIBI/XI/2026, di klausula
Communicable Disease Exclusion (LMA 5397). Wording klausula dari editor menyimpan satu
paragraf berisi beberapa baris `<br>`. Di dokumen ada dua masalah:

- **Nomor tidak menggantung.** Baris bernomor (`2.1`, `2.2`) dan baris lanjutannya
  (`resulting from…`, `organisms, and`) mulai di kolom yang sama.
- **Teks di-justify.** Baris yang diputus `<br>` jadi renggang.

LCH meminta format seperti wording aslinya: nomor di kiri, sedangkan baris lanjutan dan
baris hasil wrap sejajar dengan awal kalimat.

## Yang berubah

- **Baris bernomor jadi butir sendiri.** Nomor yang dikenali: `1.`, `1)`, `2.1`, `2.1.3`,
  `(a)`, `a.`, `(iv)`, dan `iv.`.
  - Baris tanpa nomor ikut butir sebelumnya dan menjorok sejajar dengan kalimat.
  - Butir dari paragraf yang sama tidak diberi jarak tambahan.
  - Paragraf tanpa baris bernomor tidak diubah, misalnya "LMA5397 / 29 April 2020".
  - Tanggal seperti "29 April" dan angka seperti "1.000.000" tidak dianggap nomor.
- **Wording di dokumen rata kiri dan tanpa pemenggalan kata.** Alignment yang diatur
  pengguna di editor tetap dihormati.
- **Berlaku untuk keempat dokumen slip:** Placing Slip, Quotation Slip, Cover Note, dan
  Closing Instruction, karena keempatnya memakai `ClauseWordingAppendix`.
- **Editor wording tidak berubah.** Paragraf di editor tetap justify.
- **Data di database tidak diubah.** Format hanya diterapkan saat dokumen ditampilkan.

## File utama

- `lib/document-format.ts`: `hangNumberedWording()` memecah baris bernomor jadi butir
  menggantung.
- `components/documents/doc-blocks.tsx`: `ClauseWordingAppendix` memakai
  `hangNumberedWording`, dan kelas `text-justify` dilepas.
- `app/globals.css`: `.rte-prose` rata kiri, ditambah aturan flex untuk `p[data-hang]`.
- `tests/documents.test.ts`: test `hangNumberedWording` ditambah, dan test alignment
  disesuaikan.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` lolos. `npx tsx --test tests/*.test.ts` lolos (259 test).
- Cek di browser lokal dengan HTML wording LMA 5397 yang sama persis dengan slip 006 di
  produksi. Data uji ini sudah dihapus lagi.
  - **Tampilan layar dan mode cetak:** nomor `1.`, `2.`, `2.1`, `2.2`, `2.3` berada di
    satu kolom.
  - **Baris lanjutan menjorok sejajar kalimat**, termasuk `resulting from…`,
    `concurrently…`, dan `organisms, and`.
  - **Teks rata kiri.**

## Catatan untuk yang melanjutkan

- Pembacaan nomor hanya untuk teks polos di awal baris. Nomor yang dibungkus tag,
  misalnya `<strong>1.</strong>`, dianggap baris biasa.
- Daftar `<ol>`/`<ul>` dari editor tidak disentuh, karena sudah punya indentasi sendiri.
- Catatan terkait: `clause-wordings-formatting-2026-11-10.md` (PR #200) dulu membuat
  paragraf wording justify. Untuk dokumen, aturan itu diganti oleh perubahan ini.
