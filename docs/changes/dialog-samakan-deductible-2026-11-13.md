# Dialog "Samakan deductible" tertutup setelah Samakan

- **Tanggal:** 2026-11-13
- **Branch:** `fix/dialog-samakan-deductible`
- **PR:** [#242](https://github.com/agussusanto17/lch-ins/pull/242)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Temuan SIT-122 (13 November 2026), di kode main 17ceabb** (#240, deductible per lokasi): saklar "Deductible berbeda per lokasi" dimatikan saat isian antarlokasi berbeda, lalu Samakan diklik di dialog konfirmasi.
  - Deductible semua lokasi sudah disamakan dengan Lokasi 1, tetapi dialognya tetap terbuka dan menutupi form.
  - Tombol Simpan Perubahan tidak bisa diklik sampai dialog ditutup dengan Batal.
- **Penyebab:** `AlertDialogAction` di proyek ini tombol biasa, bukan tombol penutup dialog seperti `AlertDialogCancel`. Uji browser #240 hanya mencoba Batal.

## Yang berubah

- `components/underwriting/deductible-input.tsx`: tombol Samakan menutup dialog sesudah deductible disamakan.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** biasa.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos.
- **SIT-122 diulang dari awal di build branch ini** (server lokal, DB lokal, slip 010/LCH-PLCMT/PS-PAR/XI/2026 dua lokasi): 13 cek lolos.
  - Daftar bersama tersimpan di kedua lokasi, dan dokumen mencetaknya sekali.
  - Saklar menyala menampilkan kotak per lokasi. Deductible Lokasi 2 tersimpan sendiri, dan dokumen mencetak Location 1 dan Location 2.
  - Saklar dimatikan: dialog konfirmasi muncul, Samakan menutup dialog, dan Simpan Perubahan menyimpan kedua lokasi sama.
  - Lokasi baru menyalin deductible Lokasi 1.
  - Tidak ada error console.

## Catatan untuk yang melanjutkan

- Tombol aksi di `AlertDialog` yang tidak berpindah halaman perlu menutup dialognya sendiri, misalnya dengan state `open` seperti di sini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
