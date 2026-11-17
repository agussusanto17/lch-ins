# MOC No. berbeda di upload deklarasi jadi peringatan

- **Tanggal:** 2026-11-17
- **Branch:** `fix/moc-no-peringatan`
- **PR:** (isi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- PR #258 (catatan `upload-deklarasi-excel-2026-11-17.md`) menolak baris General Marine Report yang MOC No.-nya berbeda dengan nomor polis MOP. Cek itu baru aktif setelah nomor sementara CI diganti nomor asuransi.
- Setelah #258 live (17 November 2026, 12.01 WIB), polis MOP di apps.lch.co.id sudah bernomor 45031126000502. MOC No. di General Marine Report contoh dari Agus adalah 45031125000646.
- Tanggal sertifikatnya (Oktober 2026) masuk periode polis itu (28 Mei 2026 s/d 28 Mei 2027), dan tertanggungnya sama. Jadi MOC No. kemungkinan nomor kontrak open cover, bukan nomor polis tahunannya. Dengan cek yang ada, file itu akan ditolak di semua 69 baris.

## Yang berubah

- MOC No. yang berbeda dari nomor polis MOP tidak lagi menolak baris. `declarationsFromRows` mengembalikan `otherMocNos`.
- Drawer upload menampilkan peringatan berwarna warning di atas pratinjau: "MOC No. di file … berbeda dengan nomor polis MOP …. Simpan bila file ini memang untuk polis MOP ini; MOC No. bisa nomor kontrak open cover, bukan nomor polisnya."
- Cek lain tetap menolak baris: periode, mata uang premi, nomor dobel.

## File utama

- `lib/declaration-import.ts`
- `components/policies/declaration-upload.tsx`
- `tests/declaration-import.test.ts`

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `npx tsx --test tests/*.test.ts`: 271 tes, 271 lolos. Tes General Marine Report kini memeriksa bahwa MOC No. lain hanya muncul di `otherMocNos`, sedangkan mata uang berbeda tetap ditolak.
- Browser lokal: polis MOP 023 sementara diberi nomor 45031126000502 dan periode 28 Mei 2026 s/d 28 Mei 2027 seperti di produksi, lalu `contoh template upload cargo.xlsx` diupload. Hasilnya tanpa kesalahan: peringatan "MOC No. di file 45031125000646 berbeda dengan nomor polis MOP 45031126000502…" tampil, 69 deklarasi siap disimpan, nilai IDR 25.086.506.220, premi IDR 25.086.506. Nomor dan periode polis lokal dikembalikan.

## Catatan untuk yang melanjutkan

- Kalau LCH mengonfirmasi MOC No. selalu sama dengan nomor polis, peringatan ini bisa dijadikan penolakan lagi. Kalau MOC No. memang nomor kontrak, pertimbangkan kolom MOC No. di polis MOP supaya bisa dicocokkan dengan tepat.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
