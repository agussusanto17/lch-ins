# Centang Limit saja di Interest Insured slip open cover

- **Tanggal:** 2026-11-08
- **Branch:** `fix/open-cover-limit-saja`
- **PR:** belum dibuka
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Temuan SIT 8 November 2026 (SIT-083), disetujui Agus untuk dikerjakan:

- Limit slip open cover dicatat sebagai objek "Limit saja", misalnya Limit of
  Liability IDR 75 M any one conveyance pada MOP. Fitur ini dibuat di #168.
- Pilihan "Limit saja" hanya ada di kolom Dasar pada tabel rate per objek.
  Tabel itu disembunyikan saat switch open cover menyala.
- Akibatnya, user harus mematikan switch open cover sebentar untuk memilih
  Limit saja, lalu menyalakannya lagi.

## Yang berubah

- **Interest Insured slip open cover:** tiap baris punya centang **Limit saja**
  di bawah isian nilai.
- **Flag yang sama:** centang ini mengubah flag `limitOnly` yang sama dengan
  pilihan Dasar "Limit saja" di tabel rate. Saat switch open cover dimatikan,
  tabel rate langsung menunjukkan Dasar Limit saja untuk baris itu.
- **Hanya untuk open cover:** centang hanya tampil saat slip memakai open cover.
  Slip lain tetap mengatur Dasar di Rate & Premium.
- **Petunjuk** di bagian rate open cover kini menyebut centang ini.

## File utama

- `components/underwriting/line-items.tsx`: prop `limitToggle` dan centang
  per baris.
- `components/underwriting/placing-slip-form.tsx`: `limitToggle` dinyalakan
  saat `usesOpenCover(slip)`.
- `components/underwriting/open-cover-rates.tsx`: teks petunjuk.

## Dampak

- **Database:** tidak ada. Kolom `slip_items.is_limit_only` sudah ada sejak #141.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan selain sinkron fork.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 110 lolos.
- `npm run build`: lolos.
- **Uji browser lokal** dengan sesi login sementara:
  - **Slip Marine Cargo 0323 tanpa open cover:** tidak ada centang Limit saja.
  - **Slip 0311 Marine Cargo Open Cover:**
    - centang tampil di baris Interest;
    - setelah dicentang, total menjadi "Total Interest Insured (tanpa limit)
      IDR 0";
    - `is_limit_only` tersimpan dan centang tetap aktif setelah reload;
    - saat switch dimatikan, Dasar di tabel rate tertulis Limit saja;
    - dokumen mencetak "Limit IDR 75.000.000.000".
- Draft uji sudah dihapus.

## Catatan untuk yang melanjutkan

- Slip ber-section (CAR, EAR) tidak memakai centang ini. Limit Section 2
  sudah otomatis Limit saja.
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
