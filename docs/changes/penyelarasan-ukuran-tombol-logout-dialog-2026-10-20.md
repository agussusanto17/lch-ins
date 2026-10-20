# Penyelarasan Ukuran dan Hover Tombol Logout pada Dialog Wajib Ganti Sandi

- **Tanggal:** 2026-10-20
- **Branch:** `fix/logout-button-size-mandatory-dialog`
- **Dikerjakan oleh:** Antigravity

## Latar belakang

Pada dialog modal "Buat kata sandi baru", tombol utama "Simpan kata sandi baru" berukuran penuh (`w-full`, `h-10`, `rounded-lg`). Sebelumnya, tombol sekunder "Logout" diletakkan dalam wrapper terpusat (`text-center`) dengan ukuran `size="sm"` (`h-8`, lebar mengecil mengikuti teks). Hal ini menyebabkan area highlight saat di-hover tampak jauh lebih kecil dan tidak serasi dengan tombol utama di atasnya.

## Yang berubah

- Menghapus wrapper `text-center` pembatas tombol "Logout".
- Menyelaraskan ukuran tombol "Logout" menjadi berukuran penuh (`w-full`), tinggi seragam (`h-10` / 40px), radius sudut seragam (`rounded-lg` / 8px), dan ukuran teks seragam (`text-sm font-medium`).
- Menggunakan ikon `LogOut` berukuran `size-4` dengan `gap-2`.
- Saat tombol di-hover, area highlight latar belakang (`hover:bg-muted`) kini memiliki dimensi dan radius yang identik dengan tombol "Simpan kata sandi baru" di atasnya.

## File utama

- `components/auth/change-password-form.tsx`: Memperbarui styling tombol Logout agar serasi dengan tombol submit.

## Dampak

- **Database:** Tidak ada perubahan skema atau data.
- **Env:** Tidak ada variabel lingkungan baru.
- **Deploy:** Tidak ada langkah deploy khusus.

## Verifikasi

- **Verifikasi Browser (`ego-browser`):**
  - Mengukur dimensi tombol "Simpan kata sandi baru": `width: 422px`, `height: 40px`, `borderRadius: 8px`, `fontSize: 14px`, `fontWeight: 500`.
  - Mengukur dimensi tombol "Logout": `width: 422px`, `height: 40px`, `borderRadius: 8px`, `fontSize: 14px`, `fontWeight: 500`.
  - `widthMatches: true`, `heightMatches: true`, `radiusMatches: true`.
  - Area hover tombol "Logout" terbukti mencakup lebar penuh (`422px x 40px`, `borderRadius: 8px`).
  - Menguji klik tombol "Logout" memicu proses sign-out dan mengarahkan kembali ke `/login`.
- **Pemeriksaan Kode:**
  - `npx tsc --noEmit` lolos tanpa error.
  - `npm run build` lolos tanpa error.
  - `graphify update .` berhasil diperbarui.
