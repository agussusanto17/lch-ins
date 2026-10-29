# Tanggal database terbaca Invalid Date, dan daftar tampil dobel

- **Tanggal:** 2026-10-29
- **Branch:** `fix/tanggal-iso-dan-daftar-dobel`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Ketemu waktu memverifikasi penggantian label menu jadi Placement. Tabel placing
slip menampilkan `NaN undefined NaN` di kolom DIPERBARUI, dan daftarnya dobel:
16 baris untuk 8 slip. Halaman Marketing juga dobel, 24 untuk 12 klien.

Dua-duanya bukan bug baru, tapi baru kelihatan sekarang. Keduanya berakar pada
hal yang sama: modul-modul ini sudah pindah ke Postgres, sedangkan kode di
sekitarnya masih ditulis untuk zaman data contoh.

## Yang berubah

### 1. `parse()` merusak tanggal yang sudah ada jamnya

`parse()` di `lib/format.ts` menempelkan `T00:00:00` ke setiap string yang
masuk. Itu benar untuk `"2026-08-11"` — tanpa itu string polos dibaca sebagai
UTC dan tanggalnya bisa mundur sehari. Tapi `listPlacingSlips` mengirim
`raw.updatedAt.toISOString()` (`lib/server/placing-slips.ts:502`) yang sudah
lengkap dengan jam, sehingga jadi:

```
"2026-08-11T04:39:12.000Z" + "T00:00:00" = "2026-08-11T04:39:12.000ZT00:00:00"
```

yang dibaca `new Date()` sebagai Invalid Date, lalu dicetak
`NaN undefined NaN`.

Sekarang `parse()` memeriksa bentuk masukannya dulu: hanya string tanggal polos
yang ditambah `T00:00:00`, selebihnya dipakai apa adanya. `parse()` belum pernah
diubah sejak commit pertama, waktu seluruh data masih contoh bertanggal saja.

Keempat formatter yang memakainya — `dateShort`, `dateLong`, `dateEn`,
`dateInput` — juga diberi penjaga Invalid Date, supaya nilai yang tetap tidak
terbaca jatuh ke `—` seperti nilai kosong, bukan `NaN undefined NaN`.

### 2. Data dari server ditambahkan ke data contoh, bukan menggantikannya

`lib/store.ts` memuat data contoh saat modul diimpor. Tabel-tabel yang sudah
mengambil data dari server meng-`upsert` baris database satu per satu ke store
yang sudah berisi contoh itu. Karena id-nya berbeda, keduanya tampil.

Ditambahkan `store.hydrate(key, rows)`. Hidrasi pertama sebuah koleksi
menggantikan isinya; hidrasi berikutnya hanya upsert, karena daftar yang datang
belum tentu lengkap — halaman detail klien hanya mengirim SPPA milik klien itu
(`listSppa({ clientId: id })`), dan kalau itu ikut mengganti seisi koleksi,
SPPA klien lain hilang.

Lima tempat yang tadinya meng-`upsert` dalam loop sekarang memakainya:

| Berkas | Koleksi |
| --- | --- |
| `components/underwriting/slip-table.tsx` | slips |
| `components/marketing/client-table.tsx` | clients |
| `components/marketing/sppa-table.tsx` | sppa |
| `components/marketing/marketing-tabs.tsx` | sppa |
| `components/claims/claims-view.tsx` | claims |

`components/policies/policy-database.tsx` tidak diubah. Ia sudah memakai
`store.replace` dan memang sudah benar — itu juga yang jadi contoh pola di
sini.

## File utama

- `lib/format.ts`: `parse()` dan penjaga Invalid Date di 4 formatter.
- `lib/store.ts`: `store.hydrate()`.
- 5 komponen tabel di atas.

## Dampak

- **Database:** tidak ada migration.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos.

Dibuka di tab browser yang bersih, satu halaman per muat supaya hasilnya tidak
terbantu hidrasi halaman sebelumnya:

| Halaman | Sebelum | Sesudah | Benar |
| --- | --- | --- | --- |
| Placing slip | 16 baris, 8 sel `NaN undefined NaN` | 8 baris, 0 NaN | 8 |
| Marketing | 24 baris | 12 baris | 12 |
| Klaim | 5 baris | 5 baris | 5 |
| Policy Database | 14 baris | 14 baris | 14 |

Dokumen Placing Slip untuk slip database `60d22039` dibuka langsung: judulnya
terbaca, tidak ada `NaN` maupun `Invalid Date`. Tanggalnya benar di kedua
bentuk masukan — `Jakarta, 29 Oktober 2026` dari `updatedAt` yang ISO penuh
(`dateLong`), dan `25 August 2026` sampai `25 August 2027` dari tanggal periode
yang bertanggal saja (`dateEn`).

## Catatan untuk yang melanjutkan

**Dashboard belum tersambung ke database.** `app/(app)/page.tsx` merender
`<DashboardView />` tanpa prop apa pun, dan `DashboardView` membaca keempat
koleksi dari store sesi. Jadi angkanya berasal dari halaman lain yang kebetulan
sudah dibuka lebih dulu di tab itu; kalau Dashboard yang dibuka pertama, yang
tampil adalah data contoh.

Sekarang tidak kelihatan salah karena isi database memang di-seed dari data
contoh yang sama, jadi angkanya kebetulan sama persis — 12 klien, 8 polis,
5 klaim. Begitu LCH memasukkan data asli, Dashboard akan berbeda dari halaman
lainnya. Perlu diberi data dari server seperti halaman lain, di branch
tersendiri.

**`components/layout/command-menu.tsx:124` masih membaca `SLIPS` langsung dari
`@/lib/data`,** bukan dari store atau server, jadi command palette menampilkan
slip contoh. Kecil dan terpisah, belum disentuh di sini.
