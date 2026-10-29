# Ukuran font tabel dan chip disamakan dengan template BPPP

- **Tanggal:** 2026-10-29
- **Branch:** `fix/ukuran-font-tabel-dan-chip`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus melihat font di tabel buatan Adi terlalu kecil, begitu juga chip dan
beberapa teks lain, dan tidak sesuai template awal: dashboard pendaftaran BPPP
(`dashboard-pendaftaran-frontend`), proyek dengan tumpukan yang sama — Next.js
16, shadcn di atas Base UI.

Patokan template, dibaca dari kodenya:

| Bagian | Template |
| --- | --- |
| Teks utama di sel | 14px, turunan `text-sm` dari `<table>` |
| Teks kedua di bawahnya | 12px (`text-xs`), redup |
| Header tabel | 14px, `font-medium`, huruf biasa, tinggi 48px |
| Chip status | 12px, pill, tinggi 20px, dengan titik warna |

Pengukuran di browser sebelum perbaikan menemukan dua sumber selisih yang
berbeda asalnya.

**Isi tabel turun satu tingkat**, dari commit Vour dan ZoD3V. Pola yang paling
sering: `text-xs` dipasang di `TableRow`, sehingga satu baris penuh — termasuk
teks utamanya — jadi 12px, dan teks keduanya turun lagi ke 11px atau 10px.

| Halaman | Teks utama | Teks kedua |
| --- | --- | --- |
| Template | 14px | 12px |
| Placement, Policy Database | 14px | 12px |
| Klaim | **12px** | 12px |
| Marketing | 14px | **11–12px** |
| COB & Cover Type, Kendaraan | **12px** | **11px** |
| Tarif Baku OJK, Asuransi & Adjuster, Nilai Pilihan | **12px** | — |
| Pengguna | 14/12px campur | **10–11px** |

**Header tabel dan chip status berbeda dari template sejak 18 Agustus**, dari
commit `c28c8d2` ("Rombak bahasa visual ke modern-minimal SaaS"): header 11px
semibold UPPERCASE setinggi 36px, chip 11px bersudut kotak setinggi 22px.
Keduanya primitif bersama, jadi berlaku di semua tabel.

Ditambah chip buatan sendiri yang tidak memakai `StatusBadge`/`ToneBadge`
bersama, dengan ukuran 10–11px dan warna hardcode.

## Yang berubah

Dikerjakan dua tahap atas permintaan Agus: primitif dan tabel Klaim dulu
sebagai contoh, ditinjau, baru diterapkan ke tabel lain.

### Primitif bersama

- `TableHead` kembali ke template: 14px, `font-medium`, huruf biasa,
  `text-foreground`, tinggi 48px.
- `StatusBadge` dan `ToneBadge` — keduanya memakai kelas dasar yang sama — jadi
  12px, pill (`rounded-4xl`), tinggi 20px.

Warna header ikut template, dari `text-muted-foreground` ke `text-foreground`.
Arsiran latar header (`bg-muted/40` di `TableHeader`) dibiarkan: template tidak
memakainya, tapi itu bukan soal font.

### Isi tabel

Satu aturan untuk semua tabel daftar data:

- Teks pertama di sel adalah teks utama: 14px, turunan dari tabel, tanpa kelas
  ukuran.
- Baris kedua yang ditumpuk di bawahnya adalah teks kedua: `text-xs`, 12px.
- Sel yang isinya satu nilai redup saja — "14 transaksi", nama asuransi, varian
  form — tetap teks utama kolomnya, jadi 14px redup, bukan 12px.

Diterapkan di 16 berkas tabel: Klaim, Marketing (klien, SPPA, renewal,
dan dua tabel di detail klien), Placement, Policy Database, ketujuh bagian
Master Data, Pengguna, dan Audit Trail.

`bg-muted/50` yang ditumpuk di baris header Klaim dan Klasifikasi OJK ikut
dicabut. Itu arsiran kedua di atas `bg-muted/40` dari primitif, jadi header
kedua tabel itu lebih gelap dari tabel lain.

### Chip

- Chip buatan sendiri diganti `ToneBadge`: status pengguna Aktif (success) dan
  Nonaktif (danger), Wajib Ganti Sandi (warning), penanda "Anda" (info), entitas
  di Audit Trail (neutral), dan Titipan Premi di rekening bank (warning). Nada
  warnanya dipertahankan seperti yang dipilih penulisnya; Nonaktif tetap merah.
- `Badge` yang ukurannya ditimpa `text-[11px]` atau `text-2xs` dicabut
  penimpanya, varian `outline`/`secondary`-nya tetap.
- `UserRoleBadge` disamakan bentuk dan ukurannya — 12px, pill, tinggi 20px,
  tanpa garis tepi. Warna per perannya dibiarkan, lihat catatan di bawah.

## File utama

- `components/ui/table.tsx`: `TableHead`.
- `components/shared/status-badge.tsx`: kelas dasar `StatusBadge`/`ToneBadge`.
- `components/users/user-role-badge.tsx`: bentuk dan ukuran chip peran.
- Enam belas berkas tabel di `components/claims`, `marketing`, `master-data`,
  `policies`, `underwriting`, `users`, dan `audit`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Tampilan:** header semua tabel berubah dari 11px UPPERCASE abu-abu ke 14px
  huruf biasa hitam, dan lebih tinggi 12px. Kolom No. Slip di Placement lebih
  lebar karena nomornya sekarang 14px.

## Verifikasi

`npx tsc --noEmit` lolos. `eslint` pada seluruh berkas yang disentuh bersih.

Ukuran diukur dari gaya yang benar-benar dirender di browser, bukan dibaca dari
kelas, di 15 halaman:

| Yang dicek | Hasil |
| --- | --- |
| Header tabel | 14px, tinggi 48px, di 15 dari 15 halaman |
| Isi tabel | hanya 14px dan 12px; tidak ada 11px atau 10px yang tersisa |
| Chip | 12px, tinggi 20px, di semua halaman yang punya chip |

Tabel Klaim diperiksa per kolom: No. Klaim, Tertanggung, COB, Tanggal, dan
Nilai 14px; No. Polis dan Tahapan 12px; chip 12px pill setinggi 20px.

Empat tabel tidak berisi data di database lokal — Klasifikasi OJK, Rekening
Bank, Audit Trail, dan Renewal 60 hari — jadi hanya headernya yang terukur;
perubahan isinya diperiksa lewat kode.

## Catatan untuk yang melanjutkan

**Warna chip peran masih hardcode.** `UserRoleBadge` memakai ungu, biru,
emerald, amber, teal, dan rose langsung dari palet Tailwind, sementara template
mewajibkan token warna semantik. Dibiarkan karena warnanya membedakan kategori,
bukan status — memetakannya ke nada success/warning/danger akan salah arti.
Perbaikannya butuh palet kategori sendiri di tema, dan itu keputusan desain.

**Tabel di dalam form slip tidak disentuh.** `ojk-panels.tsx`, `rate-tables.tsx`,
dan `line-items.tsx` masih memakai teks kecil. Itu panel rujukan dan baris
isian di dalam form, bukan tabel daftar data, dan kepadatannya memang dipilih.

**Tombol kecil di dalam tabel dibiarkan.** Misalnya tombol Detail di Audit Trail
dan Tambah Tipe di baris Kendaraan yang dibuka. Ukuran tombol diatur komponen
`Button`, di luar urusan tipografi tabel.

**Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin ini.
