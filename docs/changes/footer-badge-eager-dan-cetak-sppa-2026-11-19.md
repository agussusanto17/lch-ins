# Muat eager badge footer cetak dan perbaiki overflow cetak daftar SPPA

- **Tanggal:** 2026-11-19
- **Branch:** `fix/footer-badge-eager-dan-cetak-sppa`
- **PR:** #288
- **Dikerjakan oleh:** Zero dengan Antigravity

## Latar belakang

- Audit E2E dokumen cetak di `ego-browser` menemukan dua celah kecil:
  1. Gambar badge OJK/APPARINDO di `FooterContent` (`letterhead.tsx`) belum memakai `loading="eager"`, padahal berada di dalam `.print-footer-fixed.hidden.print:block` sehingga sempat terlambat dimuat saat halaman baru terbuka. Selain itu, `[print-color-adjust:exact]` pada `<footer isPrintFixed>` sempat hilang saat refactor PR #236.
  2. Pembungkus tabel pada `SppaExcelDocument` (`/marketing/sppa`) memakai `overflow-x-auto` tanpa `print:overflow-visible`, sehingga kolom kanan tabel terpotong saat diekspor ke PDF.

## Yang berubah

- Menambahkan `loading="eager"` pada gambar badge di `FooterContent` dan `[print-color-adjust:exact] [-webkit-print-color-adjust:exact]` pada `<footer isPrintFixed>` di `components/documents/letterhead.tsx`.
- Menambahkan `print:overflow-visible` pada pembungkus tabel `SppaExcelDocument` di `components/documents/sppa-documents.tsx`.
- Menambahkan asersi regresi di `tests/documents.test.ts`.

## File utama

- `components/documents/letterhead.tsx`: eager loading badge footer cetak dan exact print color.
- `components/documents/sppa-documents.tsx`: reset overflow tabel daftar SPPA saat cetak.
- `tests/documents.test.ts`: pengujian unit regresi.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`
- `npx eslint components/documents/letterhead.tsx components/documents/sppa-documents.tsx`
- `npx tsx --test tests/*.test.ts`
- `npm run build`
- E2E `ego-browser`: cek `hasPrintFooterBadge: true` di semua rute cetak termasuk `/placement/quotation/[id]` dan `/placement/cover-note/[id]`, serta cek PDF `/marketing/sppa`.

## Catatan untuk yang melanjutkan

- `CoverNoteDocument` tetap memakai `letterhead={false}` sesuai keputusan PR #159; aktifkan bila LCH berubah pikiran.
- Untuk Safari/WebKit, keterbatasan pengulangan `position: fixed` saat cetak tetap berlaku (peringatan sudah tampil di `DocumentShell`).
