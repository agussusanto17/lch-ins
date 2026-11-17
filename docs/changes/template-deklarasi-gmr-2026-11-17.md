# Template deklarasi mengikuti General Marine Report, Admin Fee dan keterangan tersimpan

- **Tanggal:** 2026-11-17
- **Branch:** `feat/template-deklarasi-gmr`
- **PR:** #260
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- PR #258 (catatan `upload-deklarasi-excel-2026-11-17.md`) membuat upload deklarasi MOP dengan template sistem berkolom bahasa Indonesia. General Marine Report dari asuransi juga dibaca langsung.
- Agus, 17 November 2026: template kurang Admin Fee, B/L No., Invoice No., Currency, From, To, Conveyance, Vessel Name, dan Description of Goods. Jumlah Unit tetap dipakai, tapi namanya Interest Insured karena biasanya diisi jumlah container.
- Saat diuji, keterangan pengiriman dari upload ternyata tidak tersimpan. Server hanya menyimpan remarks untuk endorsement dan pembatalan.

## Yang berubah

- **Kolom template** sama dengan General Marine Report: Cert No.*, Date of Issue*, Assured Name, Description of Goods, Conv, Vessel Name, Voyage No, ETD, From, To, Currency, Sum Insured*, Gross Premium, Admin Fee, Internal Ref No., Invoice No., B/L No. Setelahnya ada Kategori Rate (dropdown dari slip), Interest Insured, dan Keterangan. Baris dari laporan asuransi bisa disalin langsung ke template. Judul lama (No. Sertifikat / Deklarasi, Tanggal Deklarasi, Nilai Deklarasi, Premium, Jumlah Unit) tetap dikenali.
- **Admin Fee** disimpan sebagai biaya admin deklarasi (`adminCost`), dari upload maupun form Tambah/Edit deklarasi. Biaya ini tidak menambah premi produksi; Report dan Rekap Produksi tetap membaca premi. Pratinjau upload menampilkan total admin fee.
- **Interest Insured:**
  - kalau isinya angka (jumlah container), angkanya dipakai untuk rate per container;
  - kalau isinya teks seperti "3X20' CONTAINER", isinya hanya dicatat dan tidak dibaca sebagai angka;
  - isinya selalu ikut di keterangan.
- **Keterangan deklarasi tersimpan.** Server sekarang menyimpan remarks untuk tipe Deklarasi. Isinya Keterangan, Description of Goods, Interest Insured, alat angkut, kapal dan voyage, rute, ETD, B/L, invoice, dan ref. Keterangan tampil di bawah nomor sertifikat di Policy Database dan di kolom Keterangan form deklarasi.
- **Petunjuk template** diperbarui untuk kolom-kolom baru.

## File utama

- `lib/declaration-import.ts`: kolom dan judul template, Admin Fee, Interest Insured, keterangan.
- `lib/server/policies.ts`: admin cost dan remarks disimpan untuk Deklarasi.
- `app/(app)/policies/actions.ts`: `adminFee` per baris upload.
- `components/policies/declaration-upload.tsx`: total admin fee di pratinjau.
- `components/policies/policy-form.tsx`: Admin Fee dan Keterangan di form deklarasi.
- `tests/declaration-import.test.ts`

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 272 tes, 272 lolos. Yang diuji:
  - urutan judul template;
  - isi template dibaca lagi lewat ExcelJS, termasuk Admin Fee, Assured Name, dan keterangan pengiriman;
  - Admin Fee dari General Marine Report;
  - Interest Insured berisi angka dan teks.
- **Browser lokal**, polis MOP 023 sementara diberi nomor dan periode seperti produksi (45031126000502, 28 Mei 2026 s/d 28 Mei 2027):
  - template terunduh (`template-deklarasi-45031126000502.xlsx`) dengan 20 judul kolom sesuai urutan di atas;
  - `contoh template upload cargo.xlsx` diupload: 69 deklarasi dengan nilai IDR 25.086.506.220, premi IDR 25.086.506, dan admin fee IDR 690.000;
  - cek database: 69 baris punya admin cost 10.000 dan keterangan pengiriman, misalnya 000499 "KACA packed in Container 3X20" … · Sea SUNGAI MAS V. 53 · Jakarta, Indonesia - Medan, Indonesia · ETD 19/09/2026";
  - form Edit Deklarasi menampilkan Admin Fee 10.000 dan Keterangan;
  - data uji dihapus, dan nomor serta periode polis lokal dikembalikan.

## Catatan untuk yang melanjutkan

- Data pengiriman (kapal, rute, ETD, B/L, invoice) masih tergabung di keterangan. Kalau LCH butuh filter atau report per kapal atau rute, kolom-kolomnya perlu dipisah lewat migrasi.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
