# Status tombol toolbar editor klausula mengikuti kursor

- **Tanggal:** 2026-11-05
- **Branch:** `fix/status-tombol-toolbar-editor`
- **PR:** [#135](https://github.com/agussusanto17/lch-ins/pull/135)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Uji end to end fitur perataan teks
([perataan-teks-editor-klausula-2026-11-05.md](perataan-teks-editor-klausula-2026-11-05.md),
PR #133) di aplikasi menemukan bug di toolbar editor. Tombol yang tampil aktif
tidak berubah saat kursor pindah paragraf. Contohnya, kursor di paragraf rata
kanan tapi tombol Rata tengah yang tetap menyala. Bug ini sudah ada sebelum
fitur perataan dan kena ke semua tombol (Tebal, Miring, sub-judul, daftar,
dan lain-lain). Tombol Undo dan Redo juga tidak ikut aktif atau nonaktif.

Penyebabnya, TipTap 3 tidak me-render ulang komponen saat seleksi atau isi
berubah (`shouldRerenderOnTransaction` bawaannya mati). Status tombol hanya
dihitung saat komponen kebetulan di-render ulang.

## Yang berubah

- Toolbar membaca status lewat `useEditorState`. Komponen di-render ulang
  setiap kali status tombol berubah (aktif atau tidak, Undo dan Redo bisa
  dipakai atau tidak, editor kosong atau tidak), tapi tidak di setiap
  ketikan.
- Bagian editor yang tampil dipisah ke komponen `EditorFrame`, yang baru
  dibuat setelah editor siap. Kalau `useEditorState` dipanggil saat editor
  masih `null`, hasilnya tetap `null` sampai ada transaksi pertama, dan editor
  terjebak di skeleton.
- Placeholder "Tulis wording klausula…" ikut hilang dan muncul sesuai isi
  editor.

## File utama

- `components/ui/rich-text-editor.tsx`: langganan status toolbar dan komponen
  `EditorFrame`.
- `docs/changes/perataan-teks-editor-klausula-2026-11-05.md`: pelurusan
  fakta soal salinan klausula di slip (lihat di bawah).

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: 41 lulus.
- `npx tsc --noEmit` dan `npm run build` lolos.
- Uji browser di Master Clauses, dengan DB lokal:
  - kursor di paragraf rata tengah, rata kiri-kanan, lalu rata kanan: tombol
    yang aktif ikut berganti sesuai paragraf;
  - Cmd+B menyalakan tombol Tebal;
  - setelah mengetik, Undo aktif. Setelah Undo, Undo nonaktif dan Redo aktif.

## Catatan untuk yang melanjutkan

- Status tombol baru dihitung di selector `useEditorState`. Kalau menambah
  tombol dengan status aktif, masukkan ke `TOOL_GROUPS` supaya ikut dihitung.
  Jangan memanggil `editor.isActive` langsung saat render, karena hasilnya
  tidak di-update.
- Uji end to end juga meluruskan satu fakta di catatan PR #133. Klausula slip
  yang wording-nya tidak diubah ikut memakai wording master terbaru, termasuk
  perataan, setelah slip disimpan ulang. Sebelum slip disimpan ulang, dokumen
  slip masih menampilkan salinan lama. Hanya klausula yang wording-nya diubah
  di slip yang menyimpan salinan sendiri.
