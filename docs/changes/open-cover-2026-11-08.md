# Open cover: MOP dan container, polis per deklarasi

- **Tanggal:** 2026-11-08
- **Branch:** `feat/open-cover`
- **PR:** [#168](https://github.com/agussusanto17/lch-ins/pull/168)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini Tahap 3 nomor 15 dari analisa 26 contoh slip LCH (6 November 2026).
Tiga contoh belum bisa terbit:

- **MOP Rukma Padaya Trans (24, 25), TOC 0311:** CI hanya berisi rate per
  kategori (DRY SHIPMENT 0,075%, REEFER SHIPMENT 0,0975%, atau ekspor 0,11%)
  dan Limit of Liability IDR 75 M any one conveyance. Tidak ada TSI maupun
  premi.
- **Container open cover Salam Pacific (17):** tarif IDR per container per
  ukuran dan jenis muatan, limit per ukuran container, dan "premium as per
  declaration". Menurut jawaban Harry no. 6, container masuk Moveable All
  Risk (1213 MAR).
- **Masalahnya:** release mewajibkan TSI dan rate, dan premi dihitung dari
  nilai × rate. Akibatnya angka yang tercetak salah, misalnya limit 75 M ×
  0,075%.
- **Jawaban Harry 6 November 2026:** MOP adalah satu polis per deklarasi.

## Yang berubah

- **Open cover sebagai flag:**
  - Di type of cover (Master Data, COB & Cover Type): 0311 MOP sudah
    dinyalakan oleh migrasi.
  - Di slip: nilainya ikut type of cover saat dipilih, dan bisa dinyalakan
    per slip untuk COB selain Property dan Motor Vehicle, misalnya MAR
    container.
- **Form slip open cover, bagian Rate & Premium:**
  - Tabel rate per kategori, dengan dasar **% nilai deklarasi** atau **tarif
    per unit** plus satuannya, misalnya container.
  - Tabel rate per objek dan panel premi (diskon, admin cost, stamp duty,
    total payable) tidak tampil.
  - Header form menulis "Open cover", bukan Total Sum Insured.
  - Nilai brokerage tertulis "Per deklarasi".
  - Limit dicatat sebagai objek "Limit saja" di Interest Insured, fitur yang
    sudah ada sejak #141.
- **Release:** TSI dan premi tidak diminta. Yang diminta minimal satu rate
  open cover berkategori, dan rate yang terisi harus punya kategori. Aturan
  ini berlaku di form dan di server.
- **Premi slip open cover selalu 0,** walaupun objeknya bernilai dan
  ber-rate.
- **Cetakan keempat dokumen slip:**
  - Blok RATE mencetak daftar kategori, misalnya "DRY SHIPMENT : 0,075%" atau
    "20 FT - Others : IDR 100.000 per container", lalu "Premium : As per
    declaration".
  - Total Sum Insured dan Total Payable tidak dicetak.
  - Brokerage tercetak tanpa nominal.
- **Polis dari slip open cover adalah satu deklarasi:**
  - Slip yang sama bisa dipakai berkali-kali. Slip biasa tetap satu polis,
    di form dan di server.
  - Total Sum Insured, premi, dan periode diisi per deklarasi.
  - Mata uang, brokerage, dan data lain tetap dari slip dan terkunci.
  - Keterangan premi menampilkan rate open cover sebagai acuan hitung.

## File utama

- `prisma/schema.prisma` dan migrasi `20261108110000_open_cover`:
  - `cover_types.open_cover`;
  - `placing_slips.open_cover` dan `open_cover_rates` (JSONB);
  - 0311 dinyalakan.
- `lib/open-cover.ts`: `usesOpenCover`, pembersihan rate, teks cetak,
  pengecekan release, dan `openCoverPremium`.
- `components/underwriting/open-cover-rates.tsx` dan `placing-slip-form.tsx`:
  editor rate dan switch open cover.
- `components/underwriting/slip-model.ts`, `lib/server/tariffs.ts`, dan
  `lib/calc.ts`: release dan premi.
- `components/documents/doc-blocks.tsx` dan `slip-documents.tsx`:
  `OpenCoverRateBlock`, TSI disembunyikan, dan brokerage tanpa nominal.
- `components/policies/policy-form.tsx` dan `lib/server/policies.ts`:
  deklarasi berulang dari satu slip.
- `components/master-data/cob-cover-tab.tsx` dan `lib/server/master-data.ts`:
  switch Open cover per type of cover.
- `lib/server/placing-slips.ts` dan `app/(app)/underwriting/actions.ts`:
  simpan, baca, dan duplikat.
- `tests/open-cover.test.ts`.

## Dampak

- **Database:**
  - Tiga kolom baru, semuanya dengan nilai bawaan.
  - Type of cover 0311 menjadi open cover.
  - Slip dan polis lama tidak berubah.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 106 lolos. Empat test baru:
  - pembersihan, teks cetak, dan premi per deklarasi (dry IDR 1 M = 750.000;
    10 container × 100.000 = 1.000.000);
  - open cover hanya untuk COB selain Property dan Motor Vehicle;
  - release tanpa TSI;
  - premi slip tetap 0.
- `npm run build`: lolos.
- **Uji server lokal** dengan skrip sementara:
  - Slip MOP dengan dua rate dan limit 75 M "Limit saja" lolos validasi
    release server tanpa TSI.
  - Dua polis deklarasi dari slip yang sama tersimpan (premi 750.000 dan
    1.950.000).
  - Slip biasa tetap menolak polis kedua.
- **Uji browser** dengan sesi login lokal sementara:
  - Header form "Open cover".
  - Tambah rate "20 FT - Others" tarif per unit 100 per container, lalu
    tersimpan.
  - Cetakan Placing Slip:
    - RATE tiga kategori, lalu "Premium : As per declaration";
    - tanpa Total Sum Insured dan Total Payable;
    - "Brokerage 12,50% (EXCL. VAT)" tanpa nominal.
  - Form polis dari slip itu:
    - TSI dan premi aktif, brokerage terkunci;
    - keterangan premi menampilkan rate;
    - deklarasi tersimpan;
    - slip masih bisa dipilih untuk deklarasi berikutnya.
- Data uji lokal sudah dihapus.

## Catatan untuk yang melanjutkan

- **Deposit premium atau premi minimum** belum ada. Harry belum menjawab
  (pertanyaan konfirmasi no. 1).
- **Premi deklarasi masih diketik manual** dengan acuan rate di keterangan.
  Fungsi hitungnya (nilai × rate atau unit × tarif) sudah tersedia sebagai
  `openCoverPremium` kalau mau dibuatkan kalkulator di form polis.
- **Continuity bonus container (15%)** dan "weekly declaration" belum
  dihitung; saat ini cukup ditulis di Special Conditions.
- **Klausul MOP dan container** yang belum ada di master tetap urusan data
  (pertanyaan konfirmasi no. 4).
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
