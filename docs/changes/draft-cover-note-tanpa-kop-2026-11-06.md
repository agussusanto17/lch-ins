# Draft Cover Note tanpa kop surat broker

- **Tanggal:** 2026-11-06
- **Branch:** `fix/draft-cover-note-tanpa-kop`
- **PR:** #<nomor> (isi setelah PR dibuka)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

User mengirim contoh draft Cover Note (Motor Vehicle, 6 November 2026) dengan
logo PT. LCH Insurance Brokers dan nomor cover note dicoret hijau. Draft Cover
Note harus tercetak tanpa kop surat broker dan tanpa nomor.

Ini membalik keputusan sebelumnya. PR #88
([kop-surat-seluruh-dokumen-2026-11-03.md](kop-surat-seluruh-dokumen-2026-11-03.md))
menambahkan kop ke Cover Note, dan saat SIT-053 user memutuskan kop tetap
dipakai ([simpan-softcopy-polis-2026-11-06.md](simpan-softcopy-polis-2026-11-06.md)).
Contoh baru ini menggantikan keputusan itu.

## Yang berubah

- Cover Note tidak lagi menampilkan logo LCH, baik di layar maupun di header
  cetak yang berulang di setiap halaman.
- Baris nomor di bawah judul `COVER NOTE` dihapus, termasuk placeholder
  `No. ....` saat nomor belum ada.
- Ruang kosong header cetak (32 mm) tetap ada, jadi isi dokumen tidak naik ke
  tepi kertas.
- Footer navy beralamat tetap tercetak. Contoh hanya mencoret bagian atas.
- Placing Slip, Quotation Slip, Closing Instruction, dan dokumen lain tetap
  memakai kop seperti sebelumnya.

## File utama

- `components/documents/document-shell.tsx`: prop baru `letterhead` (default
  `true`). Kalau `false`, logo header cetak berulang tidak dirender.
- `components/documents/doc-blocks.tsx`: `number` di `DocTitle` jadi opsional.
  Baris nomor hanya dirender kalau ada isinya.
- `components/documents/slip-documents.tsx`: `CoverNoteDocument` memakai
  `letterhead={false}`, tanpa `<Letterhead />` dan tanpa nomor.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` lolos.
- `npx tsx --test tests/*.test.ts`: 79 lolos.
- `npm run build` lolos.
- Browser lokal (`/underwriting/cover-note/<id>`, DB lokal):
  - layar: judul `COVER NOTE` tanpa logo dan tanpa baris nomor;
  - media print: `.print-header-fixed` tidak ada, footer navy tetap tampil;
  - PDF Chrome halaman 1 tanpa kop, footer tetap ada;
  - `/underwriting/slip/<id>` tetap menampilkan logo di header cetak.

## Catatan untuk yang melanjutkan

- `derivedDocNumber(..., "CN")` tidak dipakai lagi oleh dokumen. Tipe `"CN"`
  di `slip-model.ts` dan `lib/format.ts` dibiarkan, karena bisa dipakai lagi
  kalau LCH meminta nomor di versi final.
- Branch ini dibuat dari `main` sebelum PR #155 dan #156 di-merge. Ketiganya
  mengubah `document-shell.tsx` di bagian berbeda, jadi PR yang di-merge
  belakangan mungkin perlu rebase.
- Belum ada pembedaan draft dan final untuk Cover Note. Semua Cover Note
  sekarang dicetak tanpa kop.
