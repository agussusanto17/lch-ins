# Banner slip Released dan Quoted tanpa "menunggu keputusan LCH"

- **Tanggal:** 2026-11-12
- **Branch:** `fix/banner-revisi-slip-released`
- **PR:** [#232](https://github.com/agussusanto17/lch-ins/pull/232)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Form slip berstatus Released atau Quoted menampilkan banner kuning: "Slip sudah di-release dengan nomor …. Perubahan setelah release tetap bisa disimpan, sementara aturan revisi menunggu keputusan LCH."
- Teks itu berasal dari frontend awal (commit `39f4e9a`, 12 September 2026), saat aturan revisi slip belum ada. Agus menanyakannya pada 12 November 2026.
- Aturan revisi sekarang sudah jalan di aplikasi dan sudah dibahas dengan Harry:
  - Slip Released dan Quoted tetap bisa diubah dengan nomor yang sama, dan perubahannya tercatat di Audit Trail.
  - Slip Closed direvisi lewat Simpan Revisi (#187). Revisi itu ikut ke polis yang masih bernomor sementara (#213).
  - Perubahan setelah closing dibuat lewat endorsement atau cancellation slip sampai tercatat di polis (#221, jawaban Harry atas pertanyaan no. 2).
  - Slip asal terkunci setelah ada endorsement atau cancellation slip (#224).
  - Contoh slip dari LCH juga tidak memakai tanda revisi.
- Jadi tidak ada keputusan LCH yang masih ditunggu. Banner itu menyesatkan, apalagi menjelang demo Bagian A tanggal 17 November.

## Yang berubah

- **Teks banner:** "Slip sudah di-release dengan nomor …. Perubahan tetap bisa disimpan dengan nomor yang sama, dan setiap perubahan tercatat di Audit Trail."
- **Gaya banner** berubah dari peringatan (kuning) menjadi info (biru), sama dengan banner slip Closed, karena isinya keterangan, bukan peringatan.
- **Kondisi tampil tidak berubah:** slip berstatus Released dan Quoted.

## File utama

- `components/underwriting/placing-slip-form.tsx`: teks dan gaya banner.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- **Uji browser lokal** (sesi admin sementara): form edit slip Released menampilkan banner biru dengan teks baru, tanpa kalimat "menunggu keputusan LCH".

## Catatan untuk yang melanjutkan

- Kalau LCH nanti meminta nomor revisi di dokumen (misalnya "Rev. 1"), itu fitur baru, bukan bagian dari banner ini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
