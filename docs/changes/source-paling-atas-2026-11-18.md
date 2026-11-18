# Isian Source di posisi paling atas form placing slip

- **Tanggal:** 2026-11-18
- **Branch:** `fix/source-paling-atas`
- **PR:** #270
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Lanjutan [cabang-client-source-slip-2026-11-18.md](cabang-client-source-slip-2026-11-18.md) (PR #267), yang menaruh isian Source di bawah tertanggung.
- Agus, 18 November 2026, setelah melihat form di produksi: Source ditaruh paling awal.

## Yang berubah

- Source menjadi isian pertama di bagian Informasi Dasar, sebelum Class of Business.
- **Aturan Source saat klien diganti disesuaikan.** Dengan posisi baru ini, Source bisa dipilih sebelum klien.
  - Source yang masih kosong, atau masih sama dengan isian awal dari cabang klien lama, ikut cabang klien baru.
  - Source yang dipilih manual tetap dipakai.
  - Sebelumnya Source selalu dikosongkan saat klien diganti, sehingga pilihan manual yang dibuat sebelum klien ikut hilang.

## File utama

- `components/underwriting/placing-slip-form.tsx`

## Dampak

- **Database:** tidak ada migrasi.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`, eslint, dan `npm run build`: lolos.
- **Browser lokal** (SIT Admin):
  - **Slip baru tanpa klien:** Source tampil sebagai isian pertama dengan placeholder "Pilih source".
  - **Pilihan manual:** pilih LCH Insurance Brokers Pte Ltd, lalu pilih klien PT Demo Sentosa Abadi (cabang Jakarta). Source tetap LCH Insurance Brokers Pte Ltd.
  - **Slip baru dengan klien Jakarta** (`/placement/new?client=…`): Source terisi PT. LCH Insurance Brokers.

## Catatan untuk yang melanjutkan

- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
