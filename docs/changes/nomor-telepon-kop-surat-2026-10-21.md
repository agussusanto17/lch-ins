# Nomor telepon di kop surat masih nomor lama

- **Tanggal:** 2026-10-21
- **Branch:** `fix/nomor-telepon-kop-surat`
- **PR:** #21
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry mengirim dua contoh kop surat pada 21 Oktober 2026: kop lama atas nama
PT. Lestari Cipta Hokindo dan kop sekarang atas nama PT. LCH Insurance Brokers.
Keduanya dibandingkan untuk menyiapkan kop surat dokumen backdate.

Dari perbandingan itu ketahuan nomor teleponnya berbeda, dan yang tertulis di
kode adalah nomor yang lama:

- Lestari Cipta Hokindo: +62 21 - 2605 **1671**, +62 21 - 2605 **1672**
- PT. LCH Insurance Brokers: +62 21 - 2605 **1071**, +62 21 - 2605 **1072**

Akibatnya seluruh dokumen cetak, termasuk yang dilihat LCH di demo, memakai
nomor telepon lama di bawah nama perusahaan yang baru.

## Yang berubah

- Nomor telepon pada `LCH_ADDRESS` diperbaiki menjadi nomor yang sekarang.

Hal lain di kop surat sudah benar dan tidak disentuh: alamat Springhill Office
Tower, nomor SKOJK KEP-46/NB.1/2016, dan keanggotaan APPARINDO
237-2016/APPARINDO/2016. Nomor SKOJK memang tidak berubah saat ganti nama;
izin usahanya izin yang sama, hanya diberlakukan atas nama baru lewat
Keputusan OJK KEP-474/PD.02/2025 tanggal 29 Agustus 2025.

## File utama

- `components/documents/letterhead.tsx`: konstanta `LCH_ADDRESS`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan. Setelah merge, sinkronkan fork
  `vourdev/lch-ins` seperti biasa.

## Verifikasi

`npx tsc --noEmit`, `npm run lint`, dan `npm run build` lolos. Nomor lama sudah
tidak ada lagi di seluruh kode, diperiksa dengan pencarian `1671` dan `1672`.

## Catatan untuk yang melanjutkan

Perbaikan ini sengaja hanya menyentuh satu konstanta, bukan merombak kop surat,
karena kop surat akan dipindah ke master data pada minggu 4. Saat itu nanti
`LCH_ADDRESS` dihapus dan diganti profil perusahaan yang dipilih berdasarkan
tanggal dokumen, dengan dua baris: Lestari Cipta Hokindo untuk dokumen sebelum
1 September 2025, dan PT. LCH Insurance Brokers sejak tanggal itu.

Beda kop lama dan baru, untuk dipakai nanti: nama lama dua baris dengan
"INSURANCE BROKERS" di bawahnya, warnanya biru bukan ungu tua, nomor telepon
berakhiran 1671 dan 1672, dan footernya memuat logo MARI Berasuransi yang
sekarang sudah tidak dipakai. Alamat, SKOJK, dan nomor keanggotaan APPARINDO
sama persis di kedua kop.
