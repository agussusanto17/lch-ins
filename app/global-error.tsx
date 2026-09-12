"use client" // Error boundary wajib Client Component

import "./globals.css"

/**
 * Menangkap error di root layout. Menggantikan seluruh layout saat aktif,
 * jadi wajib punya `<html>` dan `<body>` sendiri.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="id">
      <body>
        <title>Terjadi kesalahan — LCH Insurance Brokers</title>
        <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6 font-sans">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold">Aplikasi gagal dimuat</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Muat ulang halaman. Bila masih gagal, hubungi tim IT.
            </p>
            {error.digest ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Kode referensi: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="mt-6 inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Coba lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
