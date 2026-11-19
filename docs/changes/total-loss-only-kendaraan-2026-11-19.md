# Cover Total Loss Only untuk kendaraan Motor Vehicle

- **Tanggal:** 2026-11-19
- **Branch:** `feat/total-loss-only-kendaraan`
- **PR:** #287
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Masukan Harry (19 November 2026), diteruskan Agus dengan dua gambar: judul kolom "Rate Comprehensive Casco (%)" di template upload kendaraan, dan daftar cover kendaraan di form slip. Kendaraan bisa dijamin Comprehensive Casco atau Total Loss Only (TLO), tetapi form dan template hanya punya Comprehensive Casco. Akibatnya:

- Rate TLO hanya bisa diketik di baris Comprehensive Casco, dan batas OJK-nya mengikuti type of cover slip. Satu slip tidak bisa berisi kendaraan Comprehensive dan TLO sekaligus.
- Dokumen mencetak kendaraan TLO sebagai Comprehensive Casco.

## Yang berubah

- **Cover standar Motor Vehicle:** Total Loss Only tepat setelah Comprehensive Casco (`MOTOR_RATE_LINES` dan seed `cob_rate_lines`). Setiap kendaraan baru mendapat baris ini.
- **Slip lama di form:**
  - Kendaraan slip Draft, Released, atau Quoted yang belum punya baris TLO mendapat baris kosong tepat setelah Comprehensive Casco (`slipForForm`, `withTotalLossLines`).
  - Form tidak dianggap berubah; baris itu tersimpan saat slip disimpan berikutnya.
  - Slip Closed, Cancelled, dan yang terkunci slip perubahan dibiarkan.
- **Batas OJK:**
  - Baris TLO memakai tarif casco TLO. Baris Comprehensive Casco tetap mengikuti type of cover slip, seperti sebelumnya.
  - Perluasan kendaraan yang hanya mengisi rate TLO memakai tarif perluasan TLO.
  - Form dan pengecekan release memakai satu fungsi, `motorRateLinesWithBounds` di `lib/slip-vehicles.ts`. Sebelumnya logika batas Motor ada dua salinan, di form dan di server (catatan PR #284).
  - Kendaraan yang pindah Comprehensive ↔ TLO lewat isian rate atau panel Referensi Tarif OJK: batas tersimpan perluasannya dikosongkan supaya dihitung ulang (`cascoSwitchPatch`).
- **Panel Referensi Tarif OJK:** pilihan TLO mengisi baris Total Loss Only, bukan Comprehensive Casco.
- **Release:** kendaraan yang mengisi rate Comprehensive Casco dan TLO sekaligus ditolak dengan pesan "Isi salah satu rate casco kendaraan N: Comprehensive Casco atau Total Loss Only." Slip satu kendaraan juga dicek.
- **Upload kendaraan:**
  - Template punya kolom Rate Total Loss Only (%) dan Deductible Total Loss Only setelah Comprehensive Casco, juga untuk slip lama.
  - Catatan judul kolom dan sheet Petunjuk menjelaskan pilihan Comprehensive atau TLO.
  - Baris yang mengisi keduanya gagal dengan pesan per baris.
- **Dokumen:** DAFTAR UNIT KENDARAAN sudah mengambil cover utama dari baris casco yang terisi, jadi kendaraan TLO tercetak Total Loss Only. Kode dokumen tidak berubah.
- **Salinan template untuk Team LCH:** `documents/Template Upload Kendaraan MV LCH.xlsx` dibuat ulang (di luar repo).

## File utama

- `lib/slip-vehicles.ts`: `TOTAL_LOSS_LINE`, `isTotalLossLine`, `hasMixedCasco`, `vehicleCoverType`, `cascoSwitchPatch`, `withTotalLossLabel`, `withTotalLossLines`, `motorRateLinesWithBounds`.
- `components/underwriting/slip-model.ts`: `rateLinesWithBounds`, `vehicleRateLabels`, `vehicleIssues`, `slipForForm`.
- `lib/server/tariffs.ts`: `attachSlipRateBounds` memakai fungsi bersama.
- `components/underwriting/placing-slip-form.tsx`, `components/underwriting/slip-vehicles.tsx`, `components/underwriting/ojk-panels.tsx`.
- `lib/vehicle-import.ts`, `lib/data/reference.ts`, `prisma/seed.ts`.
- `tests/total-loss-only.test.ts` (baru), `tests/calc.test.ts`, `tests/vehicle-import.test.ts`.

## Dampak

- **Database:** tidak ada migrasi. Baris TLO tersimpan seperti baris rate lain. Seed `cob_rate_lines` ditambah satu baris; tabel itu belum dibaca app.
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah tambahan.
- **Slip lama** yang dibuka lalu disimpan mendapat baris TLO kosong per kendaraan. Dokumennya tidak berubah karena baris tanpa rate tidak dicetak.

## Verifikasi

- `npx tsc --noEmit` dan `npm run build`: lolos. eslint: bersih untuk file yang diubah.
- `npx tsx --test tests/*.test.ts`: 343 lolos.
  - 7 test baru di `tests/total-loss-only.test.ts`.
  - 2 test di `tests/calc.test.ts` disesuaikan dari 8 ke 9 cover standar.
  - Test kolom yang diabaikan di `tests/vehicle-import.test.ts` memakai kolom lain, karena TLO sekarang cover slip.
- **Browser lokal** (tidak disimpan):
  - Draft 2 kendaraan (fleet Hiace, Kategori 5 Wilayah 3): baris TLO muncul di bawah Comprehensive Casco dengan batas OJK 0,200–0,240 (Comprehensive 1,050–1,160), dan form tetap "Tersimpan".
  - Kendaraan 2 dipindah ke TLO 0,22: Comprehensive kosong tanpa tanda, dan batas perluasan ikut tarif TLO (Flood dan Earthquake 0,050–0,075, SRCC 0,035).
  - Comprehensive diisi lagi: dialog Release menampilkan "Isi salah satu rate casco kendaraan 2: Comprehensive Casco atau Total Loss Only."
  - Drawer Upload Excel: daftar cover berisi Total Loss Only setelah Comprehensive Casco.
  - Draft dengan batas tersimpan (Avanza, Kategori 3 Wilayah 3): pindah ke TLO 0,3, batas perluasan langsung ikut tarif TLO.
  - Panel Referensi Tarif OJK di kendaraan yang sama, pilihan TLO lalu Bawah: baris Total Loss Only terisi 0,29 (batas 0,290–0,350, premi IDR 725.000), dan batas perluasan ikut tarif TLO.
  - Database tidak berubah (audit 525, slip 31). Sesi uji dihapus.

## Catatan untuk yang melanjutkan

- **PR #276** (batas OJK kendaraan saat data kendaraan berubah, masih open) membandingkan batas otomatis sebelum dan sesudah patch dengan rate yang sama, jadi perpindahan Comprehensive ↔ TLO tidak tertangkap di sana. Kasus itu ditangani `cascoSwitchPatch`, dipanggil dari kartu kendaraan (`slip-vehicles.tsx`) supaya `set` dan `applyOjkRate` di form, yang juga diubah #273 dan #276, tidak tersentuh. `git merge-tree` terhadap #273, #276, #285, dan #286 bersih.
- **Loading Rate Comprehensive** tidak dicek untuk kendaraan TLO.
- **Type of cover slip "Total Loss Only (TLO)"** tetap ada. Slip TLO lama yang mengisi rate di baris Comprehensive Casco tetap memakai batas TLO seperti sebelumnya.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
