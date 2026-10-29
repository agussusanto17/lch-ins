# Decimal Prisma di batas server-client, dan Dashboard yang belum baca database

- **Tanggal:** 2026-10-29
- **Branch:** `fix/decimal-ke-client-dan-dashboard-database`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dua temuan dari verifikasi PR #46 dan #47 di localhost. Keduanya ada di lapisan
yang sama — apa yang dikirim Server Component ke Client Component — jadi
dikerjakan sekalian.

### 1. Console banjir peringatan Decimal

Sekali membuka Master Data memunculkan sekitar **1.800** peringatan React
`Only plain objects can be passed to Client Components from Server Components`.
Halaman lain nol: Dashboard, Marketing, Placement, Policy Database, dan Klaim
diperiksa satu per satu, bersih.

Penyebabnya Prisma mengembalikan kolom `Decimal` sebagai objek Decimal.js, dan
`app/(app)/master-data/page.tsx` meneruskannya apa adanya ke `MasterDataTabs`
yang `"use client"`.

Yang penting dicatat, **tampilannya tidak pernah salah**. Decimal.js punya
`toJSON()`, jadi React mengirimkannya sebagai string — payload RSC-nya berbunyi
`"rateMin":"0.7"` — dan `Number()` di komponen tetap menghasilkan angka benar.
Seluruh sub-tab tarif diperiksa sebelum perbaikan: tidak ada `NaN`, tidak ada
`[object Object]`.

Jadi ruginya dua, dan dua-duanya bukan soal tampilan:

- **Error asli tenggelam.** 1.800 baris merah per halaman membuat console tidak
  bisa dipakai. Dua bug di PR #47 ketahuan justru karena console sempat terbaca.
- **Tipenya berbohong.** Di sisi client tipenya tertulis `Decimal`, isinya
  `string`. `rateMin.toNumber()` lolos pemeriksaan TypeScript lalu gagal saat
  dijalankan. Itu jebakan yang menunggu orang berikutnya, bukan bug hari ini.

### 2. Dashboard menghitung dari data contoh

`app/(app)/page.tsx` cuma berisi `return <DashboardView />`, tanpa prop apa pun.
Komponennya membaca keempat koleksi dari store sesi, yang dimuati data contoh
saat modul diimpor. Artinya Dashboard tidak pernah menyentuh database.

Selama ini tidak kelihatan karena database di-seed dari data contoh yang sama.
Sekarang isinya sudah bergeser, dan selisihnya nyata:

| Kartu | Data contoh | Database |
| --- | --- | --- |
| Total Klien | 12 | 12 |
| Polis Aktif | **8** | **7** |
| Klaim Terbuka | **5** | **3** |
| Total Premium | **Rp 2,71 M** | **Rp 2,62 M** |

Dashboard adalah halaman pertama yang dibuka setiap orang. Tiga dari empat
kartunya salah.

## Yang berubah

### Tarif OJK dikonversi di server

Empat loader di `lib/server/master-data.ts` sekarang memanggil `.toNumber()`
sebelum mengembalikan baris: `listOccupations` (tarif turunannya),
`listTariffEqProperty`, `listTariffFlood`, dan `listBiScales`.

Tipe barunya ikut diekspor — `TariffOccupationRow`, `TariffEqPropertyRow`,
`TariffFloodRow`, `BiScaleRow` — dan dipakai `MasterDataTabs` serta
`TariffOjkTab` menggantikan tipe Prisma mentah. Pembungkus `Number()` di tujuh
tempat dihapus: sekarang nilainya memang sudah number, dan membiarkannya
menyiratkan masih perlu dikonversi.

### Dashboard dihitung dari data server

`app/(app)/page.tsx` memuat klien, polis, klaim, dan slip lalu meneruskannya ke
`DashboardView` sebagai prop. Komponennya menghitung langsung dari prop itu,
**tidak lewat store sesi**.

Awalnya dicoba lewat `store.hydrate` seperti tabel-tabel lain, tapi hasilnya
jelek dan terlihat: render pertama memakai angka contoh, lalu berganti sendiri
ke angka database setelah efek hidrasi jalan. Di tabel pergantian itu tidak
terasa karena isinya sama; di Dashboard angkanya berubah di depan mata.

Store tetap dipakai tabel supaya hasil edit form langsung terlihat tanpa memuat
ulang. Dashboard tidak butuh itu: halaman ringkasan yang dibuka, bukan
disunting, dan Next mengambil datanya lagi dari server setiap kali dibuka.

`seedInitialClaimsIfEmpty()` ikut dipanggil. `listClients`, `listPolicies`, dan
`listPlacingSlips` sudah mengisi data awalnya sendiri saat tabelnya kosong,
klaim tidak. Tanpa panggilan itu Dashboard menulis 0 klaim di database baru,
lalu angkanya berubah begitu halaman Klaim dibuka — padahal tidak ada yang
menambah klaim.

### Dashboard di halaman ganti kata sandi dikosongkan

`app/(app)/change-password/page.tsx` memakai `DashboardView` sebagai latar di
belakang dialog ganti kata sandi wajib. Datanya diisi array kosong: orang yang
belum menyelesaikan login tidak perlu melihat angka produksi, dan kuerinya pun
mubazir karena halamannya tidak bisa dipakai.

### Palet perintah membaca store, bukan data contoh statis

`components/layout/command-menu.tsx` mengimpor `SLIPS` dari `@/lib/data`
langsung, jadi ⌘K selalu menampilkan enam slip contoh. Sekarang membaca
`useCollection("slips")`, sehingga di halaman yang sudah memuat slip dari
database — Placement, misalnya — palet menampilkan slip yang sama.

## File utama

- `lib/server/master-data.ts`: tipe baris baru dan konversi Decimal.
- `components/master-data/tariff-ojk-tab.tsx`, `master-data-tabs.tsx`: tipe.
- `app/(app)/page.tsx`, `components/dashboard/dashboard-view.tsx`: Dashboard.
- `components/layout/command-menu.tsx`: sumber daftar slip.

## Dampak

- **Database:** tidak ada migration. Tidak ada perubahan skema.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos.

`npm run lint` melaporkan 2 error, di `components/claims/claim-detail-sheet.tsx`
dan `components/layout/notification-popover.tsx`. Keduanya sudah ada di `main`
sebelum branch ini dan tidak disentuh di sini. Tidak ada berkas branch ini yang
dilaporkan.

Diperiksa di localhost dengan tab bersih:

| Yang dicek | Sebelum | Sesudah |
| --- | --- | --- |
| Peringatan Decimal di Master Data | ±1.800 | **0** |
| Error console lain di Master Data | 0 | 0 |

Keempat sub-tab tarif dibandingkan baris per baris sebelum dan sesudah. Jumlah
barisnya sama — okupasi 15, gempa 25, banjir 14, skala BI 14 — dan nilainya
sama persis, misalnya `0.7‰ – 0.875‰`, `0.8‰`, `0.05%`, dan `20%`. Tidak ada
`NaN` maupun `[object Object]`.

Dashboard diperiksa di **HTML mentah dari server**, bukan DOM setelah hidrasi,
supaya ketahuan apakah angkanya sudah benar sejak render pertama. Hasilnya
`Total Klien 12`, `Polis Aktif 7`, `Klaim Terbuka 3`, `Total Premium Rp 2,62 M`
— sama dengan database, dan sama dengan yang akhirnya tampil. Tidak ada kedip.

Palet ⌘K dibuka di Placement: keenam slipnya cocok dengan tabel, termasuk nomor
`005/LCH-PLCMT/PS-IAR/VIII/2026` dan `004/LCH-PLCMT/PS-CAR/VII/2026`.

## Catatan untuk yang melanjutkan

**Palet perintah masih bisa menampilkan slip contoh.** Di halaman yang belum
pernah memuat slip — Dashboard, Master Data, Pengguna — store masih berisi data
contoh, jadi ⌘K menampilkan slip contoh dan memilihnya mendarat di
"Dokumen tidak ditemukan". Itu sudah terjadi sebelum perubahan ini, bedanya
sekarang tidak terjadi lagi di halaman yang memuat slip. Perbaikan tuntasnya
ikut butir berikut.

**Akar masalahnya belum disentuh: store sesi dimuati data contoh saat modul
diimpor.** Mengosongkan `INITIAL` di `lib/store.ts` akan menyelesaikan ini
sekaligus, tapi ada 28 pemanggil `useCollection` yang membaca store tanpa prop
dari server — antara lain popover notifikasi, `report-view`, `policy-form`, dan
`insured-picker`. Semuanya perlu dialiri data server lebih dulu. Itu branch
tersendiri yang cukup besar, dan sebaiknya dikerjakan per halaman.

**Kolom Decimal lain belum diperiksa satu per satu.** Yang dibereskan di sini
tarif OJK, karena itu yang memunculkan peringatan. Modul klaim, polis, dan
placing slip sudah mengonversi angkanya sendiri — terlihat dari pemakaian
`Number()` dan `toNumber()` di `lib/server/` — dan halamannya memang bersih saat
diperiksa. Kalau nanti ada loader baru yang mengembalikan baris Prisma mentah
berisi Decimal, peringatan yang sama akan muncul lagi.

**Aturan Wajib nomor 4 belum dijalankan** untuk PR ini: graphify belum terpasang
di mesin ini, sama seperti PR #11, #12, #13, #21, #23, #44, #46, dan #47.
