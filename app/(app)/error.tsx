"use client" // Error boundary wajib Client Component

import { useEffect } from "react"
import Link from "next/link"
import { Home, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    // Nanti diteruskan ke layanan pelaporan error. Pesan ke pengguna tetap
    // umum supaya detail teknis tidak bocor.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60svh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-destructive">
          Terjadi kesalahan
        </p>
        <h1 className="mt-2 text-xl font-semibold">Halaman ini gagal dimuat</h1>
        <p className="mt-2 text-sm text-balance text-muted-foreground">
          Coba muat ulang. Bila masih gagal, laporkan ke tim IT beserta kode
          referensi di bawah.
        </p>
        {error.digest ? (
          <p className="tabular mt-3 text-xs text-muted-foreground">
            Kode referensi: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => unstable_retry()}>
            <RotateCcw data-icon="inline-start" />
            Coba lagi
          </Button>
          <Button
            variant="outline"
            render={<Link href="/" />}
            nativeButton={false}
          >
            <Home data-icon="inline-start" />
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
