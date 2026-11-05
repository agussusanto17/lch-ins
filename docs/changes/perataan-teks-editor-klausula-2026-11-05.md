# Tombol perataan teks di editor Master Clauses

- **Tanggal:** 2026-11-05
- **Branch:** `feat/perataan-teks-editor-klausula`
- **PR:** [#133](https://github.com/agussusanto17/lch-ins/pull/133)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

User minta opsi perataan di text editor Master Clauses (5 November 2026),
supaya wording klausula bisa dibuat rata kiri, tengah, kanan, atau kiri-kanan
(justify). Sebelumnya toolbar hanya punya format huruf, sub-judul, daftar, dan
kutipan. Sanitizer juga membuang semua atribut `style`, jadi perataan tidak
akan tersimpan walau editornya mendukung.

## Yang berubah

- Toolbar editor punya empat tombol baru setelah tombol Kutipan: **Rata kiri**,
  **Rata tengah**, **Rata kanan**, dan **Rata kiri-kanan**. Tombol yang aktif
  mengikuti posisi kursor. Shortcut bawaan TipTap juga jalan: Ctrl/Cmd+Shift+L,
  E, R, dan J.
- Perataan berlaku per paragraf (termasuk isi daftar dan kutipan) dan
  sub-judul, disimpan sebagai
  `style="text-align: …"`. Rata kiri adalah bawaan, jadi tombol Rata kiri
  menghapus atribut itu, bukan menyimpannya.
- **Hapus format** sekarang juga menghapus perataan.
- `sanitizeHtml` membiarkan `style` hanya kalau isinya persis satu deklarasi
  `text-align` bernilai `left`, `center`, `right`, atau `justify`, dan hanya di
  `<p>`, `<h2>`, dan `<h3>`. Style lain, atau style campuran, tetap dibuang.
- Dokumen (Placing Slip dan dokumen lain yang mencetak klausula) ikut
  menampilkan perataan karena wording dirender lewat `sanitizeHtml`.
- Editor yang sama dipakai saat mengubah wording klausula di slip, jadi tombol
  perataan juga muncul di sana.

## File utama

- `components/ui/rich-text-editor.tsx`: extension `TextAlign` dan grup tombol
  perataan.
- `lib/sanitize.ts`: pengecualian `text-align` untuk paragraf dan sub-judul.
- `tests/sanitize.test.ts`: tes baru untuk sanitizer.
- `package.json`: dependency `@tiptap/extension-text-align`.

## Dampak

- **Database:** tidak ada migrasi. Wording lama tidak berubah dan tetap rata
  kiri.
- **Env:** tidak ada.
- **Deploy:** dependency baru `@tiptap/extension-text-align` dipasang tepat di
  versi 3.30.1, sama dengan paket TipTap lain. Versi yang lebih baru meminta
  `@tiptap/core` yang lebih baru juga dan membuat `npm install` gagal
  (ERESOLVE).

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 36 lulus, termasuk 3 tes sanitizer baru.
- `npx tsc --noEmit` dan `npm run build` lolos.
- Uji browser di halaman uji sementara (sudah dihapus) yang merender
  `RichTextEditor` dan hasil `sanitizeHtml`: keempat tombol tampil, perataan
  tengah, kanan, dan kiri-kanan tersimpan di HTML dan tampil di render
  dokumen, Rata kiri dan Hapus format menghapus perataan, shortcut
  Ctrl/Cmd+Shift+J berfungsi.

Uji manual di aplikasi:

1. Buka Master Clauses, ubah satu klausula, pilih paragraf, klik Rata tengah,
   lalu simpan.
2. Buka lagi klausulanya: paragraf tetap rata tengah.
3. Pasang klausula itu di slip lalu buka dokumennya: paragraf tampil rata
   tengah, juga di Print / Save PDF.

## Catatan untuk yang melanjutkan

- Isi item daftar dan kutipan juga paragraf, jadi ikut bisa diratakan. Kalau
  nanti menambah tipe blok ke `types` TextAlign, tambahkan tag-nya juga ke
  `ALIGNABLE_TAGS` di sanitizer. Kalau tidak, perataan hilang saat disimpan.
- Klausula yang sudah disalin ke slip menyimpan wording sendiri. Perataan yang
  ditambahkan di Master Clauses setelahnya tidak ikut ke slip lama.
