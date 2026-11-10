# Polis otomatis tercatat saat Closing Instruction terbit

- **Tanggal:** 2026-11-10
- **Branch:** `feat/polis-otomatis-dari-ci`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Catatan meeting LCH, 10 November 2026: begitu Closing Instruction terbit dari Placement, polisnya langsung tercatat di Policy Database. Petugas polis tinggal mengunggah polis dari asuransi.

Sebelumnya petugas polis harus membuat polis sendiri lewat "polis dari slip" di form polis.

## Yang berubah

- **Saat slip berpindah ke Closed** (tombol "Terbitkan Closing Instruction", atau ubah status ke Closed), server mencatat polisnya:
  - **Data** disalin dengan aturan yang sama seperti "polis dari slip": klien, tertanggung, COB, type of cover, periode, mata uang, TSI, premi, brokerage, additional fee, risk location, dan panel asuransi beserta share.
  - **Slip PAR + EQVET** menjadi dua polis, satu per bagian. Premi per bagian, polis EQVET memakai type of cover kedua, dan additional fee ikut polis PAR.
  - **Nomor polis sementara** memakai nomor Closing Instruction, misalnya `005/LCH-PLCMT/CI-MC/X/2026`, dengan akhiran ` (PAR)` atau ` (EQVET)` untuk slip PAR + EQVET.
  - **Tipe polis Baru.** Slip yang punya baris Existing Policy No. dicatat sebagai Renewal, dengan nomor polis sebelumnya dari baris itu.
  - **Tidak dobel.** Bagian yang sudah punya polis tidak dibuat lagi. Simpan revisi slip Closed juga tidak membuat polis baru.
  - **Slip yang dilewati,** dengan alasan dikembalikan sebagai info:
    - slip open cover, karena polisnya per deklarasi;
    - slip yang periodenya belum diisi.
  - **Gagal mencatat polis tidak membatalkan CI.** Alasannya dikembalikan supaya polis bisa dicatat manual.
- **Dokumen Closing Instruction** menampilkan keterangan (tidak ikut tercetak) di atas dokumen:
  - Kalau sudah ada polis: nomor polis yang tercatat dari CI ini, petunjuk mengganti nomor sementara, dan tautan ke Policy Database.
  - Kalau belum ada: tertulis "Belum ada polis di Policy Database".
  - Toast tidak dipakai di sini, karena halaman dokumen memakai layout cetak tanpa toast. Toast "Closing instruction diterbitkan" juga tidak pernah terlihat setelah pindah ke dokumen.
- **Form polis:** isian No. Polis yang masih bernomor sementara diberi keterangan "Nomor sementara dari Closing Instruction. Ganti dengan nomor polis dari asuransi."
- **Fungsi bersama:** aturan salin slip ke polis pindah dari form polis (`slipPatch`) ke `lib/policy-from-slip.ts`, jadi form dan pencatatan otomatis memakai fungsi yang sama.

## File utama

- `lib/policy-from-slip.ts`:
  - `policyFieldsFromSlip`;
  - `slipExistingPolicyNo`;
  - `provisionalPolicyNo` dan `isProvisionalPolicyNo`.
- `lib/server/auto-policies.ts`: `recordPoliciesFromClosing` dan `policyNosForSlip`.
- `app/(app)/underwriting/actions.ts`:
  - memanggil pencatatan saat status berpindah ke Closed, di simpan slip dan ubah status;
  - menambahkan `notice` di `ActionResponse`.
- `app/(print)/underwriting/closing/[id]/page.tsx`, `components/documents/slip-documents.tsx`, `components/documents/document-shell.tsx`: keterangan polis di dokumen CI.
- `components/policies/policy-form.tsx`: memakai `policyFieldsFromSlip`, dan keterangan nomor sementara.
- `components/underwriting/placing-slip-form.tsx`: toast info polis setelah CI terbit.
- `tests/policy-from-slip.test.ts`.

## Dampak

- **Database:** tidak ada migrasi. Polis baru dibuat lewat `createPolicy`, lengkap dengan audit trail "Create".
- **Env:** tidak ada.
- **Deploy:** tanpa migrasi.
- **Data lama:** slip yang sudah Closed sebelum perubahan ini tidak dibuatkan polis otomatis. Polisnya tetap bisa dicatat lewat form polis seperti biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (158 tes, 4 tes baru), dan `npm run build`: lolos.
- **Uji browser lokal** (Playwright dan Chrome, sesi admin sementara). Slip uji dikembalikan ke Quoted dan polis uji dihapus setelahnya.

  | Uji | Hasil |
  |---|---|
  | Terbitkan CI slip 005/LCH-PLCMT/PS-MC/X/2026 | Dokumen CI menampilkan "Polis tercatat di Policy Database: 005/LCH-PLCMT/CI-MC/X/2026" dan petunjuk nomor sementara |
  | Polis di database | 005/LCH-PLCMT/CI-MC/X/2026, tipe Baru, premi 6.075, mulai 20 Agustus 2026, 1 asuransi |
  | Policy Database | Polis muncul di daftar; form menampilkan keterangan nomor sementara |
  | Jumlah polis dari slip | 1, tidak dobel |

- Tidak ada error di console browser.

## Catatan untuk yang melanjutkan

- Polis dari slip memakai isian yang dikunci di form polis (lihat REQ-022). Perubahan slip sesudah polis tercatat tidak ikut memperbarui polis.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
