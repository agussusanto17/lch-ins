# Detail tambahan di placing slip

- **Tanggal:** 2026-11-06
- **Branch:** `feat/detail-tambahan-slip`
- **PR:** [#138](https://github.com/agussusanto17/lch-ins/pull/138)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry mengirim 26 contoh slip LCH, dan Agus meminta semuanya dianalisa
sebelum diimplementasi (6 November 2026). Gap terbesar ada di label khas tiap
type of cover yang dicetak sebagai baris tabel detail, misalnya:

- Retroactive Date, Territorial Limit, Jurisdiction (Liability);
- Voyage, Conveyance (Marine Cargo);
- Vessels, Trading Limits (Marine Hull);
- Venue, Tee Off (Hole in One);
- Existing Policy No. (renewal).

Label seperti ini muncul di 24 dari 26 sampel. Tabel detail dokumen sistem
labelnya tetap, jadi isinya hanya bisa masuk Special Conditions. Ini fitur
pertama Tahap 1 rencana implementasi, dan Agus sudah menyetujui Tahap 1 untuk
dikerjakan.

## Yang berubah

- **Master Data > Class of Business:** dialog type of cover punya isian
  "Label Detail Tambahan", satu label per baris.
  - Migrasi mengisi label awal dari contoh slip LCH untuk 15 type of cover:
    PL, PI, CGL, Marine Cargo, MOP, CIT, CIS, FG, Hole In One, MAR,
    Marine Hull, CAR, EAR, PSATSI, dan PA.
  - Label hanya diisi bila masih kosong, dan LCH bisa mengubahnya.
- **Form placing slip:** bagian baru "Detail Tambahan" setelah Informasi
  Dasar, untuk semua COB.
  - Memilih type of cover menambahkan label bawaannya dengan isi kosong.
  - Saat type of cover diganti, baris yang sudah berisi tetap. Baris kosong
    dari type of cover lama dibuang.
  - Label boleh diketik sendiri, dengan saran dari label bawaan semua type of
    cover.
  - Baris bisa diurutkan dan dihapus. Tombol "Tambah label bawaan" menambahkan
    label yang belum ada, termasuk untuk slip lama.
  - Slip dari SPPA langsung mendapat label bawaan type of cover-nya, dan
    "Duplikat jadi draft baru" ikut menyalin baris.
  - Batasnya 40 baris, label 100 karakter, isi 2000 karakter.
- **Dokumen** (keempat dokumen slip): baris yang berisi dicetak sebagai
  "label : isi" di tabel detail, setelah baris bawaan, sesuai urutan di form.
  Isi yang lebih dari satu baris tetap tercetak berbaris. Baris tanpa isi
  tidak dicetak.
- **Audit trail:** kolom baru diberi label Indonesia, dan isi Detail tambahan
  tampil per baris "label: isi". Label kolom dari
  [#137](https://github.com/agussusanto17/lch-ins/pull/137) (keterangan
  periode, type of cover di dokumen) ikut ditambahkan.

## File utama

- `prisma/schema.prisma` dan migrasi `20261106020000_detail_tambahan_slip`.
- `lib/slip-details.ts`: aturan label bawaan, pembersihan data, dan baris
  yang dicetak.
- `components/underwriting/slip-detail-rows.tsx`: isian di form.
- `components/underwriting/placing-slip-form.tsx` dan `slip-model.ts`: label
  bawaan saat type of cover dipilih, ganti COB, dan slip dari SPPA.
- `components/master-data/cob-cover-tab.tsx`, `lib/server/master-data.ts`,
  `app/(app)/master-data/actions.ts`: label di Master Data.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan,
  baca, validasi, dan duplikat.
- `components/documents/doc-blocks.tsx`: cetak di tabel detail.
- `tests/slip-details.test.ts`: enam tes baru.

## Dampak

- **Database:** migrasi berjalan otomatis saat build di Vercel dan VPS.
  - Kolom baru `cover_types.detail_labels` (text[]) dan
    `placing_slips.detail_rows` (jsonb, default `[]`).
  - Label awal masuk ke 15 type of cover.
  - Angka premi tidak tersentuh.
- **Dokumen slip lama:** tidak berubah, karena belum punya Detail tambahan.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal:** migrasi jalan. 15 type of cover mendapat label, dan 10
  slip lama mendapat Detail tambahan kosong.
- **Script uji ke fungsi server** (sudah dihapus):
  - create dan update menyimpan baris;
  - update tanpa field Detail tambahan tidak menghapus isinya;
  - Master Data merapikan label (spasi dan label dobel);
  - menyimpan type of cover tanpa field label tidak mengubah labelnya.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - Slip baru Liability: memilih Public Liability Insurance menambahkan
    Retroactive Date, Territorial Limit, dan Jurisdiction.
  - Retroactive Date diisi, lalu type of cover diganti ke CGL: Retroactive
    Date tetap, label CGL lain masuk tanpa dobel.
  - Urutkan dan hapus bekerja. Tombol "Tambah label bawaan (1)" muncul
    setelah satu label bawaan dihapus.
  - Closing Instruction mencetak Retroactive Date, Territorial Limit, dan
    Jurisdiction (dua baris) setelah Period of Insurance. Baris Co-Insured
    yang kosong tidak dicetak.
  - Dialog type of cover 0901 di Master Data menampilkan labelnya satu per
    baris.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (51 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Posisi cetak:** Detail tambahan selalu setelah baris bawaan. Sampel LCH
  kadang menaruh Retroactive Date tepat setelah Period, atau Existing Policy
  No. di baris paling atas. Kalau Harry minta, perlu aturan posisi per label.
- **Polis dan renewal notice** belum menyalin Detail tambahan dari slip.
- **SPPA Marine Cargo** sudah menyimpan barang, rute, dan alat angkut, tetapi
  belum diisikan otomatis ke baris Voyage atau Conveyance.
- **Tahap 1 berikutnya:** premi flat per objek.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
