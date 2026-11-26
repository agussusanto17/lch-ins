# Marine Hull: TSI dari jumlah nilai semua section (H&M, IV, War)

- **Tanggal:** 2026-11-26
- **Branch:** `fix/marine-hull-tsi-semua-section`
- **PR:** #326
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

#323 menghitung TSI jadwal kapal sebagai H&M + IV (+AOI). War tidak ditambahkan dengan anggapan menjamin kapal yang sama, dan #324 menambahkan pengecualian untuk polis War saja.

Agus, 26 November 2026: "TSI kami hitung dari masing masing nilai H&M / IV (+AOI) / War bro, karena kan ada rate dan premi sendiri".

## Yang berubah

- **TSI slip jadwal kapal = jumlah nilai semua section:** H&M + IV (+AOI) + War. Nilai objek Interest slip ikut berubah, jadi ikut juga ke:
  - Total Sum Insured di form dan cetak;
  - TSI polis dari CI;
  - report yang memakai TSI polis.
- **Contoh Patria:** 818.754.851.372,80 + 204.688.712.843,20 + 1.023.443.564.216,00 = 2.046.887.128.432,00. Sebelumnya 1.023.443.564.216,00.
- **Polis War saja** tetap ber-TSI nilai War.
- **Keterangan di kartu jadwal kapal dan ringkasan Interest Insured** disesuaikan.

## File utama

- `lib/marine-hull.ts`: `hullSumInsured`.
- `components/underwriting/slip-hull-schedule.tsx`, `components/underwriting/placing-slip-form.tsx`: keterangan TSI.
- `tests/marine-hull.test.ts`.

## Dampak

- **Database:** tidak ada migrasi. Slip Marine Hull yang tersimpan sebelum perubahan ini memakai TSI baru saat disimpan ulang. Polis yang sudah tercatat dari slip itu tidak berubah otomatis.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, dan `npm run build`: lolos.
- `node --import tsx --test tests/*.test.ts`: 468 lolos.
  - TSI jadwal Patria 2.046.887.128.432.
  - Polis War saja tetap 1.023.443.564.216, yaitu nilai War.
- graphify belum terpasang di mesin ini, jadi graph tidak diperbarui.
