# Toolbar filter tetap satu baris, dan latar abu-abu tipis di form slip

- **Tanggal:** 2026-10-29
- **Branch:** `fix/toolbar-satu-baris-dan-latar-form`
- **PR:** (diisi setelah PR dibuat)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Dua catatan Agus dari tinjauan visual yang sama:

1. Filter "Semua Status" di halaman Pengguna turun ke baris kedua, padahal
   ruangnya masih banyak. Seharusnya tetap satu baris.
2. Form Buat Placing Slip punya banyak section accordion, dan di atas latar
   putih batas antar-section cuma garis tipis. Latar di belakang kartu diminta
   abu-abu tipis supaya section-nya terbaca terpisah.

Dikerjakan dalam satu branch karena keduanya perbaikan tampilan kecil dari
tinjauan yang sama.

## Yang berubah

### Toolbar filter

Penyebabnya bukan kurang ruang. Toolbar Pengguna selebar 1143px, tapi grup
filter di kirinya hanya mendapat 527px.

Grup itu `flex-wrap` yang lebarnya dihitung dari isinya, dan kotak cari di
dalamnya memakai `w-full sm:max-w-xs` — lebar persen yang dibatasi. Saat grup
mengukur dirinya, lebar persen itu belum bisa dihitung, jadi kotak cari ikut
dengan lebar bawaannya yang lebih kecil. Setelah grupnya jadi, kotak cari
melebar ke 320px; isi grup sekarang butuh 640px dari 527px yang tersedia, dan
filter terakhir terlempar ke baris kedua.

Perbaikannya satu baris di `SearchInput`: `sm:max-w-xs` diganti `sm:w-80`.
Lebarnya tetap 320px, tapi kini berupa lebar pasti yang ikut terhitung saat
grup mengukur dirinya.

Penyebab yang sama ditemukan di Nilai Pilihan Dropdown. Toolbar lain sudah satu
baris karena kotak carinya langsung berada di baris toolbar, bukan di grup
bersarang, atau sudah memakai lebar pasti seperti Klaim (`sm:w-64`).

Lima pemanggil mengoper `className="w-full sm:max-w-xs"`, sama persis dengan
default lama. Kelas itu dihapus supaya lebar kotak cari hanya diatur di satu
tempat.

### Latar form slip

`FormBody` — pembungkus konten di antara bar atas dan bar tombol — dapat latar
`bg-muted`, sedangkan kartu section tetap putih (`bg-card`). Bar atas dan bar
tombol tetap putih.

Di tema gelap latarnya tetap `bg-background`. Di sana `muted` justru lebih
terang dari kartu, jadi kalau dipakai, kanvasnya lebih terang daripada kartu
dan urutan terang-gelapnya terbalik.

`FormBody` dipakai tiga form: Placing Slip, Quotation Slip (lewat alias
`SlipFormBody`), dan form klausul. Ketiganya ikut berubah, supaya Placing dan
Quotation — dua tampilan dari slip yang sama — tidak berbeda latar.

Tiga kotak pemberitahuan yang duduk langsung di kanvas dengan latar `bg-muted`
akan tenggelam di atas abu-abu, jadi diganti putih bergaris tepi seperti kartu:
pemberitahuan "Dibuat dari SPPA" dan "slip terkunci" di Placing Slip, serta
ringkasan di atas Quotation Slip.

## File utama

- `components/shared/table-toolbar.tsx`: lebar `SearchInput`.
- `components/shared/form-chrome.tsx`: latar `FormBody`.
- `components/underwriting/placing-slip-form.tsx`,
  `quotation-draft-form.tsx`: kotak pemberitahuan.
- Lima berkas tabel: kelas `className` yang dobel di `SearchInput`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

`npx tsc --noEmit` dan `npm run build` lolos; `eslint` pada berkas yang
disentuh bersih.

Toolbar diukur di browser — kontrol dianggap satu baris kalau garis tengahnya
berselisih kurang dari 12px, dan input tersembunyi selebar 1px dari `Select`
tidak dihitung:

| Halaman | Lebar 1447px | Lebar 1024px |
| --- | --- | --- |
| Pengguna | 2 baris → **1 baris** | 1 baris |
| Nilai Pilihan Dropdown | 2 baris → **1 baris** | 1 baris |
| Audit Trail, Tarif Baku OJK, Klaim, Marketing | 1 baris | — |

Di lebar 1024px Klaim dan Marketing turun baris karena memang tidak muat: isinya
butuh sekitar 900px dari ruang 720px. Itu perilaku yang benar dan halamannya
tidak diubah.

Latar form diukur dari warna yang dirender:

| Tema | Kanvas | Kartu |
| --- | --- | --- |
| Terang | L 97,0 (abu-abu tipis) | L 100 (putih) |
| Gelap | L 5,7 | L 8,6 |

Di kedua tema kartu lebih terang daripada kanvas. Mode gelap diperiksa dengan
menukar kelas tema di tab uji, bukan lewat tombol Ganti Tema, supaya pilihan
tema yang tersimpan tidak berubah.

Dengan semua section ditutup (Tutup semua), delapan judul section masih
memenuhi layar, jadi tidak ada celah putih di bawah bar tombol. Quotation Slip
dan form klausul juga dibuka: latar abu-abu, kartu putih, form klausul tetap
selebar 980px di tengah.

## Catatan untuk yang melanjutkan

**Form lain belum memakai `FormBody`.** Form klien, SPPA, polis, dan klaim
memakai pola sendiri (dialog atau sheet), jadi tidak ikut berubah. Kalau nanti
ada form halaman penuh baru, pakai `FormBody` supaya latarnya seragam.

**Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin ini.
