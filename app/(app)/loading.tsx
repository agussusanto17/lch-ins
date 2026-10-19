import { Skeleton } from "@/components/ui/skeleton"

/** Tampil selama halaman dirender di server (penting setelah data dari database). */
export default function AppLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 md:p-6"
      aria-busy="true"
      aria-label="Memuat halaman"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-[420px] w-full rounded-xl" />
    </div>
  )
}
