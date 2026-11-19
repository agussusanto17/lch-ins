# Sejajarkan titik dua pada Object of Insured Motor Vehicle multi kendaraan

- **Tanggal:** 2026-11-19
- **Branch:** `fix/perataan-titik-dua-object-of-insured`
- **PR:** #289
- **Dikerjakan oleh:** Zero dengan Antigravity

## Latar belakang

- Pada dokumen slip Motor Vehicle multi kendaraan (`VehiclesAttachedInterest` di bagian `INTEREST INSURED`), daftar atribut di bawah `Object of Insured` (`Merk / Model / Sub Model`, `Type / Year of Built`, `Police No.`, `Chassis No. / Engine No.`, `Colour`) sebelumnya dirender sebagai teks polos sehingga posisi `:` tidak sejajar vertikal.

## Yang berubah

- Memperluas tipe `InfoRow` di `components/documents/doc-blocks.tsx` agar dapat menerima `React.ReactNode`.
- Mengubah `VehiclesAttachedInterest` agar merender sub-tabel 3 kolom (`label`, `:`, `As Attached`) sehingga seluruh `:` sejajar rapi di satu kolom.
- Menambahkan pengujian regresi di `tests/documents.test.ts`.

## File utama

- `components/documents/doc-blocks.tsx`: dukungan `React.ReactNode` pada `InfoTable` dan sub-tabel `VehiclesAttachedInterest`.
- `tests/documents.test.ts`: uji struktur tabel `VehiclesAttachedInterest`.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.

## Verifikasi

- `npx tsc --noEmit`
- `npx eslint components/documents/doc-blocks.tsx`
- `npx tsx --test tests/*.test.ts`
- `npm run build`
- E2E `ego-browser`: cek PDF `/placement/slip/78e361c5-5692-4681-bf5b-791712311d54` (Motor Vehicle 2 unit).

## Catatan untuk yang melanjutkan

- Tidak ada.
