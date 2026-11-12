# Endorsement dan cancellation slip di menu Placement

- **Tanggal:** 2026-11-12
- **Branch:** `feat/endorsement-slip-placement`
- **PR:** [#221](https://github.com/agussusanto17/lch-ins/pull/221)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Usulan Harry, diteruskan Agus pada 11 November 2026: endorsement dan cancellation dibuat dari menu Placement sebagai jenis slip (Placing Slip, Endorsement Slip, Cancellation Slip). Inputnya memakai form slip karena perlu rate dan isian lain. Cetakannya mengikuti format yang sudah ada di Policy Database (#215, #220). Endorsement di Policy Database tetap ada untuk mencatat dan mengunggah endorsement yang sudah terbit dari asuransi.

Jawaban Harry atas pertanyaan lanjutan:

1. **Nomor:** pola seperti placing slip, misalnya `008/LCH-PLCMT/ES-MV/XI/2026` untuk endorsement dan `CS` untuk cancellation. Urutannya menyambung dengan placing slip, supaya semua slip tercatat dalam satu urutan.
2. **Tahapan:** tidak dijawab. Asumsi yang dipakai: Draft → terbit (nomor ES/CS) → Closed (dikonfirmasi asuransi) → tercatat di Policy Database.
3. **Cetakan premi:** memuat perhitungan sebelum dan sesudah. Kenaikan nilai atau penambahan berarti premi tambahan; cancellation atau penurunan nilai berarti refund premi. Semuanya prorata.
4. **Prorata:** cancellation dan endorsement bisa prorata, bisa juga per awal polis.

Analisa sebelumnya juga menunjukkan bahwa form endorsement di Policy Database meminta selisih UP. User berpikir dalam "kondisi baru", sehingga UP penuh ikut terbaca sebagai tambahan UP. Di slip, user mengisi kondisi baru dan sistem menghitung selisihnya.

## Yang berubah

- **Jenis slip** (`placing_slips.kind`: Placing, Endorsement, Cancellation) beserta kolom baru:
  - `parent_policy_id`: polis yang diubah;
  - `base_slip_id`: slip asal;
  - `effective_date` dan `change_description`;
  - `before_calc`: baris premi slip asal, disimpan saat slip dibuat.
- **Membuat ES/CS.** Daftar Placement, pada slip yang sudah Closed: menu **Buat endorsement slip** atau **Buat cancellation slip**.
  - Slip baru adalah salinan slip asal, jadi user tinggal mengubah yang berubah, misalnya nilai objek, rate, jaminan, atau objek.
  - Kondisi sebelum perubahan selalu diambil dari endorsement terakhir yang sudah Closed untuk polis itu, dari baris slip mana pun user memulai.
  - Pembuatan ditolak kalau masih ada ES/CS lain untuk polis yang sama yang belum ditutup, atau kalau polisnya sudah dibatalkan.
  - Pembuatan juga ditolak kalau polis dari slip itu belum tercatat di Policy Database.
- **Form slip mode endorsement:**
  - Judul toolbar menjadi Endorsement Slip atau Cancellation Slip.
  - Bagian **Endorsement / Cancellation** ada di paling atas, berisi:
    - polis induk dan slip asal;
    - **Tanggal Efektif**, dengan tombol **Per awal polis**;
    - **Uraian Perubahan**;
    - ringkasan nilai pertanggungan sebelum → sesudah, prorata, perhitungan sebelum yang dikembalikan, perhitungan sesudah yang ditagihkan, premi tambahan atau refund premi, diskon, admin cost, stamp duty, dan total.
  - Tombol mengikuti status:
    - **Draft:** **Terbitkan Endorsement/Cancellation Slip**, dengan pratinjau nomor ES/CS;
    - **Terbit:** **Tutup, Dikonfirmasi Asuransi**;
    - **Lihat Dokumen** membuka cetakan slip.
  - ES/CS tidak punya quotation, closing instruction, atau cover note.
- **Perhitungan premi** (`lib/endorsement-calc.ts`):
  - Baris premi diambil dengan aturan yang sama seperti dokumen slip: nilai × rate = premi setahun. Untuk itu ditambahkan `rateLineBasis` di `lib/calc.ts`.
  - Prorata = hari dari tanggal efektif s/d tanggal berakhir / 365. Tanggal efektif sama dengan atau sebelum tanggal mulai polis berarti per awal polis, premi penuh.
  - Selisih premi = jumlah sesudah (prorata) − jumlah sebelum (prorata). Diskon slip berlaku atas selisih itu.
  - Total = selisih − diskon + admin cost + stamp duty.
  - Cancellation mengembalikan semua baris sebelum.
  - Contoh EDM 01, efektif per awal periode dengan biaya endorsement 10.000, menghasilkan total (387.650), sama dengan dokumen asuransi.
- **Nomor ES/CS** terbit dari urutan nomor placing slip (counter PS), dengan PS diganti ES atau CS (`derivedDocNumber`).
- **Cetak `/placement/endorsement/[id]`:**
  - Judul ENDORSEMENT SLIP atau CANCELLATION SLIP, dengan nomor ES/CS (atau DRAFT).
  - Data polis berlabel dua bahasa seperti EDM 01; Lampiran No. adalah urutan endorsement polis induk.
  - Kalimat perubahan berisi Uraian Perubahan.
  - Tabel premi: perhitungan sebelumnya (dikembalikan) dan perhitungan sesudah (ditagihkan), masing-masing nilai × rate dan prorata. Lalu Premi Tambahan atau Refund Premi, diskon, biaya administrasi, bea meterai, dan total.
  - Klausul, SECURITY, dan tanda tangan LCH.
- **Saat ES/CS Closed**, perubahan tercatat otomatis di Policy Database (`recordEndorsementFromSlip`) sebagai Endorsement atau Cancellation polis induk:
  - selisih UP dan premi dari perhitungan slip;
  - admin cost dan stamp duty;
  - Uraian Perubahan sebagai remarks;
  - nomor sementara = nomor ES/CS, nanti diganti nomor endorsement dari asuransi saat diunggah.

  Notifikasi dan keterangan di cetakan menyebut nomor record-nya.
- **Policy Database:**
  - Admin cost dan stamp duty sekarang juga tersimpan untuk pembatalan.
  - Pilihan "polis dari slip" hanya berisi placing slip.
  - Label pengembalian premi di cetakan menjadi **Refund Premi**, istilah Harry.
- **Daftar Placement:** baris ES/CS menampilkan jenisnya dan polis induknya. Menu "Lihat endorsement/cancellation slip" menggantikan menu dokumen placing slip.

## File utama

- `prisma/schema.prisma`, `prisma/migrations/20261112090000_endorsement_slip/migration.sql`
- `lib/endorsement-calc.ts` (baru), `lib/calc.ts`, `lib/data/types.ts`, `lib/endorsement-slip.ts`
- `lib/server/placing-slips.ts`: `createEndorsementSlip`, `copySlipInput`, nomor ES/CS, simpan tanggal efektif.
- `lib/server/auto-policies.ts`: `recordEndorsementFromSlip`.
- `lib/server/endorsement-slip.ts`: `getEndorsementSlipPrint`.
- `lib/server/policies.ts`
- `app/(app)/placement/actions.ts`: `createEndorsementSlipAction`, pencatatan saat Closed, pratinjau nomor.
- `components/underwriting/endorsement-section.tsx` (baru), `components/underwriting/placing-slip-form.tsx`, `components/underwriting/slip-table.tsx`, `components/underwriting/slip-model.ts`
- `components/documents/endorsement-slip-document.tsx` (baru), `components/documents/endorsement-document.tsx`
- `app/(print)/placement/endorsement/[id]/page.tsx` (baru), `app/(app)/policies/page.tsx`
- `tests/endorsement-calc.test.ts` (baru, 7 tes)

## Dampak

- **Database:** migrasi `20261112090000_endorsement_slip` menambah enum `SlipKind` dan enam kolom di `placing_slips`, dengan foreign key ke `policies` dan ke `placing_slips` sendiri (ON DELETE SET NULL). Slip lama otomatis bertipe Placing.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build.

## Verifikasi

- `npx tsc --noEmit`, `npx eslint app components lib tests next.config.ts --quiet`, `npx tsx --test tests/*.test.ts` (194 tes, termasuk 7 tes baru), dan `npm run build`: lolos.
- **Uji browser ujung ke ujung** (Playwright dan Chrome, sesi sementara), dengan slip `016/LCH-PLCMT/PS-MC/XI/2026` (Marine Cargo, 500 jt × 0,1%):
  1. Polis induk dicatat dari CI 016.
  2. **Buat endorsement slip** dari menu baris membuka form Endorsement Slip dengan keterangan polis induk dan slip asal. Tanggal efektif diisi Per awal polis dan uraian diisi. Nilai objek diubah menjadi 600 jt. Ringkasannya: 500 jt → 600 jt, dikembalikan −500.000, ditagihkan 600.000, premi tambahan 100.000.
  3. **Terbitkan:** dialog menampilkan perkiraan `018/LCH-PLCMT/ES-MC/XI/2026`, dan nomor itu terbit melanjutkan counter PS (17 → 18).
  4. **Cetakan ES** memuat semua bagian: (IDR 500.000,00), IDR 600.000,00, Premi Tambahan IDR 100.000,00, dan uraian.
  5. **Tutup:** keterangan "Tercatat di Policy Database sebagai Endorsement 018/…" tampil. Record-nya bertipe endorsement, UP +100 jt, premi 100.000, efektif 1 Desember 2026, seq 1, induk 016.
  6. **Daftar Placement** menampilkan "Endorsement · polis 016/LCH-PLCMT/CI-MC/XI/2026".
  7. **Buat cancellation slip dari baris 016 asli:**
     - slip asalnya otomatis ES 018;
     - efektif 8 Desember, nomor `019/LCH-PLCMT/CS-MC/XI/2026`;
     - cetakan CANCELLATION SLIP: Lampiran 02, nilai 600 jt, 600 jt × 0,1% × 7/365 = (IDR 11.506,85), Refund Premi, tanpa perhitungan sesudah;
     - setelah ditutup, tercatat sebagai cancellation dengan UP −600 jt dan premi −11.506,85.
  8. Endorsement baru untuk polis yang sudah dibatalkan ditolak dengan pesan "Polis ini sudah dibatalkan (019/…)".
  9. Tidak ada error di console. Semua data uji (polis, slip, audit) dihapus, dan counter PS dikembalikan ke 17.
- **Regresi Policy Database:**
  - cetak endorsement `SIT/PA/2026/001-END1` tetap benar (ENDORSEMENT SLIP, Premi Tambahan IDR 113.013,70);
  - form endorsement manual tetap menghitung premi prorata (14 hari, 481.273,97).

## Catatan untuk yang melanjutkan

- **Asumsi tahapan:** ES/CS tidak punya quotation atau closing instruction (pertanyaan no. 2 belum dijawab Harry). Kalau LCH butuh tahap itu, tombol di form perlu ditambah.
- **Prorata selalu dibagi 365**, sesuai permintaan, termasuk untuk polis berperiode pendek seperti cargo per pengiriman. Pakai Per awal polis untuk premi penuh.
- **Slip PAR + EQVET:** endorsement mencatat satu record untuk polis pertama (PAR). Pembagian per bagian belum ditangani.
- **Revisi ES/CS setelah Closed** tidak mengubah record di Policy Database.
- **Polis tanpa placing slip** (input manual) belum bisa dibuatkan ES/CS. Endorsement-nya tetap lewat form Policy Database.
- **Perubahan peserta PA grup** lewat ES belum ditangani. Untuk itu tetap pakai endorsement di Policy Database.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
