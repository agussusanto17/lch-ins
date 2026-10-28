# Auto-matching Tarif KBM OJK, Perluasan Jaminan, dan Guard Rilis Slip

- **Tanggal:** 2026-10-27
- **Branch:** `feat/ojk-motor-tariff-and-release-guard`
- **PR:** #43
- **Dikerjakan oleh:** ZoD3V dengan Claude Code

## Latar belakang

Berdasarkan tinjauan roadmap Minggu 3 (*Placing slip, rate & premium, klausula, tarif OJK*), dokumen operasional LCH di Google Drive (`Daftar Konfirmasi LCH Team` tab *Pertanyaan Teknis*), serta **SE OJK No. 6/SEOJK.05/2017 Lampiran IV**:
1. Modul perhitungan tarif kendaraan bermotor (`getMotorRateBounds`) sebelumnya masih berupa stub (`return null`). Underwriter belum memperoleh panduan batas tarif resmi OJK otomatis saat menyusun slip Motor Vehicle.
2. Batas tarif resmi perluasan jaminan KBM (Banjir, Gempa bumi/Tsunami, SRCC, Terorisme, TJH Pihak Ketiga/TPL, dan Kecelakaan Diri Pengemudi & Penumpang) belum terhubung secara otomatis ke kalkulator rate lines slip.
3. Tindakan rilis slip di server (`releasePlacingSlipAction`) belum menegakkan validasi komprehensif `validatePlacingSlipForRelease()`, sehingga pengamanan rate out-of-bounds tanpa justifikasi, pelanggaran batas maksimal brokerage (15% Properti, 25% KBM), dan aturan scaling BI rate belum terjaga secara ketat di sisi server.
4. Perhitungan total sum insured (`totalSumInsured`) memiliki anomali di mana slip non-Properti (seperti KBM) yang diinisialisasi dengan array kosong `sumInsuredSection1` gagal membaca nilai objek pertanggungan dari `interestItems`.

## Yang berubah

- **Engine Auto-Matching Tarif KBM OJK (`lib/data/ojk-motor.ts` & `lib/server/tariffs.ts`)**:
  - Deteksi wilayah tarif OJK (Wilayah 1, Wilayah 2, Wilayah 3) secara otomatis dari nomor plat polisi (regex kode wilayah Indonesia: B, D, BK, AB, dll.) atau teks lokasi risiko.
  - Klasifikasi kategori kendaraan Kategori 1 s/d 8 (Kategori 1–5 berdasarkan tier TSI uang pertanggungan, Kategori 6 Truk/Pick Up, Kategori 7 Bus, Kategori 8 Roda Dua) secara cerdas dari deskripsi objek pertanggungan dan TSI.
  - Pencocokan batas tarif batas bawah dan atas OJK (`min`, `max`, `boundSource`) untuk pertanggungan Comprehensive dan Total Loss Only (TLO).
- **Auto-Matching Perluasan Jaminan KBM**:
  - Penambahan lookup bounds OJK untuk perluasan: Banjir/FWTWD (Comp 0.075–0.125%, TLO 0.05–0.1%), Gempa/EQVET (Comp 0.075–0.135%, TLO 0.05–0.11%), Huru-hara/SRCC (0.05% Comp, 0.035% TLO), Terorisme/TS (0.05% Comp, 0.035% TLO), TJH Pihak Ketiga/TPL (0.25% - 1.0%), serta PA Pengemudi (0.5%) dan Penumpang (0.1%).
  - Integrasi bounds otomatis pada form dan model slip client (`rateLinesWithBounds` di `slip-model.ts`) serta server (`attachSlipRateBounds` di `tariffs.ts`).
- **Penjagaan Rilis Slip di Server (`releasePlacingSlipAction`)**:
  - Mengintegrasikan `validatePlacingSlipForRelease` sebelum nomor slip resmi diterbitkan.
  - Menolak rilis bila ada rate di luar batas OJK tanpa catatan exception, brokerage melebihi batas OJK (15% Property, 25% Motor), rate BI berada di bawah FLEXAS, atau kelengkapan data dasar belum terpenuhi.
- **Perbaikan Perhitungan TSI Non-Property (`lib/calc.ts`)**:
  - Mengoreksi `totalSumInsured(slip)` agar lini usaha Property menggunakan Sections 1 & 2, sedangkan lini usaha lain (Motor Vehicle, Cargo, dll.) secara konsisten menggunakan `interestItems`.

## File utama

- `lib/data/ojk-motor.ts`: regex plat nomor, deteksi kategori kendaraan, tier TSI, dan lookup bounds tarif pokok & perluasan KBM.
- `lib/server/tariffs.ts`: engine server tarif KBM, penambahan `attachSlipRateBounds`, dan penyempurnaan `validatePlacingSlipForRelease`.
- `components/underwriting/slip-model.ts`: penyambungan auto-bounds pada `rateLinesWithBounds` dan penegakan OOB/brokerage di `releaseIssues`.
- `app/(app)/underwriting/actions.ts`: integrasi `validatePlacingSlipForRelease` pada `releasePlacingSlipAction`.
- `lib/calc.ts`: perbaikan penentuan basis TSI antara Property dan lini usaha lainnya.

## Dampak

- **Database:** tidak ada perubahan skema (menggunakan kolom jsonb dan relasi yang sudah ada).
- **Env:** tidak ada.
- **Deploy:** tidak ada langkah khusus.

## Verifikasi

- `npx tsc --noEmit`: 0 error (lolos).
- `npm run build`: build Turbopack berhasil tanpa error.
- Pengujian Unit Test Script:
  - Pencocokan plat B (Wilayah 2), BK (Wilayah 1), AB (Wilayah 3) terverifikasi.
  - Kategori kendaraan non-truk (Kategori 1–5), Truk (Kategori 6), Bus (Kategori 7), dan Roda Dua (Kategori 8) terverifikasi.
  - Perluasan Banjir, Gempa, SRCC, TS, TPL, dan PA terverifikasi sesuai SEOJK Lampiran IV.
  - Pengujian server guard: slip valid lolos, slip dengan rate OOB tanpa justifikasi ditolak, slip dengan brokerage > 25% ditolak.
- Pengujian E2E Browser (`ego-browser`):
  - Memilih COB "Motor Vehicle" langsung menampilkan bounds OJK.
  - Mengisi TSI Rp 250.000.000 memperbarui bounds Casco ke tier Kategori 3 Wilayah 2 (2,080 – 2,290).
  - Mengubah deskripsi menjadi plat BK (Medan) otomatis memperbarui bounds ke Wilayah 1 (2,180 – 2,400).
  - Menambahkan kata "Truk Box" otomatis mengklasifikasikan ke Kategori 6 (2,420 – 2,670).
  - Memasukkan rate 1.5% langsung memicu indikator "Di bawah batas OJK · alasan wajib diisi" dengan tombol "Isi alasan".
