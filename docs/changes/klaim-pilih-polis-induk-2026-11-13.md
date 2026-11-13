# Pilihan polis klaim digabung ke polis induk

- **Tanggal:** 2026-11-13
- **Branch:** `feat/klaim-pilih-polis-induk`
- **PR:** [#251](https://github.com/agussusanto17/lch-ins/pull/251)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

- **Pertanyaan Agus, 13 November 2026:** di form Catat Klaim Baru, polis dan endorsement-nya tampil sebagai dua pilihan terpisah. Petugas jadi bingung klaim dicatat ke yang mana, apalagi kalau endorsement-nya belum terbit dari asuransi. Agus minta keduanya digabung.
- Endorsement dan pembatalan hanya perubahan atas polis, jadi klaim dicatat ke polisnya. Berkas endorsement sudah tampil di panel info polis sejak #250.
- **Celah yang ikut ditutup:** sebelumnya petugas bisa memilih record endorsement untuk melihat deductible dari endorsement slip. Setelah digabung, panel info polis harus memilih sendiri deductible yang berlaku pada tanggal kejadian. Kalau tidak, deductible endorsement tidak terlihat lagi.

## Yang berubah

- **Pilihan Polis Asuransi di form klaim:** satu baris per polis. Endorsement dan pembatalan tidak tampil sendiri. Polis yang punya perubahan diberi keterangan, misalnya "018/LCH-PLCMT/CI-MV/XI/2026 — PT SIT Korporasi Uji (1 endorsement, dibatalkan)". Polis yang sudah dibatalkan tetap bisa dipilih untuk kejadian sebelum pembatalan.
- **Panel info polis:**
  - status premi dan deductible diambil dari polis induk;
  - deductible mengikuti endorsement terakhir yang efektif pada atau sebelum tanggal kejadian. Selama tanggal kejadian kosong, acuannya hari ini. Bila polis punya endorsement, sumbernya disebut, misalnya "Sesuai Endorsement ke-1 (efektif 15 Nov 2026), yang berlaku pada tanggal kejadian." atau "Sesuai polis, yang berlaku pada tanggal kejadian. Endorsement ke-1 baru efektif 15 Nov 2026.";
  - peringatan bila tanggal kejadian jatuh pada atau sesudah tanggal efektif pembatalan polis. Klaim tetap bisa disimpan;
  - tanda Dipilih di Berkas polis hanya muncul untuk klaim lama yang tercatat ke endorsement atau pembatalan. Polis induk tidak ditandai lagi.
- **Server:** klaim baru selalu dicatat ke polis induk. Form yang dibuka sebelum deploy dan masih mengirim id endorsement ikut diarahkan ke polis induknya.
- **Keluarga polis** ditelusuri bertingkat, termasuk endorsement atas endorsement dari Policy Database. Renewal tidak ikut karena polisnya berdiri sendiri.
- `lib/claim-policy-files.ts`: `policyFamilies`, `claimPolicyChoices`, `claimPolicyLabel`, dan `deductiblesOn`.
- `lib/server/claims.ts`: `ClaimFormOptions.policies` membawa `rootId`, `endorsements`, `cancelled`; `ClaimPolicyInfo` mendapat `deductibleChanges` dan `cancellation`; `createClaim` memakai `rosterPolicyId`.

## Dampak

- **Database:** tidak ada migrasi. Klaim lama yang sudah tercatat ke endorsement tidak dipindah. Form edit-nya tetap menampilkan endorsement itu, dan panelnya memakai data polis induk.
- **Env:** tidak ada.
- **Deploy:** biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint file yang berubah, `npx tsx --test tests/*.test.ts` (4 tes baru, 1 tes diperbarui), dan `npm run build`: lolos, kecuali 3 tes margin cetak 18 mm di `tests/documents.test.ts` yang sudah gagal di main sejak #236.
- **Uji browser lokal** (build `next start`, sesi sementara role Klaim, DB lokal). Deductible endorsement slip 019 diubah sementara menjadi IDR 500.000 supaya bedanya terlihat, lalu dikembalikan:
  - pencarian "LCH-PLCMT" menampilkan 018 satu baris dengan keterangan "(1 endorsement, dibatalkan)". ES 019 dan CS 020 tidak muncul sendiri;
  - tanggal kejadian kosong (13 Nov): deductible polis IDR 300.000, dengan catatan Endorsement ke-1 baru efektif 15 Nov 2026;
  - tanggal kejadian 16 Nov: deductible Endorsement ke-1, IDR 500.000;
  - tanggal kejadian 21 Nov: peringatan pembatalan efektif 20 Nov 2026 (020/LCH-PLCMT/CS-MV/XI/2026);
  - `createClaim` dengan id ES 019 tercatat ke polis 018;
  - klaim yang sementara diarahkan ke ES 019: form edit menampilkan 019 (terkunci), Berkas polis menandai Endorsement ke-1 Dipilih;
  - tidak ada error console maupun server. Klaim uji, audit log-nya, dan nomor urut klaim lokal sudah dikembalikan.

## Catatan untuk yang melanjutkan

- Deductible endorsement diambil dari endorsement slip yang tercatat di Policy Database (dibuat dari Placement). Endorsement yang diinput manual di Policy Database tidak punya slip, jadi deductible-nya tidak ikut.
- Detail klaim belum menampilkan peringatan pembatalan. Kalau perlu, data `cancellation` sudah tersedia di `ClaimPolicyInfo`.
- Tanggal kejadian di luar periode polis belum diperingatkan.
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
