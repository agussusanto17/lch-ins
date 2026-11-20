# Label detail dan judul klausul dari contoh slip 20 November

- **Tanggal:** 2026-11-20
- **Branch:** `feat/contoh-slip-20-nov`
- **PR:** #<nomor>
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Harry mengirim contoh slip yang sebelumnya belum ada (20 November 2026). Filenya disimpan di `documents/contoh slip`:

- **Contoh baru:**
  - Billboard All Risks CV. Prima and Clear;
  - Equipment All Risks PT Habco Primatama GEAR (1) beserta GI Schedule (Excel);
  - indikasi Civil Engineering Completed Risks PT Soechi Lines / Multi Ocean Shipyard;
  - proposal asuransi kesehatan karyawan PT Salam Pacific Indonesia Lines;
  - Zurich Travel Insurance Soegianto & Family;
  - Quotation Slip D&O PT. Indo Bharat Rayon.
- **Duplikat:** dua file sama persis dengan contoh lama (container Salam Pacific dan CAR SPIL).

Dinilai terhadap fitur yang sudah live, celahnya ada di master data:

- **Billboard (TOC 1206 Neon Sign):** tidak ada satu pun klausul yang tampil di picker. Klausul Miscellaneous yang mirip terikat ke TOC lain (Cash In Safe, Movable All Risk).
- **D&O (0913):** 32 dari 34 judul klausul belum ada.
- **CECR (0808):** 3 judul klausul belum ada.
- **Label Detail tambahan bawaan:** D&O, CECR, Travel, dan Health baru punya "Existing Policy No.".

## Yang berubah

- **Label Detail tambahan bawaan per type of cover:**
  - 0913 Directors and Officer Liability: Territory & Jurisdiction, Retroactive Date, Prior and Pending Date;
  - 0808 Civil Engineering Completed Risk: Business, Basis of Indemnity, Limit of Liability (Any One Occurrence);
  - 1208 Travel Insurance: Coverage Area, Benefit Plan, Type of Insured, Policy Type;
  - 1301 Health Insurance: Benefit Plan, Number of Participants.
- **45 judul klausul tanpa wording.** Wording dilengkapi LCH di Master Clauses, sama seperti impor 9 dan 12 November.
  - Miscellaneous, khusus TOC 1206: 10 judul dari slip Billboard.
  - Liability: 32 judul dari slip D&O. Sebanyak 24 khusus 0913. Delapan sisanya umum untuk semua type of cover Liability, misalnya Arbitration Clause, Currency Clause, Several Liability Notice (LSW 1001), dan Sanction Exclusion Clause.
  - Engineering, umum: 3 judul dari indikasi CECR, yaitu Appraisement Clause, Burglary and Theft Cover Endorsement, dan Deferred Premium Clause. Delapan judul CECR lain sudah ada dengan nama mirip; batas per slip cukup ditulis di judul klausul slip.
- Label hanya ditambahkan bila belum ada. Judul klausul dilewati bila sudah ada di COB dan type of cover yang sama, jadi isian LCH di Master Data tetap.

## File utama

- Migrasi `20261120100000_label_detail_contoh_20_nov` dan `20261120100100_judul_klausul_contoh_20_nov`.
- `prisma/seed-data/judul-klausul-contoh-slip.csv`: 45 baris yang sama untuk database baru.
- `tests/clause-titles-import.test.ts`: migrasi baru ikut dicocokkan dengan CSV.

## Dampak

- **Database:** dua migrasi data. Label ditambahkan di `cover_types.detail_labels`, dan 45 baris baru masuk ke `clauses`. Tidak ada perubahan skema dan slip yang sudah ada tidak berubah.
- **Env:** tidak ada.
- **Deploy:** migrasi berjalan saat build seperti biasa.

## Verifikasi

- `npx tsx --test tests/*.test.ts`: lolos, termasuk test CSV dan migrasi judul klausul.
- `npx tsc --noEmit` dan `npm run build`: lolos.
- **Migrasi di DB lokal:** label empat type of cover bertambah dan 45 judul klausul masuk.
- **Klausul di picker** (lewat `clauseFitsSlip`, aturan yang dipakai picker slip):
  - Miscellaneous / Neon Sign Insurance: 10 klausul, sebelumnya 0;
  - Directors and Officer Liability: 32 klausul baru tampil;
  - Public Liability: 8 klausul umum ikut tampil;
  - Civil Engineering Completed Risk: 3 klausul baru tampil.

## Catatan untuk yang melanjutkan

- **Penilaian per contoh** ada di `documents/Cakupan contoh slip LCH - 20 Nov 2026.xlsx` (no. 30 sampai 35). TOC yang punya contoh slip sekarang 29 dari 48, dan semua COB sudah punya contoh.
- **Health (no. 33)** masih dengan catatan. Premi per peserta × jumlah per plan dan kategori, dengan loading, belum ada di form. Sementara memakai objek premi Flat per manfaat dan proposal sebagai lampiran.
- **Singkatan TOC 1206 dan 1301** masih kosong di Master Data, jadi nomor slip dan klaim untuk TOC itu tanpa kode cover. LCH bisa mengisinya sendiri.
- **Wording D&O** (Director & Officer Liability Policy (Indonesia)) belum ada di Master Data Wording Form.
- **graphify** belum terpasang di mesin ini, jadi graph tidak diperbarui.
