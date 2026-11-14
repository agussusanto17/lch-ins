import { headers } from "next/headers"
import { connection } from "next/server"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppShellMarker } from "@/components/layout/app-shell-marker"
import { AppTopbar } from "@/components/layout/app-topbar"
import { PermissionProvider } from "@/components/auth/permission-provider"
import { TodayProvider } from "@/components/layout/today-provider"
import { MandatoryPasswordDialog } from "@/components/auth/mandatory-password-dialog"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { todayIso } from "@/lib/date"
import { requireAccess } from "@/lib/server/session"
import { getTopbarData } from "@/lib/server/topbar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Status polis, renewal, dan jatuh tempo bergantung pada tanggal hari ini,
  // jadi halaman dirender per request, bukan dibekukan saat build.
  await connection()
  const today = todayIso()

  // Seluruh halaman grup ini wajib login dan rolenya harus boleh membuka path yang diminta.
  // Menyaring menu sidebar saja tidak cukup karena URL bisa diketik langsung.
  const pathname = (await headers()).get("x-pathname") ?? "/"
  const user = await requireAccess(pathname)
  const topbarData = await getTopbarData(user, today)

  return (
    <TodayProvider today={today}>
      <PermissionProvider roles={user.roles}>
        <SidebarProvider>
          <AppSidebar
            roleCode={user.roleCode}
            roles={user.roles}
          />
          {/*
            Jangan pasang `overflow-hidden`: topbar `sticky top-0` jadi menempel ke container lain.
            `min-w-0` wajib supaya flex item ini tidak melebar ikut tabel `whitespace-nowrap`.
          */}
          <SidebarInset className="min-w-0">
            <AppTopbar user={user} data={topbarData} />
            <div className="flex-1 bg-background">{children}</div>
          </SidebarInset>
          {user.mustChangePassword ? (
            <MandatoryPasswordDialog
              userEmail={user.email}
              userName={user.name}
            />
          ) : null}
          <Toaster position="top-center" />
          <AppShellMarker />
        </SidebarProvider>
      </PermissionProvider>
    </TodayProvider>
  )
}
