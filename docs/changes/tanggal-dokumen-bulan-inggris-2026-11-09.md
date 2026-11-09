# Tanggal dokumen slip memakai nama bulan bahasa Inggris

- **Tanggal:** 2026-11-09
- **Branch:** `fix/tanggal-dokumen-bulan-inggris`
- **PR:** [#180](https://github.com/agussusanto17/lch-ins/pull/180)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Jawaban Harry atas pertanyaan konfirmasi no. 10 (9 November 2026): nama
bulan di tanggal dokumen memakai format Inggris, karena slip berbahasa
Inggris.

Tanggal di atas tanda tangan, misalnya "Jakarta, 31 Oktober 2026", masih
memakai nama bulan Indonesia. Bagian lain dokumen yang sama sudah berbahasa
Inggris, misalnya "01 December 2026 to 01 December 2027".

## Yang berubah

- **Keempat dokumen slip** (Placing Slip, Quotation Slip, Draft Cover Note,
  Closing Instruction) mencetak tanggal dokumen dengan `dateEn`, misalnya
  "Jakarta, 31 October 2026". Formatnya sama dengan tanggal periode di dokumen
  itu, termasuk hari dua digit.
- **Dasar tanggal tidak berubah:** tetap tanggal terakhir slip disimpan.
  Harry masih menanyakan posisi tanggal ini, dan usulan tanggal per dokumen
  (release, quoted, closing) menunggu jawabannya.
- **Dokumen berbahasa Indonesia tidak diubah:** renewal notice dan SPPA.

## File utama

- `components/documents/slip-documents.tsx`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 118 lolos.
- `npm run build`: lolos.
- **Uji browser lokal** dengan sesi login sementara: slip
  005/LCH-PLCMT/PS-IAR/VIII/2026, yang terakhir diubah 31 Oktober 2026,
  mencetak "Jakarta, 31 October 2026" di keempat dokumen.

## Catatan untuk yang melanjutkan

- Dasar tanggal dokumen dan kop Lestari Cipta Hokindo untuk dokumen sebelum
  1 September 2025 (jawaban Harry no. 11) bergantung pada jawaban klarifikasi
  no. 10.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
