# Cetak cancellation: nomor lampiran dan nilai pertanggungan sebelum pembatalan

- **Tanggal:** 2026-11-10
- **Branch:** `fix/cetak-cancellation-nomor`
- **PR:** [#216](https://github.com/agussusanto17/lch-ins/pull/216)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Lanjutan `cetak-endorsement-2026-11-10.md` (#215). Agus bertanya apakah pembatalan juga sudah bisa dicetak. Saat diuji di browser dengan record pembatalan, ada dua celah. Penyebabnya, record Cancellation di Policy Database tidak mendapat nomor urut endorsement, karena `endorsementSeqFor` hanya memberi nomor untuk tipe Endorsement.

1. **Lampiran No.** tercetak "—", padahal contoh CANCELLATION dari asuransi tetap bernomor lampiran.
2. **Nilai pertanggungan sebelum pembatalan** tidak menghitung endorsement sebelumnya. Polis yang pernah diendorse dengan tambahan nilai pertanggungan jadi tercetak dengan nilai "Setelah Perubahan" yang negatif.

## Yang berubah

- **Nomor lampiran pembatalan** adalah nomor sesudah endorsement terakhir pada polis induk. Contoh: polis dengan END1 lalu dibatalkan, pembatalannya tercetak Lampiran No. 02. Endorsement tetap memakai urutannya sendiri.
- **Nilai pertanggungan sebelum perubahan:**
  - **Pembatalan:** polis induk ditambah semua endorsement-nya. Ini sama dengan dasar usulan premi pembatalan (#207), jadi nilai setelah pembatalan menjadi 0.
  - **Endorsement:** polis induk ditambah endorsement dengan urutan lebih kecil, seperti sebelumnya.
  - **Tidak ikut dihitung:** renewal (yang juga menunjuk polis sebelumnya sebagai induk) dan pembatalan lain.
- **Logikanya dipindah ke helper murni** `attachmentSeq` dan `sumInsuredBefore` di `lib/endorsement-slip.ts`, supaya bisa dites.
- **Data di database tidak berubah.** Perbaikan ini hanya mengubah cara cetak menghitung nomor dan nilai.

## File utama

- `lib/endorsement-slip.ts`, `lib/server/endorsement-slip.ts`, `components/documents/endorsement-document.tsx`
- `tests/endorsement-slip.test.ts` (3 tes baru)

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts` (181 tes), dan `npm run build`: lolos.
- **Uji browser lokal:** record pembatalan dibuat sementara lewat SQL untuk `SIT/PA/2026/001`, yang bernilai 600 jt dengan END1 +150 jt. Hasil cetak:
  - judul CANCELLATION dan Lampiran No. 02;
  - nilai pertanggungan IDR 750.000.000,00, perubahan (IDR 750.000.000,00), dan nilai setelah perubahan IDR 0,00;
  - pengembalian premi (IDR 100.000,00).

  Record uji dihapus setelahnya. Uji cetak endorsement dari #215 diulang dan tetap lolos.
- Tidak ada error di console.

## Catatan untuk yang melanjutkan

- **Pembatalan tetap tanpa `endorsementSeq` di database.** Kalau LCH ingin pembatalan punya nomor tetap di Policy Database, `endorsementSeqFor` di `lib/server/policies.ts` perlu ikut memberi nomor untuk tipe Cancellation.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
