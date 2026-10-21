# Design Specification: Modul Master Data LCH Insurance Brokers

- **Tanggal:** 2026-10-21
- **Status:** Approved
- **Target Rute:** `/master-data`
- **Terkait:** PRD, ERD, Schema Prisma (`classes_of_business`, `cover_types`, `occupations`, `tariff_*`, `insurers`, `adjusters`, `currencies`, `bank_accounts`, `wording_forms`, `lookup_values`)

---

## 1. Latar Belakang & Tujuan
Modul Master Data adalah pusat konfigurasi seluruh data referensi dan pilihan dropdown operasional di sistem LCH Insurance Brokers. Tim operasional dan administrator LCH harus dapat memperbarui, menambah, dan menonaktifkan data referensi secara mandiri tanpa memerlukan intervensi tim pengembang atau redeploy aplikasi.

### Masih Ditunggu dari LCH (Dengan Penanganan UI Terbimbing)
- Daftar resmi asuransi rekanan dan loss adjuster yang aktif dipakai.
- Daftar lengkap wording form polis baku.
- Pemetaan 10 kelompok klausul ke COB dan type of cover.
*Solusi desain:* Sediakan form CRUD lengkap yang siap digunakan, disertai banner/badge informatif bahwa data awal bersifat referensi awal dan siap disinkronkan saat daftar final LCH diterima.

---

## 2. Struktur 5 Tab Navigasi

### Tab 1: COB & Cover Type
- **Entitas:** `ClassOfBusiness` (`classes_of_business`) & `CoverType` (`cover_types`).
- **Atribut COB:** `code` (2 digit unik, e.g. "01", "03"), `name`, `rateModeId` (PerMil / Percent), `formVariantId` (property / motor / standard), `isActive`.
- **Atribut Cover Type:** `cobId`, `code` (4 digit unik, e.g. "0311"), `name`, `isActive`.
- **Relasi & Aksi:** Hierarki COB -> Cover Types. Dialog form tambah/edit COB dan Cover Type. Toggle `isActive`.

### Tab 2: Tarif OJK & Okupasi
- **Entitas:** `Occupation`, `TariffOccupation`, `TariffEqProperty`, `TariffFlood`, `BiScale`.
- **Fitur Utama:**
  - Pencarian kode & nama okupasi OJK.
  - Tampilan tarif batas bawah (`rateMin`) dan batas atas (`rateMax`) untuk kelas konstruksi K1, K2, dan K3.
  - Panel referensi tarif gempa bumi (Zona 1-5 berdasarkan kategori konstruksi).
  - Panel tarif banjir (Zona 1-4 & wilayah).
  - Skala BI (Business Interruption persentase per bulan indemnity).
  - Form dialog untuk mengedit batas tarif dan status aktif.

### Tab 3: Rekanan (Asuransi & Adjuster)
- **Entitas:** `Insurer` (`insurers`) & `Adjuster` (`adjusters`).
- **Atribut Insurer:** `name`, `contactPerson`, `email`, `phone`, `address`, `isActive`.
- **Atribut Adjuster:** `name`, `contactPerson`, `email`, `phone`, `address`, `isActive`.
- **Badge Info:** Tanda "Menunggu daftar rekanan final LCH" dengan kemampuan tambah manual dan edit langsung.

### Tab 4: Keuangan & Dokumen
- **Entitas:**
  - `Currency` (`currencies`): `code` (IDR, USD, SGD, EUR), `name`, `isActive`.
  - `BankAccount` (`bank_accounts`): `bankId`, `accountNo`, `accountName`, `currencyCode`, `isPremiumTrust` (titipan premi vs operasional), `isActive`.
  - `WordingForm` (`wording_forms`): `name`, `isActive`.
- **Aksi:** Tambah rekening bank, atur rekening titipan premi (premium trust), kelola wording form.

### Tab 5: Daftar Pilihan (Lookup Values)
- **Entitas:** `LookupValue` (`lookup_values`).
- **Kategori Dropdown (`lookupType`):** `client_status`, `client_type`, `id_type`, `policy_type`, `claim_status`, `claim_stage`, `payment_type`, `bank`, `construction_class`, `rate_mode`, `form_variant`, dll.
- **Aturan Proteksi Sistem:**
  - Baris dengan `isSystem: true` dilindungi: kodenya tidak bisa diubah dan tidak bisa dihapus fisik. Label (`name`) dan urutan (`sortOrder`) boleh disesuaikan.
  - Tambah nilai kustom baru dengan `lookupType` terkait.
  - Toggle `isActive` untuk menyembunyikan pilihan usang dari dropdown operasional.

---

## 3. Aturan Integritas Data & Soft Deactivation
1. **Tidak Ada Penghapusan Fisik pada Data Terpakai:**
   - Rekord yang sudah digunakan oleh SPPA, Placing Slip, Polis, Klien, Klaim, atau Pembayaran tidak boleh di-`DELETE` dari database.
   - Pengecekan referensi dilakukan di server layer sebelum eksekusi mutasi.
   - Tombol pada UI secara cerdas mengarahkan ke "Nonaktifkan" (`isActive = false`) agar tidak memutus relasi historis transaksi.
2. **Audit Logging Otomatis:**
   - Setiap operasi tambah, ubah, dan nonaktifkan/aktifkan mencatat log audit ke tabel `audit_logs` via `recordAudit`.

---

## 4. Kepatuhan Frontend Code Review (`/frontend-code-review`)
- **Tabel Responsif:** Seluruh tabel menggunakan kontainer `overflow-x-auto` dengan kelas canonical `min-w-200` agar kolom tidak terpotong pada layar kecil.
- **Komponen Form:** Semua input field memiliki placeholder jelas, label semantik, dan validasi Zod dengan pesan kesalahan ramah pengguna.
- **Indikator Visual:** Status aktif/nonaktif menggunakan `StatusBadge` semantik (`Active` hijau, `Inactive` abu-abu).
- **Performa:** Data diambil di Server Component App Router (`/master-data/page.tsx`), lalu dialirkan ke Client Component tab. Mutasi menggunakan `useTransition` dan `revalidatePath("/master-data")`.
- **Otorisasi:** Diproteksi oleh `requireAccess("/master-data")` (role `admin` atau `underwriter`).
