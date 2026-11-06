# Security satu asuransi tercetak dengan share-nya

- **Tanggal:** 2026-11-06
- **Branch:** `fix/security-satu-asuransi`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Pertanyaan 17 analisa contoh slip LCH: dua contoh (PI LCH dan MOP Rukma)
tanpa bagian Security, sedangkan sistem mencetaknya dari panel asuransi.
Harry menjawab pada 6 November 2026: bila hanya satu asuransi dengan share
100%, Closing Instruction dan Quotation tetap menulis Security dengan share-nya,
tanpa "as Leader" atau "as Member".

Sebelumnya, Security satu asuransi hanya mencetak nama asuransi. Share dan
peran hanya tercetak bila asuransinya lebih dari satu.

## Yang berubah

- **Blok SECURITY** (Quotation, Cover Note, dan Closing Instruction):
  - Share selalu dicetak, jadi satu asuransi tercetak "PT Asuransi Multi
    Artha Guna Tbk 100,00%".
  - Leader atau Member tetap hanya dicetak bila asuransinya lebih dari satu.

## File utama

- `components/documents/doc-blocks.tsx`: `SecurityPanelBlock`.

## Dampak

- **Database:** tidak ada.
- **Dokumen lama:** slip dengan satu asuransi sekarang ikut mencetak share-nya.
- **Env:** tidak ada.
- **Deploy:** setelah merge, sinkronkan fork.

## Verifikasi

- **Browser lokal**, di halaman uji sementara yang sudah dihapus, Closing
  Instruction:
  - satu asuransi tercetak "PT Asuransi Multi Artha Guna Tbk 100,00%" tanpa
    peran;
  - dua asuransi tercetak "60,00% As Leader" dan "40,00% As Member" seperti
    sebelumnya.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Security tetap selalu dicetak** bila panel asuransi terisi, termasuk
  untuk CI yang contohnya tanpa Security. Belum ada pilihan untuk tidak
  mencetaknya, karena Harry tidak memintanya.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
