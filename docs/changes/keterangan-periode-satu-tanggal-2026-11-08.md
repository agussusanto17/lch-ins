# Keterangan "both days" tidak dicetak untuk periode satu hari

- **Tanggal:** 2026-11-08
- **Branch:** `fix/keterangan-periode-satu-tanggal`
- **PR:** belum dibuka
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Temuan SIT 8 November 2026 (SIT-073), disetujui Agus untuk dikerjakan:

- Slip Hole In One 006/LCH-PLCMT/PS-HIO/XI/2026 berperiode satu hari, jadi
  dokumennya mencetak satu tanggal: "Date of Tournament : 21 November 2026"
  (#145, #154).
- Di bawah tanggal itu tetap tercetak keterangan bawaan "Both days at 12
  o'clock noon local time at the location of the insured object." Keterangan
  ini terisi otomatis untuk slip baru sejak #137.
- Kata "both days" mengacu ke dua tanggal, jadi tidak tepat untuk periode satu
  hari.
- #154 sudah tidak mencetak keterangan periode saat teks akhir periode
  dipakai, dengan alasan yang sama.

## Yang berubah

- **Dokumen slip, baris periode:** bila tanggal mulai sama dengan tanggal
  akhir, keterangan periode yang menyebut "both days" tidak dicetak.
- **Keterangan lain tetap dicetak** walau periodenya satu hari, misalnya
  "Tee off 07.00 local time."
- **Form slip, isian Keterangan periode:** keterangan di bawah isian berganti
  menjadi "Tanggal mulai dan akhir sama, jadi keterangan yang menyebut “both
  days” tidak dicetak." Pesan ini hanya muncul untuk keadaan itu.
- **Data slip tidak berubah.** Keterangan tetap tersimpan, dan tercetak lagi
  bila periodenya diubah menjadi dua tanggal.

## File utama

- `components/underwriting/slip-model.ts`: `slipPeriodRow`, serta helper
  `isSingleDayPeriod` dan `periodNoteNeedsTwoDates`.
- `components/underwriting/placing-slip-form.tsx`: keterangan isian.
- `tests/calc.test.ts`: dua asersi baru di test baris periode.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.
- **Dokumen:** berlaku di keempat dokumen slip, karena semuanya memakai
  `slipPeriodRow`.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 110 lolos. Test baris periode mendapat
  kasus satu hari dengan keterangan bawaan (tidak dicetak) dan dengan
  keterangan lain (dicetak).
- `npm run build`: lolos.
- **Uji browser lokal** dengan sesi login sementara:
  - **Hole In One 006:** "Date of Tournament : 21 November 2026" langsung
    diikuti Risk Location, tanpa keterangan "Both days".
  - **Public Liability 007, dua tanggal:** keterangan "Both days…" tetap
    tercetak di bawah periode.
  - **Marine Cargo 005 dengan teks akhir periode:** tidak berubah.
  - **Form:** keterangan isian berganti di slip Hole In One dan tetap seperti
    biasa di slip Public Liability.

## Catatan untuk yang melanjutkan

- Pengenalan memakai kata "both days" (tidak peka huruf besar-kecil). Kalau
  LCH memakai keterangan dua tanggal dengan kalimat lain, tambahkan polanya di
  `periodNoteNeedsTwoDates`.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
