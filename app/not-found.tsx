import Link from "next/link"
import { Home, Search } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="text-center">
        <p className="text-[72px] leading-none font-light text-muted-foreground/40">
          404
        </p>
        <div className="mx-auto my-5 h-px w-16 bg-border" />
        <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-balance text-muted-foreground">
          Halaman yang Anda cari tidak tersedia di aplikasi ini. Periksa kembali
          alamatnya atau kembali ke dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button render={<Link href="/" />} nativeButton={false}>
            <Home data-icon="inline-start" />
            Kembali ke Dashboard
          </Button>
          <Button
            variant="outline"
            render={<Link href="/underwriting" />}
            nativeButton={false}
          >
            <Search data-icon="inline-start" />
            Lihat Placement
          </Button>
        </div>
      </div>
    </div>
  )
}
