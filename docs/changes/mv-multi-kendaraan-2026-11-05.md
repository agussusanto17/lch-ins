# Slip Motor Vehicle multi kendaraan (Tahap 2 REQ-036)

- **Tanggal:** 2026-11-05
- **Branch:** `feat/mv-multi-kendaraan`
- **PR:** [#132](https://github.com/agussusanto17/lch-ins/pull/132)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

REQ-036 dari Harry (5 November 2026) juga meminta slip Motor Vehicle dengan
banyak kendaraan yang rate-nya berbeda-beda. Usulan "Multi Lokasi &
Kendaraan" yang disetujui Harry menetapkan:

- Rate casco dan semua perluasan per kendaraan, bukan casco saja.
- TPL dan PA mengikuti format slip satu kendaraan (TPL baris limit dan rate,
  PA Driver dan Passenger), per kendaraan.
- Batas OJK sesuai kategori kendaraan (jenis dan nilai) dan wilayahnya.

Tahap 1 (Property multi lokasi) sudah live lewat
[#129](https://github.com/agussusanto17/lch-ins/pull/129). Ini Tahap 2.

## Yang berubah

- **Data:** baris rate, TPL, dan PA slip Motor Vehicle menunjuk kendaraannya
  (baris Interest) lewat kolom baru `vehicle_item_id`. Menghapus kendaraan ikut
  menghapus barisnya.
- **Slip lama** (migrasi):
  - Semua baris rate, TPL, dan PA menjadi milik kendaraan pertama.
  - Slip dengan beberapa kendaraan dulu memakai satu set rate untuk total TSI.
    Kendaraan lain sekarang mendapat salinan rate casco dan perluasan, jadi
    total premi tetap.
  - TPL dan PA tetap di kendaraan pertama.
  - Batas OJK slip multi kendaraan dihitung ulang per kendaraan.
- **Form:** Rate & Premium slip Motor Vehicle berisi kartu per kendaraan. Tiap
  kartu berisi:
  - Ringkasan kendaraan: nama, nomor polisi, TSI, kategori dan wilayah OJK,
    serta premi.
  - Referensi tarif OJK kendaraan itu.
  - Tabel casco dan perluasan, TPL, dan PA.
  - Kartu bisa dilipat seperti kartu lokasi
    ([#131](https://github.com/agussusanto17/lch-ins/pull/131)).
  - Data kendaraan dan tombol Tambah kendaraan tetap di Interest Insured.
    Kendaraan baru langsung mendapat baris rate, TPL, dan PA sendiri.
- **Premi:** casco dan perluasan = TSI kendaraan × rate. TPL dan PA = limit ×
  rate.
- **Batas OJK:** kategori ditebak dari merek, tipe, dan uraian kendaraan
  beserta TSI-nya. Wilayah diambil dari domisili slip, atau dari nomor polisi
  kendaraan bila domisili kosong.
- **Deductible:** satu daftar per cover untuk semua kendaraan, disimpan di
  kendaraan pertama. Saat kendaraan pertama dihapus, deductible pindah ke
  kendaraan yang menjadi pertama.
- **Validasi release** slip multi kendaraan mengecek TSI dan minimal satu
  rate per kendaraan, dan pesan rate di luar batas OJK menyebut kendaraannya.
- **Dokumen multi kendaraan** (keempat dokumen slip):
  - Kendaraan di INTEREST INSURED dicetak bernomor.
  - "Rate & Premium : As per schedule below" diikuti tabel PREMIUM
    CALCULATION dengan kolom Kendaraan, Objek, TSI / Limit, Cover, Rate, dan
    Premium.
  - Isi tabel: casco dan perluasan dari TSI, lalu TPL dan PA dari limitnya,
    dengan subtotal per kendaraan dan Total Premium.
  - Discount, Admin Cost, Stamp Duty, dan Total Payable dicetak di bawahnya.
  - Slip satu kendaraan tidak berubah.
  - Baris "Rate & Premium : As per schedule below" diberi jarak dari blok di
    atasnya. Ini berlaku juga untuk slip Property multi lokasi, yang
    sebelumnya baris itu menempel ke daftar deductible.
- **Daftar slip:** slip multi kendaraan menulis jumlah kendaraannya.
- **Penyimpanan:** kendaraan yang hanya berisi TSI tetap tersimpan, karena
  rate-nya menempel ke kendaraan itu. Kendaraan yang benar-benar kosong
  dibuang bersama barisnya.
- **Perbaikan batas Loading Rate:** baris Loading Rate Comprehensive dulu ikut
  mendapat batas casco OJK karena namanya memuat "Comprehensive", sehingga
  loading 0,15% ditandai di bawah batas. Loading bukan rate casco (OJK
  mengaturnya sebagai tambahan dari rate dasar), jadi sekarang tidak
  dibandingkan dengan batas casco. Batas yang sempat tersimpan di baris loading
  dihapus lewat migrasi `20261105235500_batas_loading_rate`.

## File utama

- `prisma/schema.prisma` dan migrasi `20261105235000_rate_per_kendaraan`.
- Migrasi `20261105235500_batas_loading_rate`: hapus batas casco yang sempat
  tersimpan di baris Loading Rate Comprehensive.
- `lib/slip-vehicles.ts`: pengelompokan baris per kendaraan, normalisasi,
  nama kendaraan, dan kategori/wilayah OJK per kendaraan.
- `lib/calc.ts`: premi per kendaraan.
- `components/underwriting/slip-model.ts`: batas OJK, deductible, dan
  validasi per kendaraan.
- `components/underwriting/slip-vehicles.tsx`: kartu kendaraan di form.
- `lib/server/placing-slips.ts` dan `lib/server/tariffs.ts`: simpan, muat,
  batas OJK, dan validasi di server.
- `components/documents/doc-blocks.tsx` dan `slip-documents.tsx`: jadwal
  premi per kendaraan.
- `tests/calc.test.ts`: lima tes baru untuk multi kendaraan dan batas
  Loading Rate.

## Dampak

- **Database:** migrasi baru, jalan otomatis saat build di Vercel dan VPS.
  - Kolom `vehicle_item_id` di `slip_rate_lines`.
  - Pemindahan baris slip Motor Vehicle lama ke kendaraannya. Di database
    lokal, slip armada dua kendaraan mendapat 8 baris salinan.
  - Total premi semua slip Motor Vehicle tetap: 812.680.000 dan 8.095.000.
- **Dokumen slip lama:** slip Motor Vehicle lama dengan beberapa kendaraan
  sekarang mencetak jadwal premi per kendaraan. Total premi dan Total Payable
  sama dengan sebelumnya.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Database lokal:** migrasi dijalankan. Slip lama dihitung dengan kode
  sebelum dan sesudah perubahan. Semua sama, kecuali slip armada yang barisnya
  kini terpecah per kendaraan dengan total premi dan Total Payable yang sama.
- **Simpan dan muat** lewat skrip, dengan dua kendaraan plus satu kendaraan
  kosong:
  - Kendaraan kosong dibuang bersama barisnya.
  - Batas casco MPV Kategori 3 dan truk Kategori 6, Wilayah 3.
  - Menghapus kendaraan pertama memindahkan deductible.
  - Menghapus slip ikut menghapus barisnya.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - Kartu kendaraan tampil terlipat dengan ringkasan, dan form tidak dianggap
    berubah saat dibuka.
  - Panel OJK kendaraan 2 hanya mengisi rate kendaraan 2.
  - Kendaraan baru dari Interest Insured langsung punya tabel rate, TPL, dan
    PA.
  - Closing Instruction mencetak jadwal per kendaraan dengan Total Payable
    yang sama.
- **Tes:** dengan angka contoh usulan, premi kendaraan 1 5.395.000, kendaraan
  2 15.290.000, dan total 20.685.000.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (38 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Bergantung pada [#131](https://github.com/agussusanto17/lch-ins/pull/131):**
  branch ini dibuat di atasnya (kartu yang bisa dilipat), jadi #131 perlu
  di-merge dulu.
- **Keadaan buka/tutup kartu kendaraan** dicatat per urutan. Kendaraan yang
  ditambah atau dihapus di Interest Insured tidak menggeser keadaan kartu lain.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
