# Objek "limit saja" dan label Limit of Liability

- **Tanggal:** 2026-11-06
- **Branch:** `feat/limit-di-luar-tsi` (di atas `feat/premi-flat-objek`)
- **PR:** [#141](https://github.com/agussusanto17/lch-ins/pull/141)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ini fitur Tahap 1 nomor 4 dari analisa 26 contoh slip LCH (6 November 2026).
Beberapa contoh mencetak nilai yang hanya batas (limit), bukan nilai yang
diasuransikan:

- CI Cash In Transit Habco: limit any one carrying IDR 250 jt di samping
  estimasi carrying tahunan IDR 1 M yang menjadi dasar premi.
- MOP Rukma: limit of liability any one conveyance.
- CAR dan EAR: limit TPL Section II, yaitu 10% dari Section I.

Di sistem, semua nilai objek dijumlah menjadi Total Sum Insured. Total itu
juga menjadi TSI polis, sehingga limit terhitung sebagai nilai pertanggungan.
Selain itu, slip Liability mencetak nilai limit dengan label "Total Sum
Insured", padahal di contoh LCH labelnya Limit of Liability.

## Yang berubah

- **Form, tabel Rate & Premium** (COB selain Property dan Motor Vehicle):
  kolom "Flat" dari [#139](https://github.com/agussusanto17/lch-ins/pull/139)
  menjadi pilihan **Dasar** per objek, dengan tiga isi:
  - Rate: nilai × rate;
  - Flat: premi diisi langsung;
  - Limit saja: nilainya hanya batas, tidak ikut total sum insured dan premi.

  "Rate semua objek" tidak mengubah objek Flat atau Limit saja.
- **Interest Insured di form:** totalnya tidak menghitung objek Limit saja,
  dan labelnya menjadi "Total Interest Insured (tanpa limit)" bila ada objek
  seperti itu.
- **Hitung:** objek Limit saja tidak dikenai premi, dan nilainya tidak ikut
  `totalSumInsured`. Fungsi ini juga dipakai TSI polis dari slip, daftar slip,
  dan cek release.
- **Dokumen** (keempat dokumen slip):
  - Di INTEREST INSURED, nilai objek Limit saja dicetak dengan awalan
    "Limit".
  - Di jadwal premi per objek, baris Limit saja tercetak "Limit" di kolom Rate
    dan "—" di kolom Premium.
  - Slip Liability mencetak "Total Limit of Liability" sebagai pengganti
    "Total Sum Insured".

## File utama

- `prisma/schema.prisma` dan migrasi `20261106040000_limit_di_luar_tsi`:
  kolom `slip_items.is_limit_only`.
- `lib/slip-items.ts`: `isLimitOnlyItem`.
- `lib/calc.ts`: `totalSumInsured` dan premi objek Limit saja.
- `components/underwriting/slip-item-rates.tsx`: pilihan Dasar.
- `components/underwriting/placing-slip-form.tsx`: total Interest Insured.
- `components/documents/doc-blocks.tsx`: cetakan.
- `lib/server/placing-slips.ts`, `app/(app)/underwriting/actions.ts`: simpan
  dan baca.
- `tests/calc.test.ts`: dua tes baru.

## Dampak

- **Database:** migrasi menambah satu kolom boolean (default false). Jalan
  otomatis saat build di Vercel dan VPS. Slip lama tidak berubah.
- **Polis:** polis baru dari slip yang punya objek Limit saja mendapat TSI
  tanpa limit. Polis yang sudah ada tidak berubah.
- **Env:** tidak ada.
- **Deploy:** merge #138 dan #139 dulu, lalu PR ini. Setelah itu sinkronkan
  fork.

## Verifikasi

- **Script uji ke fungsi server** (sudah dihapus): slip CIT dengan objek
  estimasi carrying 1 M dan limit 250 jt (Limit saja). Flag tersimpan dan
  terbaca, dan TSI dari database 1 M.
- **Browser lokal**, di halaman uji sementara yang sudah dihapus:
  - **Form:** objek 2 tampil dengan Dasar "Limit saja" dan "Tanpa premi".
    Totalnya "Total Interest Insured (tanpa limit) IDR 1.000.000.000". Setelah
    Dasar diganti ke Rate, totalnya menjadi 1.250.000.000 dan isian rate
    muncul.
  - **Closing Instruction CIT:** objek 2 tercetak "Limit IDR 250.000.000",
    Total Sum Insured 1.000.000.000, dan baris jadwal premi "Limit | —". Total
    Premium 250.000.
  - **Closing Instruction PL:** tercetak "Total Limit of Liability IDR
    10.000.000.000".
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (55 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **TSI polis CIT:** masih ditanyakan ke Harry, apakah limit any one carrying
  atau estimasi carrying tahunan. Fitur ini mendukung keduanya lewat pilihan
  Dasar.
- **Section II TPL CAR/EAR** akan memakai Limit saja di Tahap 2.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
