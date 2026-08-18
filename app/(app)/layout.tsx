import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/*
        Jangan pasang `overflow-hidden` di sini — itu membuat scroll container
        baru sehingga topbar `sticky top-0` menempel ke container yang tidak
        pernah scroll. Lebar ditahan lewat `overflow-x: clip` di html/body.
      */}
      <SidebarInset>
        <AppTopbar />
        <div className="flex-1 bg-background">{children}</div>
      </SidebarInset>
      <Toaster position="top-center" />
    </SidebarProvider>
  )
}
