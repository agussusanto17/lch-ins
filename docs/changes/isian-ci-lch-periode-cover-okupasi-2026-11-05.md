# Isian CI LCH: keterangan periode, nama type of cover, okupasi banyak lokasi

- **Tanggal:** 2026-11-05
- **Branch:** `feat/isian-ci-lch-periode-cover-okupasi`
- **PR:** [#137](https://github.com/agussusanto17/lch-ins/pull/137)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry mengirim dua contoh Closing Instruction LCH (5 November 2026):

- **SISKA RAHARJA, PAR + EQVET:** lima unit apartemen, okupasi dan rate
  sama di semua lokasi.
- **PT. TRUCKINDO BATAM, Motor Vehicle:** dua truk.

Agus meminta form dan dokumen slip dicocokkan dengan contoh itu. Dari
perbandingan, ada isian dan cetakan yang belum bisa dibuat. Catatan ini
mencakup bagian pertama. Bagian kedua masih menunggu jawaban Harry, lihat
catatan di bawah.

## Yang berubah

### Form slip

- **Keterangan periode:** isian baru di bawah Inception dan Expiry Date.
  - Slip baru langsung terisi "Both days at 12 o'clock noon local time at the
    location of the insured object.", seperti semua CI LCH.
  - Boleh diubah, atau dikosongkan bila tidak perlu.
- **Type of Cover di dokumen:** nama type of cover yang dicetak bila berbeda
  dari master. Contohnya "PROPERTY ALL RISKS + RIOTS, STRIKES, MALICIOUS
  DAMAGE, CIVIL COMMOTION + FLOOD, WINDSTORM, TEMPEST, WATER DAMAGE
  INSURANCE."
  - Slip PAR + EQVET punya isian kedua, Type of Cover Earthquake di dokumen.
  - Kosong berarti nama master. Master type of cover tidak berubah.
  - Mengganti type of cover mengosongkan nama di dokumen.
- **Nama okupasi di slip** sekarang textarea dua baris, karena CI LCH sering
  menambah kalimat seperti "And all other activities undertaken by the insured
  for their respective rights and interests."
- **Tombol Samakan okupasi & kelas dengan Lokasi 1** di slip Property dengan
  beberapa lokasi.
  - Okupasi, nama okupasi di slip, dan kelas konstruksi lokasi 1 disalin ke
    semua lokasi lain, jadi lima unit apartemen cukup diisi sekali.
  - Batas rate OJK tiap lokasi ikut menyesuaikan, sama seperti mengganti
    okupasi satu per satu.

### Dokumen slip (keempat dokumen)

- **Period of Insurance:** keterangan periode dicetak di baris kedua.
- **Type of Cover:** memakai nama di dokumen bila diisi.
- **Occupation di slip Property dengan beberapa lokasi:** dicetak sekali bila
  semua lokasi sama. Bila berbeda, tetap dicetak per lokasi.
- **Deductible slip Property** mengikuti CI SISKA RAHARJA:
  - kalimat pengantar "Any one loss or series of losses arising out of any one
    event:";
  - deductible dikelompokkan di bawah judul "Section 1 — Material Damage" dan
    "Section 2 — Business Interruption";
  - Section 2 hanya muncul bila ada deductible cover BI.

  COB lain tidak berubah.
- **Bagian RATE di slip Property dengan beberapa lokasi:**
  - Bila semua lokasi memakai rate dan loss limit yang sama, bagian RATE
    dicetak sekali dan baris di bawahnya menjadi "Premium : As per schedule
    below".
  - Tabel PREMIUM CALCULATION tetap per lokasi.
  - Bila rate lokasi berbeda, dokumen tetap seperti sebelumnya.

## File utama

- `prisma/schema.prisma` dan migrasi
  `20261105235900_keterangan_periode_nama_cover`: kolom `period_note`,
  `type_of_cover_label`, dan `type_of_cover_2_label` di `placing_slips`.
- `components/underwriting/placing-slip-form.tsx` dan `slip-locations.tsx`:
  isian baru dan tombol samakan.
- `components/underwriting/slip-model.ts`: isi awal keterangan periode.
- `lib/server/placing-slips.ts` dan `app/(app)/underwriting/actions.ts`:
  simpan, baca, dan duplikat slip.
- `lib/slip-locations.ts`: `locationsShareRates`.
- `components/documents/doc-blocks.tsx`: cetakan periode, type of cover,
  okupasi, deductible, dan RATE.
- `tests/calc.test.ts`: satu tes baru.

## Dampak

- **Database:** migrasi menambah tiga kolom teks. Jalan otomatis saat build di
  Vercel dan VPS.
  - Semua slip yang sudah ada mendapat keterangan periode bawaan, jadi
    dokumennya ikut mencetak baris itu. Bisa dikosongkan per slip.
  - Di database lokal, 10 dari 10 slip mendapat keterangan periode.
  - Angka premi tidak tersentuh.
- **Dokumen slip lama:**
  - Slip Property mencetak kalimat pengantar dan judul section di
    deductible.
  - Slip Property dengan beberapa lokasi yang rate-nya sama kini mencetak
    bagian RATE.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Browser lokal**, memakai halaman uji sementara (sudah dihapus) berisi
  contoh SISKA RAHARJA: lima lokasi dengan rate FLEXAS 0,455‰, FWTWD 0,4‰,
  dan EQVET 1,53‰.
  - **Closing Instruction:**
    - Type of Cover mencetak dua nama panjang dari CI, dan Period of
      Insurance mencetak keterangan di baris kedua.
    - Occupation dicetak sekali dengan dua barisnya.
    - Deductible mencetak kalimat pengantar dan "Section 1 — Material Damage",
      sama dengan CI.
    - Bagian RATE tercetak.
    - Premi 21.109.020, diskon 3.166.353, dan Grand Total 18.042.667, sama
      dengan CI SISKA RAHARJA.
  - Rate FLEXAS lokasi 2 diubah menjadi 0,5‰: bagian RATE tidak dicetak dan
    label kembali "Rate & Premium". Okupasi yang berbeda dicetak per lokasi.
  - **Form:**
    - Isian baru tampil dengan nilai contoh.
    - Lokasi 2 sampai 5 yang kosong terisi okupasi 2975, nama okupasi dua
      baris, dan Class I setelah tombol samakan diklik.
    - Form tidak dianggap berubah saat dibuka.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts` (45 tes lulus), dan `npm run build`:
  lolos.

## Catatan untuk yang melanjutkan

- **Bagian kedua menunggu jawaban Harry:**
  - **Satuan rate:** CI LCH menulis rate dalam persen (FLEXAS 0.04550%),
    sedangkan dokumen kita per mil sejak
    [#126](https://github.com/agussusanto17/lch-ins/pull/126).
  - **Daftar kendaraan:** CI TRUCKINDO memakai tabel mendatar "DAFTAR UNIT
    KENDARAAN", sedangkan kita jadwal per kendaraan.
  - **Brokerage:** CI menulis "15% (net to Broker)".
  - **Klausul:** di CI, teks klausul menjadi lampiran.
- **Master data yang perlu dilengkapi LCH:** tipe Isuzu Giga di master
  kendaraan, dan wording Indonesian Earthquake.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
