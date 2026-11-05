# Kartu lokasi slip Property bisa dilipat

- **Tanggal:** 2026-11-05
- **Branch:** `feat/lokasi-bisa-dilipat`
- **PR:** [#131](https://github.com/agussusanto17/lch-ins/pull/131)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Sejak slip Property bisa multi lokasi
([#129](https://github.com/agussusanto17/lch-ins/pull/129)), setiap lokasi
punya kartu berisi alamat, okupasi, kelas konstruksi, sum insured, referensi
tarif OJK, dan tabel rate. Satu lokasi saja sudah panjang, jadi Agus meminta
kartu lokasi bisa dibuka dan ditutup (5 November 2026).

## Yang berubah

- **Kartu bisa dilipat:** tiap kartu lokasi punya tombol buka/tutup di
  kepalanya. Kepala kartu tetap menampilkan ringkasan saat terlipat:
  - alamat;
  - kode okupasi, kelas konstruksi, sum insured, dan premi lokasi;
  - penanda "Belum lengkap" bila alamat, okupasi, kelas, atau sum insured
    belum diisi;
  - penanda "N rate butuh alasan" untuk rate di luar batas OJK yang belum
    punya alasan.
- **Keadaan awal:** slip yang dibuka dengan beberapa lokasi mulai terlipat,
  sedangkan slip satu lokasi mulai terbuka. Lokasi yang baru ditambah langsung
  terbuka.
- **Buka/tutup semua:** slip multi lokasi punya tombol "Buka semua lokasi" dan
  "Tutup semua lokasi".
- **Lokasi dihapus:** kartu lain tetap pada keadaan buka/tutupnya.

## File utama

- `components/underwriting/unit-card.tsx`: kartu yang bisa dilipat. Tahap 2
  (kendaraan Motor Vehicle) akan memakai kartu yang sama.
- `components/underwriting/slip-locations.tsx`: kartu lokasi memakai
  `UnitCard`, beserta ringkasan dan penandanya.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork.

## Verifikasi

- **Browser lokal**, di halaman uji sementara yang sudah dihapus, dengan slip
  dua lokasi:
  - Kedua kartu mulai terlipat dengan ringkasan, dan lokasi 2 bertanda
    "Belum lengkap".
  - Klik satu kartu hanya membuka kartu itu.
  - "Buka semua lokasi" dan "Tutup semua lokasi" berjalan.
  - Lokasi 3 yang baru ditambah langsung terbuka.
  - Setelah lokasi 1 dihapus, kartu lain tetap pada keadaannya.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Keadaan buka/tutup dicatat per urutan lokasi, bukan per id,** karena id
  lokasi berganti setiap slip disimpan.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
