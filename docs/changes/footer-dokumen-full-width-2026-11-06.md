# Footer dokumen penuh di semua dokumen cetak

- **Tanggal:** 2026-11-06
- **Branch:** `fix/footer-dokumen-full-width`
- **PR:** #155
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Audit footer di 10 dokumen cetak (Placing Slip, Quotation, Cover Note, Closing,
SPPA detail dan daftar, Renewal detail dan daftar, Klaim detail dan daftar)
menemukan dua masalah di tampilan layar. Hasil cetak tidak bermasalah.

- Daftar Klaim dan Detail Klaim (PR #149) tidak punya footer navy di layar.
  Footer layar dipasang manual di setiap dokumen lewat `<PrintedAt />`, dan
  dua dokumen klaim lupa memasangnya.
- Di layar sempit, isi dokumen yang lebar (tabel, judul, isian panjang)
  melebarkan sel tabel layout melewati kartu. Footer ikut melebar, lalu
  dipotong `overflow-hidden` di kartu, sehingga badge OJK/APPARINDO di kanan
  terpotong bersama sebagian isi dokumen.

## Yang berubah

- Footer layar sekarang dipasang sekali oleh `DocumentShell`, di luar tabel
  layout cetak. Setiap dokumen yang memakai `DocumentShell`, termasuk dokumen
  baru nanti, otomatis punya footer selebar kartu dan menempel di bawah.
  Pemanggilan `<PrintedAt />` per dokumen dihapus supaya tidak dobel.
- Kartu dokumen bisa digeser ke samping (`overflow-x-auto`) di layar sempit,
  tidak lagi memotong isi. Tabel layout memakai `table-fixed` supaya selnya
  tetap selebar kartu, sehingga footer KYC di tengah dokumen SPPA juga tetap
  pas.
- Footer cetak (`print-footer-fixed`) tidak berubah.

## File utama

- `components/documents/document-shell.tsx`: footer layar, `overflow-x-auto`,
  `table-fixed`.
- `components/documents/slip-documents.tsx`,
  `components/documents/renewal-documents.tsx`,
  `components/documents/sppa-documents.tsx`: hapus `<PrintedAt />` per
  dokumen.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build` lolos.
- Uji di browser (DB lokal, user admin), 10 dokumen di atas:
  - lebar 1280 dan 390: setiap dokumen punya satu footer layar dengan tepi
    kiri dan kanan sama dengan kartu, dan menempel di dasar kartu. SPPA
    detail punya dua: footer KYC dan footer dokumen. Halaman tidak melebar ke
    samping;
  - PDF Chrome (`Page.printToPDF`, A4): jumlah halaman sama dengan sebelum
    perubahan, footer navy penuh selebar kertas di setiap halaman, dan footer
    layar tidak ikut tercetak.

## Catatan untuk yang melanjutkan

- Dokumen baru cukup dibungkus `DocumentShell`. Jangan tambah `<PrintedAt />`
  sendiri, nanti footernya dobel.
- `KycFooter` di SPPA tetap terpisah karena warnanya beda (navy KYC) dan
  posisinya di tengah dokumen, sebelum halaman SPPA.
