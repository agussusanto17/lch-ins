# Lapisan Server Rate Engine OJK

- **Tanggal:** 2026-10-22
- **Branch:** `feat/ojk-rate-engine-exception-guard`
- **PR:** #25 (menggantikan #26)
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Validasi rate OJK (batas FLEXAS per okupasi, zona gempa dan banjir, batas
brokerage, BI rate terhadap FLEXAS) selama ini hanya berjalan di form klien.
Server belum punya fungsi yang sama, sehingga release placing slip belum bisa
dijaga di sisi server.

## Yang berubah

- `lib/server/tariffs.ts` (baru, server-only):
  - `getOccupationBounds`, `getPropertyRateBounds`: batas rate Property dari
    tabel okupasi, zona gempa, dan zona banjir OJK.
  - `isOutOfBounds`, `getMissingExceptions`: deteksi rate di luar batas yang
    belum punya catatan exception.
  - `getMaxBrokeragePct`, `brokerageExceedsCap`: batas brokerage 15% Property
    dan 25% Motor Vehicle (SE OJK No. 6/SEOJK.05/2017).
  - `validateBiRateScaling`: BI PAR dan BI EQVET tidak boleh di bawah FLEXAS.
  - `validatePlacingSlipForRelease`: menggabungkan semua cek di atas plus
    kelengkapan isian slip. `brokerageIssue` kini terisi bila brokerage
    melebihi batas.
- `saveRateExceptions` dari commit awal dihapus. Fungsi itu menulis ke model
  `rateException` yang tidak ada di schema. Rate exception sudah tersimpan di
  kolom `reason` pada `slip_rate_lines` lewat `lib/server/placing-slips.ts`.
- Import dari PR #26 ikut digabung ke sini, jadi #26 tidak diperlukan lagi.

## Dampak

- **Database:** tidak ada perubahan schema atau migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`: 0 error.
- `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- Fungsi-fungsi ini belum dipanggil dari Server Action mana pun. Langkah
  berikutnya: panggil `validatePlacingSlipForRelease` di
  `releasePlacingSlipAction` (`app/(app)/underwriting/actions.ts`) supaya
  release ditolak di server, tidak hanya di form.
- `getMotorRateBounds` masih mengembalikan `null`. Batas rate motor perlu
  diambil dari tabel tarif motor OJK.
- Batas EQVET diturunkan dari nomor zona karena tabel tarif gempa properti
  belum diekspor dari `lib/data/ojk-tariff`.
