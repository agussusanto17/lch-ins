# Batas OJK Property di form sama dengan pengecekan release

- **Tanggal:** 2026-11-19
- **Branch:** `fix/batas-ojk-property-form`
- **PR:** #284
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Agus (19 November 2026): release slip Property gagal dengan pesan "Rate FWTWD lokasi 1 (0.405‰) berada di bawah batas minimal OJK (minimal 0.45‰) dan belum memiliki catatan justifikasi exception", padahal dialog Release sudah muncul.
- Penyebabnya, form dan server menghitung batas OJK Property secara berbeda:
  - Form (`rateLinesWithBounds`) hanya menghitung batas FLEXAS dari okupasi dan kelas konstruksi.
  - Server (`attachSlipRateBounds`) juga menghitung EQVET dari zona gempa dan FWTWD dari batas bawah banjir Zona 1 alamat lokasi.
- Akibatnya:
  - Rate FWTWD atau EQVET yang diketik manual, atau yang masuk dari upload lokasi Excel, lolos di form tanpa tanda.
  - Isian alasan tidak muncul, sehingga slip tidak bisa di-release sampai rate diubah atau dipilih lewat panel Referensi Tarif OJK.

## Yang berubah

- **Fungsi batas bersama:** `lib/property-rate-bounds.ts` berisi `getOccupationBounds`, `getPropertyRateBounds`, dan `propertyRateLinesWithBounds`. Semuanya dipindah dari `lib/server/tariffs.ts` dan sekarang dipakai form maupun server, jadi hasilnya selalu sama.
- **Form slip Property:**
  - Baris FWTWD dan EQVET mendapat batas OJK otomatis per lokasi, sama dengan FLEXAS. Batas tersimpan dari panel Referensi Tarif OJK tetap didahulukan.
  - Rate di luar batas langsung bertanda "butuh alasan" dengan tombol Isi alasan.
  - Tombol Release berhenti di dialog "Slip belum bisa di-release" sebelum ke server.
  - Slip floating memakai batas lokasi paling berisiko untuk tiap cover, sama seperti di server.
- **Upload lokasi Excel:** jumlah rate di luar batas OJK di drawer ikut menghitung FWTWD dan EQVET.
- **Kolom Batas OJK:** batas yang hanya punya batas bawah (banjir) ditulis "min 0,450", bukan "0,450 – 0,000". Batas yang hanya punya batas atas ditulis "maks …".
- **Teks sumber batas FLEXAS** mengikuti panel Referensi Tarif OJK ("FLEXAS okupasi 2971 K1"), yang juga dipakai test di main dan di PR #273/#276.

## File utama

- `lib/property-rate-bounds.ts` (baru).
- `components/underwriting/slip-model.ts`: `rateLinesWithBounds` untuk Property memakai fungsi bersama; `occupationBounds` jadi pembungkus `getOccupationBounds`.
- `lib/server/tariffs.ts`: `attachSlipRateBounds` untuk Property memakai fungsi bersama, dan nama-nama lama tetap diekspor ulang.
- `components/underwriting/rate-tables.tsx`: label Batas OJK.
- `tests/batas-ojk-property.test.ts`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Slip Property lama:** slip yang tersimpan dengan rate FWTWD atau EQVET di luar batas akan bertanda "butuh alasan" saat dibuka. Release meminta alasannya, sama dengan aturan server yang sudah berlaku.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- eslint: lolos, kecuali 1 warning lama di `components/claims/claims-view.tsx`.
- `npx tsx --test tests/*.test.ts`: 336 lolos, termasuk 3 test baru:
  - batas form sama dengan fungsi release untuk dua lokasi Surabaya (FWTWD min 0,45‰, EQVET 1–1,55‰);
  - FWTWD 0,405‰ tertangkap sebagai masalah release, lalu lolos setelah diberi alasan;
  - batas tersimpan tetap didahulukan.
- **Browser lokal** (slip baru Property, tidak disimpan):
  - Upload 2 lokasi Surabaya dengan FWTWD 0,405‰. Drawer menyebut "2 rate di luar batas OJK".
  - Kartu lokasi bertanda "1 rate butuh alasan". Baris FWTWD menampilkan batas "min 0,450", status "Di bawah batas OJK · alasan wajib diisi", dan tombol Isi alasan.
  - Release berhenti di dialog "Slip belum bisa di-release" dengan dua pesan FWTWD.
  - Sesi dan file uji dihapus. Data tidak berubah.

## Catatan untuk yang melanjutkan

- **PR #273** (sesi lain) mengosongkan batas tersimpan saat okupasi, kelas, atau alamat lokasi diganti. Setelah keduanya merge, batas dihitung ulang dengan fungsi bersama ini. `git merge-tree` terhadap #273 dan #276 bersih.
- **Motor Vehicle** masih punya dua salinan logika batas, di form (`rateLinesWithBounds`) dan di server (`attachSlipRateBounds`). Ini kandidat untuk disatukan dengan cara yang sama.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
