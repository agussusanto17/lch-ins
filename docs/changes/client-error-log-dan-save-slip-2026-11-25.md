# Pelaporan Error Browser ke Server Log & Ketahanan Simpan Placing Slip

- **Tanggal:** 2026-11-25
- **Branch:** `fix/client-error-log-dan-save-slip`
- **PR:** #317 (https://github.com/agussusanto17/lch-ins/pull/317)
- **Dikerjakan oleh:** Zero dengan Antigravity

## Latar belakang

- Saat user membuka `/placement` di browser dan terkena React Error Boundary (`app/(app)/error.tsx`) akibat error sisi klien, `error.digest` kosong sehingga layar error tidak menampilkan kode referensi dan detail error hanya tercetak di browser console (`console.error`), tidak masuk ke `docker logs lch_web`.
- Pada pengujian simpan Placing Slip di `/placement/new`:
  - `emptySlip()` mengisi `clientId: null`, sehingga klik simpan sebelum memilih klien memunculkan pesan Zod mentah (`Invalid input: expected string, received null (clientId)`).
  - Pemanggilan Server Action di `PlacingSlipForm` belum dibungkus `try/catch` sehingga kegagalan jaringan atau *Server Action mismatch* tidak tertangani dengan baik.
  - Refresh halaman di `/placement/new` menghapus seluruh isian form yang belum tersimpan ke database.

## Yang berubah

- Menambahkan endpoint `POST /api/client-error` yang mewajibkan sesi aktif (`currentUser()`), memvalidasi serta membatasi ukuran payload error, lalu mencatat `[CLIENT_ERROR]` lengkap (timestamp, `clientRef`, `digest`, `pathname`, `href`, identitas `user`, IP, pesan error, dan stack trace) ke log server (`docker logs lch_web`).
- Memperbarui `app/(app)/error.tsx` dan `app/global-error.tsx` untuk mengirim laporan error otomatis saat error boundary terpicu serta selalu menampilkan `Kode referensi` (memakai `error.digest` atau `clientRef` deterministik jika digest kosong).
- Memperbarui validasi `clientId` pada `placingSlipSchema` agar `null`/`undefined` dinormalisasi ke string kosong dan mengembalikan pesan `"Klien wajib dipilih."`.
- Menambahkan helper `buildSavePayload`, `validateBeforeSave`, dan `runActionSafe` di `PlacingSlipForm` (`try/catch` + pelaporan error Server Action ke `/api/client-error`), serta autosave sementara di `sessionStorage` khusus `/placement/new` yang otomatis dihapus setelah slip berhasil disimpan atau di-reset.

## File utama

- `lib/client-error.ts`: skema Zod laporan error client, generator `deterministicErrorRef`/`createClientRef`, pemotong ukuran aman, formatter log server, dan helper `reportClientError`.
- `app/api/client-error/route.ts`: endpoint penerima laporan error sisi browser berautentikasi sesi.
- `app/(app)/error.tsx`: integrasi pelaporan error otomatis dengan `usePathname()` dan tampilan kode referensi.
- `app/global-error.tsx`: integrasi pelaporan error root layout.
- `app/(app)/placement/actions.ts`: normalisasi `clientId` pada `placingSlipSchema`.
- `components/underwriting/placing-slip-form.tsx`: validasi pra-simpan, `try/catch` terpusat pada Server Action, dan autosave sementara `sessionStorage` di `mode === "new"`.
- `tests/client-error.test.ts`: unit test validasi, pemangkasan payload, dan format log error client.

## Dampak

- **Database:** tidak ada.
- **Env:** tidak ada.
- **Deploy:** perlu build ulang kontainer/server agar perubahan aktif di `apps.lch.co.id`.

## Verifikasi

- `npx tsx --test tests/*.test.ts`
- `npx tsc --noEmit`
- `npx eslint` pada berkas yang berubah
- `npm run build`
- Uji E2E lokal pada `POST /api/client-error` (401 tanpa sesi, 200 & `[CLIENT_ERROR]` tercetak di log server saat login) dan validasi simpan form `/placement/new`.

## Catatan untuk yang melanjutkan

- Endpoint `/api/client-error` sengaja mewajibkan sesi aktif untuk mencegah bot publik membanjiri `docker logs lch_web`; error dari halaman publik `/login` tanpa sesi tidak dicatat ke endpoint ini.
