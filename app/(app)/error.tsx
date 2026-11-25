"use client" // Error boundary wajib Client Component

import { useEffect, useId, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { deterministicErrorRef, reportClientError } from "@/lib/client-error"

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const pathname = usePathname()
  const instanceId = useId()
  const refCode = error.digest || deterministicErrorRef(error.message ?? "", `${pathname}:${instanceId}`)
  const reportedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    console.error(error)
    const key = `${refCode}:${pathname}:${error.message}`
    if (reportedKeyRef.current === key) return
    reportedKeyRef.current = key
    reportClientError(error, {
      source: "app-error",
      clientRef: refCode,
      pathname,
    })
  }, [error, pathname, refCode])

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
        <p className="tabular mt-3 text-xs text-muted-foreground">
          Kode referensi: {refCode}
        </p>
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
