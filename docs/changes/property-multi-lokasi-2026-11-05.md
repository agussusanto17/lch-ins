# Slip Property multi lokasi (Tahap 1 REQ-036)

- **Tanggal:** 2026-11-05
- **Branch:** `feat/property-multi-lokasi`
- **PR:** [#129](https://github.com/agussusanto17/lch-ins/pull/129)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry meminta satu slip Property bisa punya banyak lokasi risiko, masing-masing
dengan okupasi dan rate sendiri (REQ-036, 5 November 2026). Usulan desain
"Multi Lokasi & Kendaraan" disetujui Harry di hari yang sama. Ini Tahap 1,
Property. Tahap 2 (Motor Vehicle per kendaraan) belum dikerjakan.

Keputusan dari usulan yang dipakai di sini:

- **Business Interruption:** per lokasi, boleh kosong. Rate BI otomatis per
  lokasi: BI PAR = FLEXAS + FWTWD + RSMDCC + Others lokasi itu, BI EQVET =
  EQVET lokasi itu.
- **Sum insured:** beberapa item per lokasi, dengan subtotal per lokasi.
- **Deductible:** satu daftar per cover untuk semua lokasi. Yang beda per
  lokasi ditulis di teksnya, misalnya "Nil (for Location 1)".
- **Dokumen (Opsi B):** slip multi lokasi mencetak "Rate & Premium : As per
  schedule below" dan tabel premi per lokasi. Slip satu lokasi tetap mencetak
  bagian RATE seperti sebelumnya.

## Yang berubah

- **Data lokasi:**
  - Tabel baru `slip_locations` berisi alamat, okupasi, nama okupasi di slip,
    dan kelas konstruksi.
  - Baris sum insured Section 1 dan 2 serta baris rate menunjuk lokasinya
    lewat `location_id`.
  - Okupasi, risk location, dan kelas di `placing_slips` tetap diisi dari
    lokasi pertama, jadi polis, daftar slip, dan pencarian tetap membaca satu
    nilai. Slip dengan beberapa lokasi menulis semua alamat bernomor di risk
    location, dan nilai itu ikut ke polis yang dibuat dari slip.
- **Form:**
  - Bagian "Sum Insured" menjadi "Lokasi & Sum Insured". Tiap kartu lokasi
    berisi risk location, okupasi OJK, nama okupasi di slip, kelas
    konstruksi, sum insured Section 1 dan 2, referensi tarif OJK, dan tabel
    rate lokasi itu.
  - Ada tombol Tambah lokasi dan Hapus lokasi. Okupasi, risk location, dan
    kelas konstruksi tidak lagi diisi di Informasi Dasar dan Detail Coverage
    untuk Property. Indemnity Period tetap satu untuk seluruh slip.
  - Bagian Rate & Premium Property hanya berisi total, diskon, admin cost,
    dan stamp duty.
  - Deductible per cover tetap satu daftar. Slip multi lokasi menampilkan
    petunjuk menulis lokasinya di teks.
- **Premi:** tiap baris rate memakai sum insured lokasinya. Batas FLEXAS
  mengikuti okupasi dan kelas lokasi itu, dan batas gempa dan banjir di server
  mengikuti alamat lokasi itu.
- **Validasi release:** slip multi lokasi mengecek alamat, okupasi, kelas
  konstruksi, dan sum insured tiap lokasi, misalnya "Pilih okupasi OJK untuk
  lokasi 2." Rate di luar batas OJK disebut lokasinya. Slip satu lokasi
  memakai pesan yang sama seperti sebelumnya.
- **Dokumen** (Placing Slip, Quotation Slip, Cover Note, Closing Instruction),
  untuk slip multi lokasi:
  - Occupation dan Risk(s) Location dicetak bernomor. Tiap lokasi mencetak
    sum insured-nya. Construction Class dicetak sekali bila semua lokasi
    sama.
  - Item di INTEREST INSURED diawali nomor lokasinya.
  - PREMIUM CALCULATION berupa tabel dengan kolom Lokasi, Objek, Sum
    Insured, Cover, Rate, dan Premium. PAR dan EQVET terpisah, lalu Discount
    (kalau ada), Policy Cost, Stamp Duty, dan Grand Total Premium
    (PAR+EQVET). Policy Cost dan Stamp Duty dikali jumlah polis yang
    berpremi.
  - Bagian RATE tidak dicetak.
- **Daftar slip:** slip multi lokasi menulis jumlah lokasinya di bawah
  okupasi. Pencarian ikut membaca okupasi semua lokasi.
- **Duplikat slip** ikut menyalin lokasinya.

## File utama

- `prisma/schema.prisma` dan migrasi `20261105234500_lokasi_slip_property`:
  tabel `slip_locations`, kolom `location_id`, dan pemindahan slip lama.
- `lib/slip-locations.ts`: pengelompokan baris per lokasi, normalisasi slip,
  dan teks risk location bernomor. Dipakai form, perhitungan, server, dan
  dokumen.
- `lib/calc.ts`: premi dan rate BI per lokasi.
- `components/underwriting/slip-model.ts`: tambah, hapus, dan ubah lokasi,
  batas FLEXAS per lokasi, dan validasi release per lokasi.
- `components/underwriting/slip-locations.tsx`: kartu lokasi di form.
- `lib/server/placing-slips.ts`: simpan dan muat lokasi.
- `lib/server/tariffs.ts`: batas OJK dan validasi release per lokasi di
  server.
- `components/documents/doc-blocks.tsx` dan `slip-documents.tsx`: cetakan
  multi lokasi.
- `tests/calc.test.ts`: lima tes baru untuk multi lokasi.

## Dampak

- **Database:** migrasi baru, jalan otomatis saat build di Vercel dan VPS.
  - Membuat tabel `slip_locations` dan kolom `location_id` di `slip_items`
    dan `slip_rate_lines`. Menghapus lokasi ikut menghapus baris sum insured
    dan rate-nya.
  - Setiap slip Property yang sudah ada mendapat satu lokasi dari okupasi,
    risk location, dan kelas slip. Baris sum insured Section 1 dan 2 serta
    baris rate-nya ditautkan ke lokasi itu.
  - Di database lokal: 4 slip Property mendapat 4 lokasi, dengan 12 baris
    sum insured dan 28 baris rate tertaut.
- **Dokumen slip lama:** tidak berubah, karena slip lama menjadi slip satu
  lokasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal:** migrasi dijalankan. Slip lama dihitung ulang dengan kode
  sebelum dan sesudah perubahan, dan hasilnya identik untuk 10 slip: premi,
  total payable, rate, risk location, okupasi, deductible, dan jumlah isu
  release.
- **Simpan dan muat** lewat skrip, dengan slip contoh usulan (Ruko 2971 dan
  Gudang 29371 di Makassar):
  - Premium PAR 11.422.200, EQVET 14.400.000, dan Grand Total 23.339.980,
    sama dengan contoh di usulan.
  - Batas FLEXAS lokasi 1 0,368–0,460 dan lokasi 2 1,127–1,260.
  - Menghapus lokasi pertama memindahkan deductible ke lokasi berikutnya.
  - Menghapus slip ikut menghapus lokasinya.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - Kartu lokasi tampil dan form tidak dianggap berubah saat dibuka.
  - Tambah dan hapus lokasi berjalan. Panel OJK lokasi 2 hanya mengisi rate
    lokasi 2.
  - Rate BI lokasi tanpa Section 2 kosong dengan keterangan "Otomatis
    setelah sum insured Section 2 diisi".
  - Deductible per cover tetap tujuh baris.
  - Total Payable sama dengan hitungan manual.
  - Closing Instruction mencetak okupasi dan lokasi bernomor serta tabel
    premi per lokasi. Totalnya cocok dengan hitungan manual.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (29 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Bergantung pada [#127](https://github.com/agussusanto17/lch-ins/pull/127):**
  branch ini dibuat di atas `fix/premi-bi-tanpa-section-2`, jadi #127 perlu
  di-merge dulu.
- **Rate per mil:** sejak
  [#126](https://github.com/agussusanto17/lch-ins/pull/126) dokumen mencetak
  rate per mil. Kolom Rate tabel premi multi lokasi memakai `rateText` dari
  `calculateParEqvet`, jadi ikut per mil, misalnya `0,368000‰`. Baris dengan
  loss limit ditulis `0,450000‰ × 85%`.
- **Slip contoh:** slip dari seed data contoh tidak punya baris lokasi.
  `slipLocations` membacanya sebagai satu lokasi dari isian slip, dan lokasi
  itu baru tersimpan saat slip disimpan ulang.
- **Data selama deploy:** slip yang disimpan oleh kode lama, tepat setelah
  migrasi jalan dan sebelum kode baru aktif, bisa punya okupasi slip yang
  berbeda dari lokasinya. Jendelanya hanya beberapa menit.
- **Tahap 2 (Motor Vehicle per kendaraan)** belum dikerjakan dan menunggu
  aba-aba Agus.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
