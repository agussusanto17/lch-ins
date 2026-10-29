# Master Data dipecah jadi submenu sidebar, bukan deretan tab

- **Tanggal:** 2026-10-29
- **Branch:** `feat/master-data-submenu-sidebar`
- **PR:** [#49](https://github.com/agussusanto17/lch-ins/pull/49)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Master Data menumpuk tujuh bagian jadi satu deret tab horizontal di dalam
halaman: COB & Cover Type, Tarif Baku OJK, Klasifikasi OJK, Asuransi &
Adjuster, Keuangan & Wording, Kendaraan, dan Nilai Pilihan Dropdown. Deretnya
lebih lebar dari layar sehingga harus digeser, dan tidak ada yang punya alamat
sendiri.

Agus minta dipindah ke sidebar sebagai submenu biasa.

Ada untung lain yang ikut terbawa. Halaman lama memuat **17 kueri sekaligus**
dalam satu `Promise.all` — seluruh data ketujuh bagian — padahal yang terlihat
cuma satu. Sekarang tiap bagian memuat miliknya sendiri: membuka Master Data
menjalankan 3 kueri, bukan 17.

## Yang berubah

### Submenu di sidebar

`NavItem` dapat kolom opsional `items`. Master Data mengisinya dengan tujuh
anak, dan `AppSidebar` merendernya sebagai `SidebarMenuSub` di dalam
`Collapsible`.

Barisnya punya dua sasaran klik yang terpisah: judulnya tautan ke halaman
induk, dan tanda panah di sebelahnya membuka-tutup daftar. Dengan begitu
membuka submenu tidak memaksa pindah halaman, dan sebaliknya. Submenu terbuka
sendiri ketika salah satu anaknya aktif, termasuk saat masuk dari tautan di
dalam halaman.

Saat sidebar diciutkan jadi ikon, submenu dan tanda panahnya ikut tersembunyi —
perilaku bawaan `SidebarMenuSub` dan `SidebarMenuAction`, sudah dicek tidak
menyisakan sisa yang menggantung.

### Tujuh alamat baru

| Submenu | Alamat |
| --- | --- |
| COB & Cover Type | `/master-data/cob` |
| Tarif Baku OJK | `/master-data/tariff-ojk` |
| Klasifikasi OJK | `/master-data/ojk-classes` |
| Asuransi & Adjuster | `/master-data/partners` |
| Keuangan & Wording | `/master-data/finance-docs` |
| Kendaraan | `/master-data/vehicles` |
| Nilai Pilihan Dropdown | `/master-data/lookups` |

Slug-nya mengikuti nilai tab yang lama persis, jadi mudah ditelusuri balik ke
kode sebelumnya.

`/master-data` sendiri tidak lagi punya isi, cuma mengalihkan ke
`/master-data/cob`. Tautan dan bookmark lama tetap mendarat di tempat yang
masuk akal.

`MasterDataTabs` dihapus. Isi ketujuh tab sudah berupa komponen terpisah sejak
awal, jadi tiap halaman memakainya langsung tanpa perantara.

Remah roti ikut diperbarui: ketujuh segmen baru masuk `SEGMENT_LABELS` dan
`PAGES` di `AppTopbar`, jadi jalurnya terbaca
`Dashboard / Master Data / Keuangan & Wording` dan tiap bagian bisa diklik.

`ACCESS_MATRIX` tidak disentuh. Kuncinya dicocokkan per awalan jalur, dan
`/master-data` sudah menaungi ketujuh anaknya.

### Jumlah data tidak lagi ditulis di menu

Label tab dulu memuat jumlahnya, misalnya "COB & Cover Type (10)". Di sidebar
angka itu dilepas: menampilkannya berarti menghitung ketujuh bagian di setiap
halaman aplikasi, hanya demi angka di menu. Jumlahnya tetap terbaca di tabel
masing-masing bagian.

## File utama

- `components/layout/nav-items.ts`: kolom `items` dan daftar anak Master Data.
- `components/layout/app-sidebar.tsx`: `NavItemWithSub` dan `NavButton`.
- `components/layout/app-topbar.tsx`: label dan daftar halaman untuk remah roti.
- `app/(app)/master-data/*/page.tsx`: tujuh halaman baru.
- `app/(app)/master-data/page.tsx`: pengalihan.
- `components/master-data/master-data-tabs.tsx`: dihapus.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Alamat lama:** `/master-data` tetap jalan, dialihkan ke `/master-data/cob`.

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos; ketujuh route muncul di keluaran
build.

`npm run lint` melaporkan 2 error yang sudah ada di `main` sebelum branch ini,
di `components/claims/claim-detail-sheet.tsx` dan
`components/layout/notification-popover.tsx`. Tidak ada berkas branch ini yang
dilaporkan.

Diperiksa di localhost:

- `/master-data` mengalihkan ke `/master-data/cob`.
- Ketujuh alamat menjawab 200, judul halamannya benar, tidak ada `NaN` maupun
  `[object Object]`.
- Submenu menampilkan tujuh anak dengan alamat yang benar, dan anak yang sedang
  dibuka tertandai aktif. Dicek di Keuangan & Wording: induk Master Data aktif,
  anak Keuangan & Wording aktif, remah roti berbunyi
  `Dashboard / Master Data / Keuangan & Wording`.
- Sidebar diciutkan jadi ikon: `data-state="collapsed"`, submenu dan tanda
  panah tidak terlihat, menu induk tetap berupa ikon.
- Tarif Baku OJK — bagian paling berat — tetap menampilkan 15 baris okupasi
  dengan nilai utuh (`0.7‰ – 0.875‰`), tanpa error di console.

## Catatan untuk yang melanjutkan

**Branch ini bertumpu di atas PR #48**, bukan langsung dari `main`. Alasannya
branch ini menghapus `master-data-tabs.tsx` yang diubah PR #48; kalau dicabang
dari `main`, menggabungkan keduanya menimbulkan konflik modify/delete. Merge
#48 dulu, baru PR ini.

**Tab tingkat dua masih ada di dua bagian.** Tarif Baku OJK punya lima tab di
dalamnya (Okupasi, Kendaraan, Banjir, Gempa, Skala BI) dan Keuangan & Wording
punya tiga (Rekening Bank, Mata Uang, Wording Form). Keduanya dibiarkan:
kalau ikut dipindah ke sidebar, submenu Master Data jadi lima belas baris, dan
kelima tabel tarif itu memang satu topik — lampiran dari surat edaran yang
sama. Perlu diputuskan apakah tetap begini.

**Pola submenunya bisa dipakai menu lain.** `NavItem.items` sekarang umum,
tidak khusus Master Data. Underwriting dan Finance kandidat berikutnya kalau
isinya bertambah.
