import { headers } from "next/headers"
import { connection } from "next/server"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { TodayProvider } from "@/components/layout/today-provider"
import { MandatoryPasswordDialog } from "@/components/auth/mandatory-password-dialog"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { todayIso } from "@/lib/date"
import { requireAccess } from "@/lib/server/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Status polis, renewal, dan jatuh tempo bergantung pada tanggal hari ini,
  // jadi halaman dirender per request, bukan dibekukan saat build.
  await connection()
  const today = todayIso()

  // Seluruh halaman di bawah grup ini wajib login, dan rolenya harus boleh
  // membuka path yang diminta. Menyaring menu di sidebar saja tidak cukup:
  // tanpa pemeriksaan di sini, URL-nya masih bisa diketik langsung.
  const pathname = (await headers()).get("x-pathname") ?? "/"
  const user = await requireAccess(pathname)

  return (
    <TodayProvider today={today}>
      <SidebarProvider>
        <AppSidebar
          roleCode={user.roleCode}
          roles={user.roles}
        />
        {/*
          Jangan pasang `overflow-hidden` di sini — itu membuat scroll container
          baru sehingga topbar `sticky top-0` menempel ke container yang tidak
          pernah scroll. Lebar ditahan lewat `overflow-x: clip` di html/body.

          `min-w-0` wajib: SidebarInset adalah flex item, dan tanpa ini lebarnya
          ikut lebar minimum tabel (sel `whitespace-nowrap`). Halaman jadi lebih
          lebar dari viewport lalu terpotong clip, sementara wrapper
          `overflow-x-auto` di tabel tidak pernah aktif.
        */}
        <SidebarInset className="min-w-0">
          <AppTopbar user={user} />
          <div className="flex-1 bg-background">{children}</div>
        </SidebarInset>
        {user.mustChangePassword ? (
          <MandatoryPasswordDialog
            userEmail={user.email}
            userName={user.name}
          />
        ) : null}
        <Toaster position="top-center" />
      </SidebarProvider>
    </TodayProvider>
  )
}
