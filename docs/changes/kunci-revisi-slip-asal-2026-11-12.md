# Kunci revisi slip asal setelah ada endorsement atau cancellation slip

- **Tanggal:** 2026-11-12
- **Branch:** `feat/kunci-revisi-slip-asal`
- **PR:** [#224](https://github.com/agussusanto17/lch-ins/pull/224)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Lanjutan endorsement dan cancellation slip di Placement ([#221](https://github.com/agussusanto17/lch-ins/pull/221), catatan `endorsement-slip-placement-2026-11-12.md`).

Endorsement slip menyimpan kondisi sebelum perubahan (`before_calc`) saat dibuat. Slip yang sudah Closed, termasuk closing instruction-nya, sampai sekarang masih bisa direvisi. Akibatnya, kalau slip asal direvisi setelah endorsement slip dibuat:

- revisinya ikut ke polis induk di Policy Database, selama nomornya masih nomor sementara;
- revisinya tidak ikut ke endorsement slip yang sudah ada.

Perhitungan sebelum dan sesudah di endorsement slip jadi tidak cocok lagi dengan slip asal dan polis induk.

Harry bertanya apakah menghapus sesuatu di endorsement slip mengubah closing instruction awal. Jawabannya tidak: endorsement slip adalah salinan terpisah. Yang belum dijaga adalah arah sebaliknya. Agus memutuskan pada 12 November 2026: slip asal dikunci begitu ada endorsement atau cancellation slip, sehingga semua perubahan polis lewat endorsement slip.

## Yang berubah

- **Aturan kunci.** Sebuah slip terkunci dari revisi selama ada endorsement atau cancellation slip yang dibuat dari slip itu (`base_slip_id`) dan statusnya bukan Dibatalkan.
  - Berlaku untuk placing slip asal, dan untuk endorsement slip yang sudah Closed kalau endorsement atau cancellation berikutnya berangkat dari situ.
  - Kunci terbuka lagi kalau slip perubahan itu dihapus (masih draft) atau dibatalkan (sudah terbit, belum ditutup).
  - Slip perubahan yang sudah Closed tidak bisa dihapus atau dibatalkan, jadi kuncinya permanen.
- **Server.** `updatePlacingSlip` menolak penyimpanan slip yang terkunci dengan pesan alasannya. Penolakan ini juga berlaku untuk form yang dibuka sebelum endorsement slip dibuat, misalnya di tab lain.
- **Data slip.** Daftar dan detail slip memuat `changeSlipLock`: slip perubahan yang mengunci, berisi nomor, jenis, dan status. Datanya dari relasi `derivedSlips` dengan filter yang sama seperti guard server (`SLIP_CHANGE_LOCK`).
- **Form slip.** Untuk mode edit, quotation, dan closing:
  - semua isian, termasuk berkas lampiran, menjadi hanya-baca seperti slip yang dibatalkan;
  - tombol simpan disembunyikan;
  - banner menjelaskan alasannya, dengan tautan ke slip perubahannya:
    - draft: "…hapus dulu draft endorsement slip itu";
    - sudah terbit: "…batalkan dulu endorsement slip 019/…";
    - Closed: kunci permanen, tanpa saran tambahan;
    - cancellation yang Closed: "polisnya sudah dibatalkan lewat cancellation slip 020/…".
  - Banner "Anda tetap dapat melakukan revisi" untuk slip Closed tidak tampil lagi kalau slipnya terkunci.
- **Daftar Placement.** Menu "Edit slip" menjadi "Buka slip" untuk slip yang terkunci. Menu "Buat endorsement slip" dan "Buat cancellation slip" tetap ada.
- **Pesan** dibuat di `changeSlipLockText` dan `changeSlipName` (`lib/endorsement-slip.ts`), dipakai bersama oleh banner dan server.

## File utama

- `lib/server/placing-slips.ts`: `SLIP_CHANGE_LOCK`, `toChangeSlipLock`, include `derivedSlips` di daftar dan detail, guard di `updatePlacingSlip`.
- `lib/data/types.ts`: `ChangeSlipLock`, `PlacingSlip.changeSlipLock`.
- `lib/endorsement-slip.ts`: `changeSlipName`, `changeSlipLockText`.
- `components/underwriting/placing-slip-form.tsx`: mode terkunci dan banner. Kunci dibaca dari detail server walaupun form memakai data store.
- `components/underwriting/slip-table.tsx`: label "Buka slip".
- `tests/change-slip-lock.test.ts` (baru, 5 tes).

## Dampak

- **Database:** tidak ada migrasi. Memakai kolom `base_slip_id` dari #221.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint app components lib tests next.config.ts --quiet`, `npx tsx --test tests/*.test.ts` (199 tes, termasuk 5 tes baru), dan `npm run build`: lolos.
- **Uji browser ujung ke ujung** (Playwright dan Chrome, sesi sementara, worktree di port 3001). Slip MV uji 018/LCH-PLCMT/PS-MV/XI/2026 dibawa sampai Closed dan polisnya tercatat, lalu:
  1. Sebelum ada endorsement slip, slip asal masih bisa diedit.
  2. Setelah draft endorsement slip dibuat, slip asal terkunci: banner draft tampil, Admin Cost disabled, tombol simpan hilang.
  3. Form slip asal yang sudah terbuka di tab lain, lalu disimpan: ditolak server dengan toast "Gagal menyimpan slip — Slip ini terkunci…". Admin cost di database tidak berubah (50.000).
  4. Draft dihapus: slip asal terbuka lagi.
  5. Endorsement slip 019 diterbitkan: terkunci dengan saran "batalkan dulu…". Setelah 019 dibatalkan, slip asal terbuka lagi.
  6. Endorsement slip 020 ditutup (Closed): slip asal terkunci permanen. Form quotation dan closing slip asal juga terkunci, dan menu baris menampilkan "Buka slip".
  7. Draft endorsement berikutnya berangkat dari 020, jadi 020 ikut terkunci. Setelah draft dihapus, 020 terbuka lagi.
  8. Cancellation slip 021 ditutup:
     - 020 terkunci dengan alasan "polisnya sudah dibatalkan lewat cancellation slip 021/…";
     - slip asal tetap terkunci oleh 020;
     - cancellation slip sendiri tidak terkunci.
  9. Tidak ada error di console. Semua data uji (slip, polis, audit) dihapus per id, dan counter PS kembali ke 17.

## Catatan untuk yang melanjutkan

- **Berkas lampiran slip ikut terkunci**, sama seperti slip yang dibatalkan. Dokumen polis dari asuransi diunggah di Policy Database.
- **Cancellation slip dan endorsement slip terakhir yang sudah Closed** masih bisa direvisi, tapi revisinya tidak mengubah record di Policy Database. Ini batasan #221 yang belum berubah.
- **Polis tanpa placing slip** (input manual di Policy Database) tidak terpengaruh.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
