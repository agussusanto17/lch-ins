# Heavy Equipment tanpa tarif OJK

- **Tanggal:** 2026-11-09
- **Branch:** `feat/heavy-equipment-tanpa-tarif-ojk`
- **PR:** [#183](https://github.com/agussusanto17/lch-ins/pull/183)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- Type of cover Heavy Equipment (0203) ada di COB Motor Vehicle, jadi slipnya
  memakai form Motor Vehicle beserta semua batas tarif OJK kendaraan bermotor:
  - casco dan perluasan, TPL, dan PA;
  - batas biaya akuisisi (brokerage) Motor Vehicle 25%.
- Pertanyaan nomor 13 ke Harry: apakah tarif OJK berlaku untuk alat berat.
  Jawaban Harry (9 November 2026): Heavy Equipment tidak pakai tarif OJK.
- **Asumsi:** batas brokerage 25% juga tidak berlaku untuk Heavy Equipment.
  - Batas itu bagian dari aturan tarif OJK yang sama (SE OJK 6/2017).
  - Asumsi ini perlu dikonfirmasi ke Harry.

## Yang berubah

- **Master Data > COB & Cover Type:** isian baru **Pakai tarif OJK** per type
  of cover.
  - Hanya tampil untuk COB yang punya tarif OJK, yaitu Property dan Motor
    Vehicle.
  - Bawaannya menyala. Migrasi mematikannya untuk 0203 Heavy Equipment.
  - LCH bisa mematikannya sendiri untuk type of cover lain di luar tarif OJK.
- **Slip dengan type of cover tanpa tarif OJK:**
  - Rate casco, perluasan, TPL, dan PA tidak punya batas OJK, jadi tidak
    pernah butuh alasan rate.
  - Batas yang pernah tersimpan di baris rate ikut dibuang, misalnya saat type
    of cover diganti dari PSKBI ke Heavy Equipment.
  - Brokerage tidak dibatasi 25%, saat simpan maupun saat release.
  - Panel Referensi Tarif OJK, kategori, dan wilayah OJK per unit tidak
    tampil.
  - Bagian Rate & Premium menampilkan catatan bahwa type of cover ini tidak
    memakai tarif OJK.
  - Placeholder Domisili Kendaraan tidak lagi menyebut wilayah tarif OJK.
- **Ganti type of cover di form slip:** batas OJK langsung ikut. Contohnya,
  slip Heavy Equipment yang diganti ke PSKBI langsung kembali kena batas casco
  dan batas brokerage 25%.
- **Server:**
  - Saat simpan, batas brokerage dicek dengan flag dari Master Data, bukan flag
    kiriman browser.
  - Saat release, slip dibaca ulang dari database beserta flag type of
    cover-nya.
- **Form polis:** peringatan brokerage di atas batas biaya akuisisi OJK tidak
  muncul untuk type of cover tanpa tarif OJK.
- **Seed database baru:** 0203 dibuat dengan tarif OJK mati.

## File utama

- `prisma/schema.prisma` dan migrasi
  `20261109150000_heavy_equipment_tanpa_tarif_ojk`: kolom
  `cover_types.ojk_tariff`.
- `lib/calc.ts`: `usesOjkTariff`, `withoutOjkBounds`, dan `brokerageCapFor`
  dengan flag.
- `components/underwriting/slip-model.ts`: `rateLinesWithBounds`,
  `releaseIssues`, dan `slipFromSppa`.
- `lib/server/tariffs.ts`: `attachSlipRateBounds` dan
  `validatePlacingSlipForRelease`.
- `lib/server/placing-slips.ts`: flag dibaca dari type of cover slip, plus
  `coverUsesOjkTariff` untuk aksi simpan.
- `components/underwriting/slip-vehicles.tsx`: catatan dan panel OJK.
- `components/master-data/cob-cover-tab.tsx`: switch Pakai tarif OJK.

## Dampak

- **Database:**
  - Kolom baru `cover_types.ojk_tariff`, boolean, bawaan `true`.
  - Migrasi mengubah 0203 menjadi `false`.
  - Tidak ada kolom baru di slip. Flag dibaca dari type of cover setiap kali
    slip dimuat, jadi perubahan di Master Data langsung berlaku untuk slip yang
    belum di-release.
- **Slip Heavy Equipment yang sudah ada:**
  - Batas OJK tersimpan diabaikan saat dimuat dan dikosongkan saat disimpan
    berikutnya.
  - Alasan rate di luar batas juga terhapus saat disimpan, karena tidak ada
    lagi rate yang di luar batas.
  - Database lokal tidak punya slip maupun polis Heavy Equipment.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan otomatis saat build, di Vercel dan VPS.

## Verifikasi

- `npx tsc --noEmit`: lolos.
- eslint semua file yang berubah: lolos.
- `npx tsx --test tests/*.test.ts`: 122 lolos, termasuk 4 test baru di
  `tests/ojk-tariff-cover.test.ts`.
- `npm run build`: lolos.
- `prisma migrate diff` database lokal terhadap skema: kolom baru sesuai.
  Satu-satunya selisih adalah `users_role_id_fkey`, yang juga ada di `main`.
- **Uji browser lokal** dengan sesi login sementara (Playwright):
  - **Slip baru Motor Vehicle, Heavy Equipment:**
    - unit Excavator TSI IDR 1,5 M, rate casco 0,05%, brokerage 30%;
    - catatan tanpa tarif OJK tampil;
    - panel Referensi Tarif OJK tidak tampil;
    - kolom Batas OJK berisi "—", tanpa rate butuh alasan;
    - draft tersimpan dengan brokerage 30%;
    - setelah reload, catatan dan brokerage tetap;
    - tidak ada batas OJK tersimpan di baris rate.
  - **Draft yang sama diganti ke PSKBI:**
    - panel OJK tampil;
    - casco 0,05% di bawah batas 1,05–1,16% dan butuh alasan;
    - simpan ditolak server dengan pesan "Brokerage 30% melebihi batas OJK
      untuk Motor Vehicle: maksimal 25%.".
  - **Master Data:**
    - switch Pakai tarif OJK mati untuk 0203 dan menyala untuk 0201;
    - switch tidak tampil untuk Marine Cargo 0311.
- **Fungsi server** (`coverUsesOjkTariff` dan `validatePlacingSlipForRelease`):
  - Heavy Equipment `false`, PSKBI dan Property All Risk `true`;
  - draft Heavy Equipment tanpa isu OJK saat release;
  - slip yang sama dengan tarif OJK kena batas brokerage dan butuh satu alasan
    rate.
- Draft uji dan sesi login sementara sudah dihapus.

## Catatan untuk yang melanjutkan

- Asumsi batas brokerage ikut tidak berlaku perlu dikonfirmasi ke Harry. Kalau
  ternyata 25% tetap berlaku, cukup `brokerageCapFor` yang diubah supaya
  mengabaikan flag.
- Master merek dan tipe kendaraan baru berisi mobil. Unit alat berat bisa
  diisi tanpa merek dan tipe lewat Model / Jenis. LCH juga bisa menambah merek
  seperti Komatsu atau Caterpillar di Master Data > Kendaraan.
- Kolom Batas OJK di tabel rate tetap tampil untuk slip tanpa tarif OJK,
  dengan isi "—".
- Aturan Wajib nomor 4 (graphify) belum dijalankan karena graphify belum
  terpasang di mesin ini.
