# Menu Underwriting diganti jadi Placement

- **Tanggal:** 2026-10-29
- **Branch:** `fix/rename-underwriting-ke-placement`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

LCH minta menu "Underwriting" di sidebar diganti jadi "Placement". Istilahnya
memang lebih tepat: underwriting adalah pekerjaan perusahaan asuransi menilai
dan menerima risiko, sedangkan yang dikerjakan LCH sebagai broker adalah
menempatkan risiko itu ke asuransi. Modulnya sendiri isinya placing slip,
quotation slip, cover note, dan closing instruction — semuanya dokumen
placement.

## Yang berubah

Hanya label yang dilihat pengguna. Alamat halaman tetap `/underwriting`.

| Tempat | Sebelum | Sesudah |
| --- | --- | --- |
| Sidebar, grup Operasional | Underwriting | Placement |
| Breadcrumb di topbar | Underwriting | Placement |
| Judul halaman dan judul tab | Underwriting | Placement |
| Tombol di halaman 404 | Lihat Underwriting | Lihat Placement |
| Tombol kembali di 3 form dan dokumen | Kembali ke Underwriting | Kembali ke Placement |
| Deskripsi situs di `app/layout.tsx` | manajemen underwriting | manajemen placement |

### Alamat halaman sengaja tidak ikut diganti

`/underwriting` dibiarkan apa adanya. Menggantinya jadi `/placement` berarti
memindahkan satu folder berisi 9 rute anak, mengubah dua baris kunci di
`ACCESS_MATRIX`, dan menyisir setiap `href` serta `revalidatePath` yang
menyebutnya. Risikonya tidak sebanding: yang dilihat dan dipakai LCH adalah
label di sidebar, bukan alamat di address bar. Kalau nanti LCH memang minta
alamatnya ikut berubah, itu dikerjakan di branch tersendiri.

Nama variabel seperti `canManageUnderwriting` juga dibiarkan, karena masih
menunjuk ke path `/underwriting` yang memang belum berubah. Menggantinya
sekarang justru bikin nama tidak cocok dengan path yang dirujuknya.

### Catatan istilah

Role yang mengelola menu ini kodenya `placement` tapi labelnya "Teknik",
mengikuti Sheet Hak Akses yang diisi LCH. Jadi sekarang menu Placement dikelola
role Teknik. Dibiarkan begitu karena dua-duanya memang istilah yang dipakai LCH
sendiri di dokumen yang berbeda.

## File utama

- `components/layout/nav-items.ts`: label di sidebar.
- `components/layout/app-topbar.tsx`: `SEGMENT_LABELS` untuk breadcrumb.
- `app/(app)/underwriting/page.tsx`: metadata dan `PageHeader`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Alamat lama:** tidak ada yang berubah, jadi bookmark dan tautan lama tetap
  jalan.

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos.

Dibuka di browser pada 1440x900: sidebar grup Operasional menampilkan
"Placement" dalam keadaan aktif, breadcrumb berbunyi "Dashboard › Placement",
dan judul tab "Placement — LCH Insurance Brokers". Pencarian kata
"Underwriting" sebagai teks yang dilihat pengguna di `app/` dan `components/`
tidak menemukan sisa.

## Catatan untuk yang melanjutkan

**Ditemukan saat verifikasi, belum diperbaiki di sini:** kolom DIPERBARUI di
tabel placing slip menampilkan `NaN undefined NaN`, dan daftarnya dobel
(16 baris untuk 8 slip). Dua-duanya sudah ada di `main` sebelum branch ini dan
bukan akibat penggantian label. Penyebabnya:

1. `parse()` di `lib/format.ts` menempelkan `T00:00:00` ke nilai yang masuk.
   Itu benar untuk string tanggal saja seperti `"2026-08-11"`, tapi
   `listPlacingSlips` mengirim `raw.updatedAt.toISOString()`
   (`lib/server/placing-slips.ts:502`) yang sudah lengkap dengan jam, sehingga
   jadi `"2026-08-11T04:39:12.000ZT00:00:00"` dan terbaca Invalid Date.
   Fungsi `parse()` belum pernah diubah sejak commit pertama, waktu semua data
   masih mock bertanggal saja; bugnya baru kelihatan setelah tabel
   `placing_slips` berisi data asli.
2. `SlipTable` meng-`upsert` `initialSlips` dari database ke store sesi yang
   sudah berisi slip mock, jadi dua-duanya tampil.

Diperbaiki di branch tersendiri supaya branch ini tetap satu topik.
