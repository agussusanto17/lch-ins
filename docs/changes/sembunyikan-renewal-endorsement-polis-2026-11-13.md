# Sembunyikan Buat renewal dan Buat endorsement di Policy Database

- **Tanggal:** 2026-11-13
- **Branch:** `fix/sembunyikan-renewal-endorsement-polis`
- **PR:** [#248](https://github.com/agussusanto17/lch-ins/pull/248)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Permintaan Agus, 13 November 2026:** menu baris Policy Database tidak perlu punya Buat renewal dan Buat endorsement, karena keduanya diproses di Placement. Dari Placement, polis masuk Policy Database otomatis. Aksinya disembunyikan saja, jangan dihapus, kalau nanti diminta lagi.
- **Alur di Placement yang menggantikannya:**
  - **Renewal:** slip dengan baris Existing Policy No. tercatat sebagai polis Renewal saat Closing Instruction terbit (`lib/server/auto-policies.ts`).
  - **Endorsement dan cancellation:** dibuat dari slip yang sudah Closed lewat menu baris Placement (Buat endorsement slip, Buat cancellation slip), lalu tercatat di Policy Database saat ditutup (#221).

## Yang berubah

- `components/policies/policy-database.tsx`: konstanta `SHOW_RENEWAL_ENDORSEMENT_ACTIONS = false` menyembunyikan Buat renewal dan Buat endorsement di menu baris. Kodenya tetap ada; ubah konstanta ke `true` untuk menampilkannya lagi.
- **Menu baris lain tidak berubah:** Edit polis, Berkas polis, cetak endorsement/cancellation slip, Peserta PA, dan Hapus.
- **Tambah Polis tetap bisa memilih tipe Renewal, Endorsement, dan Cancellation**, untuk polis di luar sistem atau slip di luar sistem (misalnya polis tahun lalu).

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** biasa.
- **Test case SIT:** tidak ada langkah yang bergantung pada menu baris ini. SIT-061, SIT-079, SIT-096, dan SIT-112 tetap bisa lewat Tambah Polis.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos, kecuali 3 tes margin cetak 18 mm di `tests/documents.test.ts` yang sudah gagal di main sejak #236.
- **Uji browser lokal** (build `next start`, sesi admin sementara, DB lokal):
  - Menu baris kesepuluh polis di halaman pertama (Baru, Renewal, dan Endorsement) tidak memuat Buat renewal maupun Buat endorsement. Contoh polis Baru SIT/PA/2026/001: Edit polis, Berkas polis, Peserta (3), Hapus.
  - Tambah Polis masih menawarkan tipe Baru, Renewal, Endorsement, dan Cancellation.
  - Tidak ada error console.

## Catatan untuk yang melanjutkan

- Renewal Notice tetap menampilkan polis yang akan berakhir walau renewal-nya sudah dicatat. Ini perilaku lama, tidak berubah oleh perubahan ini.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
