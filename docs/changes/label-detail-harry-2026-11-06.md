# Label Detail tambahan sesuai jawaban Harry

- **Tanggal:** 2026-11-06
- **Branch:** `feat/label-detail-harry`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Pertanyaan 1 analisa contoh slip LCH menanyakan label khas per type of cover
yang dicetak sebagai baris berlabel di tabel detail (fitur Detail tambahan,
[#138](https://github.com/agussusanto17/lch-ins/pull/138)). Harry menjawab
pada 6 November 2026:

- Retroactive Date: PL
- Territorial Limit: PL, MB, CPM, EAR, IAR
- Jurisdiction: PL, MB, CARGO, TS, CPM, CAR, EAR
- Voyage dan Conveyance: CARGO
- Vessels: CARGO, HULL
- Trading Limits: HULL
- Venue: Hole in One
- Existing Policy No.: semua type of cover

Label bawaan dari #138 diambil dari contoh slip, jadi sebagian pasangan di
atas belum ada.

## Yang berubah

Migrasi menambah label bawaan yang belum ada:

| Type of cover | Label baru |
| --- | --- |
| 0110 Industrial All Risk | Territorial Limit |
| 0801 CAR | Jurisdiction |
| 0802 EAR | Territorial Limit, Jurisdiction |
| 0803 Machinery Breakdown | Territorial Limit, Jurisdiction |
| 0805 Contractors' Plant and Machinery | Territorial Limit, Jurisdiction |
| 0311 Marine Cargo Open Cover, 0323 Marine Cargo | Vessels, Jurisdiction |
| 0312 Marine Cargo Stock Throughput | Voyage, Conveyance, Vessels, Jurisdiction |
| Semua type of cover | Existing Policy No., di baris pertama |

- Label yang sudah ada tidak diubah atau dihapus. Contohnya Retroactive Date
  untuk PI dan CGL, serta Conveyance dan Trading Limits untuk Moveable All
  Risk. Semuanya berasal dari contoh slip.
- **Terrorism & Sabotage (0116)** sudah punya "Choice of Law and
  Jurisdiction" dari contoh 09, jadi Jurisdiction tidak ditambahkan dua kali.
- **HULL** diartikan Marine Hull (0401). Label itu sudah lengkap di sana.
  Type of cover hull lain bisa diatur LCH di Master Data.

## File utama

- `prisma/migrations/20261106193000_label_detail_harry/migration.sql`.

## Dampak

- **Database:** migrasi hanya mengubah data `cover_types.detail_labels`, tanpa
  kolom baru. Label hanya ditambahkan bila belum ada, jadi perubahan LCH di
  Master Data tetap.
- **Slip yang sudah ada:** tidak berubah. Label bawaan baru muncul saat type of
  cover dipilih, atau lewat tombol "Tambah label bawaan" di Detail tambahan.
- **Dokumen:** baris tanpa isi tidak dicetak, jadi label baru tidak mengubah
  cetakan sampai diisi.
- **Env:** tidak ada.
- **Deploy:** setelah merge, sinkronkan fork.

## Verifikasi

- Database lokal dikembalikan ke kondisi sebelum migrasi, lalu migrasi
  dijalankan dengan `prisma migrate deploy`. Hasilnya sesuai tabel di atas:
  - Marine Cargo menjadi "Existing Policy No. | Voyage | Conveyance |
    Consignee | Basis of Valuation | Packing Method | Vessels |
    Jurisdiction";
  - label lama tetap di tempatnya.
- `npx tsc --noEmit`, `npx tsx --test tests/*.test.ts`, dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Pertanyaan 1 analisa contoh slip** sudah terjawab dengan migrasi ini.
- **Existing Policy No.** diketik manual. Slip belum terhubung ke polis tahun
  lalu, jadi nomornya belum bisa terisi otomatis.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
