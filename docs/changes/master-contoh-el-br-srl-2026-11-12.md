# Label detail dan judul klausul dari contoh slip EL, Builder's Risk, dan SRL

- **Tanggal:** 2026-11-12
- **Branch:** `feat/master-contoh-el-br-srl`
- **PR:** (diisi setelah PR dibuka)
- **Dikerjakan oleh:** Agus Susanto dengan Claude Code

## Latar belakang

Agus menyimpan tiga contoh slip baru di `documents/contoh slip/` pada 12 November 2026. Ketiganya melanjutkan penomoran 26 contoh dari analisa 6 November:

| No. | Contoh | Type of cover di master |
|---|---|---|
| 27 | Placing Slip Employers Liability PT. Permata Lintas Abadi 2026 (format LCH, nomor PS-ELWC) | 0902 Employer's Liability (EL) |
| 28 | Signed Slip Builder's Risks PT. Multi Ocean Shipyard, hull H7034 dan H7035 (slip pasar 2022) | 0402 Marine Builder Risk (HBR) |
| 29 | Signed Slip Shiprepairers Legal Liability PT Dok Pantai Lamongan 2022 (slip pasar) | 0405 Ship Repairers Legal Liability (SRLL) |

Ketiga type of cover sudah ada di master, dan isi slipnya bisa dibuat dengan fitur yang ada:

- **Limit:** Limit of Liability sebagai objek.
- **Premi:** rate atau premi flat per objek.
- **Kapal dan periode:** detail kapal di Detail Tambahan, dan teks periode per slip, misalnya periode pembangunan BR "6 bulan atau sampai delivery, mana yang lebih dulu".
- **Klausul:** kelompok klausul bertajuk (Main, General, dan Additional Conditions).

Yang kurang ada dua:

- Label Detail Tambahan bawaan masih hanya Existing Policy No.
- Belum ada judul klausul khas Builder's Risks dan SRL, serta beberapa klausul umum Hull dan EL.

## Yang berubah

- **Migrasi `20261112190000_label_detail_contoh_el_br_srl`** menambah label Detail Tambahan bawaan di akhir daftar. Label yang sudah ada tidak didobelkan, jadi perubahan LCH di Master Data tetap. Slip yang sudah ada tidak berubah.
  - 0902 Employer's Liability dan 0903 Workmen's Compensation: Insured Business, Territorial Limit, Jurisdiction. 0903 ikut karena contoh 27 satu slip EL / Workmen Compensation.
  - 0402 Marine Builder Risk: Vessels, Contract Value, Location of Yard, Warranties.
  - 0405 Ship Repairers Legal Liability: Vessels, Location of Yard, Estimated Annual Turnover, Adjustable Rate, Warranties.
- **Migrasi `20261112190100_judul_klausul_contoh_el_br_srl`** menambah 27 judul klausul tanpa wording, seperti impor 9 November (#186). Sesuai jawaban Harry atas pertanyaan 4, wording-nya dilengkapi LCH di Master Clauses.
  - **Hull, khusus 0402 (5):**
    - Institute Clauses for Builders' Risks (1/6/88);
    - Institute War CL 349 dan Institute Strikes CL 350 Builders' Risks;
    - CL 352 (faulty design & P&I);
    - Full Value Clause.
  - **Hull, khusus 0405 (6):**
    - Shiprepairers Liability Clauses LSW 169/A (1/90);
    - LSW 170, 171A, 172, dan LSW 180;
    - Claims Co-operation Clause.
  - **Hull, semua type of cover Hull (12):**
    - Waiver of Subrogation in favour of Principal…;
    - Law and Jurisdiction Clause;
    - Survey, Diver, Class Survey Fees Clause;
    - LSW1001 Several Liability Notice;
    - Contracts (Rights of Third Parties) Act 1999 (UK)…;
    - Communicable Disease Exclusion LMA 5397 dan JL2020-013;
    - Claims Service Level Agreement;
    - Full Follow Clause;
    - Seepage and Pollution Buy Back (72 Hours Clause);
    - Principal Clause;
    - Cross Liability Clause.
  - **EL / Liability (4):**
    - Cross Liability Clause;
    - Defence Cost Inclusive within the Limit of Liability;
    - Memorandum on Dispute Clause (C);
    - definisi Bodily Injury (khusus 0902).
  - **Tidak ditambahkan,** karena sudah ada dengan judul atau kata yang sama:
    - Special Cancellation;
    - Absolute Asbestos;
    - Brokers Payment of Premium and Cancellation;
    - Premium Payment;
    - Cut Through;
    - CL 370;
    - Marine Cyber LMA 5403;
    - Sanction Limitation and Exclusion;
    - Deferred Premium (Warranty) Clause;
    - Vandalism, Sabotage and Malicious Damage;
    - Cancellation (30 days), Loss Notification (30 days), Nominated Loss Adjuster, dan Waiver of Subrogation untuk EL.
- **`prisma/seed-data/judul-klausul-contoh-slip.csv`** mendapat 27 baris yang sama (contoh 27, 28, dan 29), jadi seed tetap sama dengan migrasi.
- **`tests/clause-titles-import.test.ts`** membandingkan CSV dengan kedua migrasi judul klausul.

## File utama

- `prisma/migrations/20261112190000_label_detail_contoh_el_br_srl/migration.sql`
- `prisma/migrations/20261112190100_judul_klausul_contoh_el_br_srl/migration.sql`
- `prisma/seed-data/judul-klausul-contoh-slip.csv`
- `tests/clause-titles-import.test.ts`

## Dampak

- **Database:** dua migrasi data, tanpa perubahan skema.
- **Env:** tidak ada.
- **Deploy:** migrasi jalan saat build seperti biasa.

## Verifikasi

- `npx tsc --noEmit`, eslint, `npx tsx --test tests/*.test.ts` (218 tes), dan `npm run build`: lolos. Build menerapkan kedua migrasi di database lokal.
- **Database lokal:** klausul aktif Marine Hull 77 → 100 (BR 5, SRL 6, Hull umum 12) dan Liability 99 → 103. Label keempat type of cover sesuai daftar di atas.
- **Uji browser lokal** (build `next start`, sesi admin sementara):
  - **Form slip baru:** Marine Hull / Ship Repairers Legal Liability, Marine Hull / Marine Builder Risk, dan Liability / Employer's Liability menampilkan label Detail Tambahan yang baru.
  - **Master Clauses:** pencarian "BUILDERS' RISKS" menampilkan 4 judul, "LSW 17" 3 judul, dan "Full Follow" 1 judul, semuanya bertanda "Wording belum diisi".
  - Tidak ada error console.

## Catatan untuk yang melanjutkan

- **Singkatan ELWC:** contoh 27 bernomor PS-ELWC dengan type of cover "Employers Liability Insurance / Workmen Compensation", sedangkan master punya 0902 EL dan 0903 WCI terpisah. Singkatan dan nama tidak diubah di sini, karena LCH bisa menggantinya sendiri di Master Data kalau memang memakai ELWC.
- **Premi SRL:** minimum & deposit premium (USD 63.475) diisi sebagai premi flat. Adjustable rate 1,40% dan estimated turnover ditulis di Detail Tambahan. Penyesuaian premi akhir tahun dicatat lewat endorsement.
- **Wording:** contoh 28 dan 29 memuat wording lengkap untuk banyak klausul umum, tapi wording itu spesifik ke penempatannya (misalnya hukum Singapura), jadi tidak diimpor sebagai wording master.
- **Telepon kop:** contoh 27 masih mencetak telepon 2605 1671/1672 di bawah kop PT. LCH. Itu nomor Lestari Cipta Hokindo. Kop resmi dari scan Harry 21 Oktober memakai 2605 1071/1072, sama dengan sistem (lihat `nomor-telepon-kop-surat-2026-10-21.md`).
- **graphify:** aturan Wajib nomor 4 belum dijalankan karena graphify belum terpasang di mesin ini.
