# Pilihan deductible awal untuk Property

- **Tanggal:** 2026-11-02
- **Branch:** `chore/deductible-property-awal`
- **PR:** [#77](https://github.com/agussusanto17/lch-ins/pull/77)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Master Data > Deductible
([deductible-pilihan-master-2026-11-02.md](deductible-pilihan-master-2026-11-02.md))
tayang dalam keadaan kosong. Harry minta, lewat Agus, supaya enam deductible
Property dipakai dulu sebagai isi awal. Sisanya Harry tambahkan sendiri lewat
halaman itu.

## Yang berubah

Enam pilihan deductible ditambahkan untuk COB Property (kode 01), berlaku untuk
semua type of cover:

- Fire, Lightning, Explosion, Impact by Falling Aircraft and Smoke Damage
  (FLEXAS) : NIL
- Flood, Windstorm, Tempes, Water Damage (FWTWD) : 10% of Claim
- Riots, Strikes, Malicious Damage, Civil Commotion: 5% of claim, minimum IDR
  5,000,000
- Vehicle Impact : NIL
- Others Losses : IDR 1,000,000
- Earthquake, Volcanic Eruption and Tsunami (EQVET) : 2.5% of Total Sum Insured
  / declare value any one risk at any one location

Teksnya persis seperti yang dikirim Harry, termasuk ejaan "Tempes". LCH bisa
mengubahnya langsung di Master Data > Deductible.

## File utama

- `prisma/migrations/20261102233000_deductible_property_awal/migration.sql`:
  isi awal untuk database yang sudah berjalan.
- `prisma/seed.ts`: `seedDeductibleOptions()` untuk database baru, di bagian
  seed `cob`.

## Dampak

- **Database:** satu migration data, jalan otomatis saat build. Teks yang sudah
  ada di COB Property tidak ditambah lagi, jadi tidak ada duplikat bila Harry
  sudah sempat mengisi teks yang sama.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan; setelah merge, sinkronkan fork.

## Verifikasi

- Migration di database lokal: enam pilihan masuk ke COB Property dengan type
  of cover "semua".
- Placing slip Property dengan type of cover apa pun mendapat enam pilihan
  tersebut di tombol Pilih; COB lain tidak.
- `npx tsc --noEmit` dan `npx eslint prisma/seed.ts`: lolos.

## Catatan untuk yang melanjutkan

- Migration hanya jalan sekali. Bila LCH mengubah atau menghapus pilihan ini
  lewat halaman master data, perubahan itu tidak tertimpa.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
