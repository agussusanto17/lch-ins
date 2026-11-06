# Kelas konstruksi opsional untuk slip tanpa rate FLEXAS dan EQVET

- **Tanggal:** 2026-11-06
- **Branch:** `fix/kelas-konstruksi-opsional`
- **PR:** [#153](https://github.com/agussusanto17/lch-ins/pull/153)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Pertanyaan 16 analisa contoh slip LCH menanyakan apakah kelas konstruksi
boleh kosong untuk CI Terrorism & Sabotage Habco (contoh 09), yang memang
tanpa kelas. Harry menjawab pada 6 November 2026: "bisa kosong bisa diisi".

Sistem mewajibkan kelas konstruksi untuk semua slip Property sebelum release.
Akibatnya slip Terrorism & Sabotage tidak bisa terbit sesuai contoh.

## Yang berubah

- **Release:** kelas konstruksi hanya wajib bila lokasi punya rate FLEXAS
  atau EQVET, karena batas tarif OJK keduanya bergantung kelas konstruksi.
  - Slip tanpa kedua rate itu, misalnya Terrorism & Sabotage yang rate-nya di
    Other Losses, boleh tanpa kelas.
  - Pengecekan yang sama dipakai di form dan server.
- **Form, isian Construction Class:** tanda wajib hanya muncul bila rate
  FLEXAS atau EQVET diisi. Keterangannya menjelaskan aturan ini.

## File utama

- `lib/slip-locations.ts`: `needsConstructionClass`.
- `components/underwriting/slip-model.ts`: `locationIssues` untuk satu lokasi
  dan multi lokasi.
- `components/underwriting/slip-locations.tsx`: tanda wajib dan keterangan.
- `tests/calc.test.ts`: satu tes baru.

## Dampak

- **Database:** tidak ada.
- **Slip PAR dan EQVET:** tetap wajib kelas konstruksi.
- **Env:** tidak ada.
- **Deploy:** setelah merge, sinkronkan fork.

## Verifikasi

- **Tes:** slip Property dengan rate Other Losses saja lolos tanpa kelas
  konstruksi. Begitu rate FLEXAS diisi, muncul "Pilih kelas konstruksi.".
- **Browser lokal**, di halaman uji sementara yang sudah dihapus: pada slip
  PSATSI dengan rate Other Losses saja, Construction Class tampil tanpa tanda
  wajib, dan daftar release tidak meminta kelas konstruksi.
- `npx tsc --noEmit`, `npx eslint` untuk file yang berubah,
  `npx tsx --test tests/*.test.ts`, dan `npm run build`: lolos.

## Catatan untuk yang melanjutkan

- **Baris rate Terrorism & Sabotage** belum ada. Rate masih masuk Other
  Losses, dan cetakannya masih format PAR/EQVET (Tahap 3 nomor 16 analisa
  contoh slip).
- **Brokerage 0%** sudah bisa dan tercetak 0%. Harry menerima isian kosong
  maupun nol, jadi tidak diubah.
- **Aturan Wajib nomor 4 belum dijalankan:** graphify belum terpasang di mesin
  ini.
