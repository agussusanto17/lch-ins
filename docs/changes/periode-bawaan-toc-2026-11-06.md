# Periode bawaan per type of cover: lama periode dan teks akhir periode

- **Tanggal:** 2026-11-06
- **Branch:** `feat/periode-bawaan-toc`
- **PR:** [#154](https://github.com/agussusanto17/lch-ins/pull/154)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Jawaban Harry (6 November 2026) atas analisa contoh slip LCH:

- **Pertanyaan 9, single shipment:**
  - Tanggal mulai polis adalah ETD (kapal berangkat) atau stuffing.
  - Tanggal akhir polis 14 hari setelahnya, tapi tidak tercetak. Dokumen
    menulis "until final destination".
  - Label ETD dari [#145](https://github.com/agussusanto17/lch-ins/pull/145)
    sudah benar. Master Open Cover tetap "Period of Insurance".
- **Pertanyaan 15, Hole in One:** periode dari tanggal sampai tanggal, tapi
  bisa juga satu tanggal.

Sebelumnya teks "until final destination" harus diketik penuh di Teks periode
setiap slip, dan tanggal akhir diisi manual.

## Yang berubah

- **Master Data > COB & Cover Type, dialog type of cover**, dua isian baru:
  - **Lama Periode (hari):** expiry date slip terisi otomatis dari inception
    date. Kosong berarti tidak otomatis.
  - **Teks Akhir Periode di Dokumen:** pengganti tanggal akhir di dokumen.
- **Form placing slip:**
  - Mengisi atau mengubah inception date ikut mengisi expiry date, bila type
    of cover punya lama periode. Expiry date yang sudah diubah sendiri tidak
    ditimpa.
  - Inception date diberi keterangan, misalnya "Expiry date otomatis 14 hari
    setelah inception date".
  - Isian baru "Teks akhir periode di dokumen". Nilai awalnya dari type of
    cover saat dipilih, dan bisa diubah per slip.
- **Dokumen:** bila teks akhir periode diisi, baris periode tercetak tanggal
  mulai lalu teks itu, misalnya "23 October 2026 until final destination".
  - Tanggal akhir dan keterangan periode tidak ikut tercetak, karena
    keterangan seperti "both days" mengacu ke dua tanggal.
  - Teks periode dari #145 tetap menang, misalnya untuk beberapa tanggal ETD.
- **Migrasi:**
  - Marine Cargo (0323): 14 hari dan "until final destination".
  - Hole In One (1209): 0 hari, jadi expiry date otomatis sama dengan inception
    date dan tercetak satu tanggal. Periode beberapa hari tetap bisa diisi.

## File utama

- `prisma/schema.prisma` dan migrasi `20261106194000_periode_bawaan_toc`:
  kolom `cover_types.period_days`, `cover_types.period_end_text`, dan
  `placing_slips.period_end_text`.
- `components/underwriting/slip-model.ts`:
  - `autoExpiryDate`;
  - `slipPeriodRow` dengan teks akhir periode;
  - `nextCoverDefault`, yaitu `nextPeriodLabel` yang diganti nama karena
    dipakai juga untuk teks akhir periode.
- `components/underwriting/placing-slip-form.tsx`: tanggal akhir otomatis dan
  isian teks akhir periode.
- `components/master-data/cob-cover-tab.tsx`, `lib/server/master-data.ts`,
  `app/(app)/master-data/actions.ts`, `lib/server/form-options.ts`: isian
  Master Data.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan,
  baca, validasi, dan duplikat.
- `tests/calc.test.ts`: dua tes baru.

## Dampak

- **Database:** migrasi menambah tiga kolom, dan mengisi Marine Cargo dan Hole
  In One. Jalan otomatis saat build di Vercel dan VPS.
- **Slip lama:** tidak berubah. Teks akhir periodenya kosong, jadi tetap
  mencetak tanggal mulai dan akhir.
- **Polis dari slip single shipment:** mendapat tanggal akhir 14 hari setelah
  ETD, sesuai jawaban Harry.
- **Env:** tidak ada.
- **Deploy:** sebaiknya merge setelah #152 supaya urutan migrasi sama dengan
  urutan merge. Setelah itu sinkronkan fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus):
  - Teks akhir periode dan tanggal akhir slip tersimpan dan terbaca.
  - Lama periode dan teks akhir periode di Master Data bisa diisi, tetap saat
    tidak dikirim, dan bisa dikosongkan.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - **Closing Instruction single shipment:** "Estimated Time of Departure
    (ETD) : 23 October 2026 until final destination".
  - **Form Marine Cargo:**
    - Memilih type of cover mengisi label ETD dan "until final destination".
    - Inception 23 Oct 2026 menjadikan expiry 6 Nov 2026. Inception digeser ke
      25 Oct, expiry ikut menjadi 8 Nov.
    - Expiry yang diubah sendiri ke 30 Nov tetap 30 Nov saat inception
      diubah lagi.
  - **Form Hole In One:** label Date of Tournament. Inception 29 Jul 2026
    menjadikan expiry 29 Jul 2026, dengan keterangan "satu hari".
  - **Master Data:** dialog Marine Cargo menampilkan label ETD, 14 hari, dan
    "until final destination".
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Tanggal stuffing:** kalau dipakai sebagai tanggal mulai, cukup diisi di
  inception date. Sistem tidak membedakan ETD dan stuffing.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
